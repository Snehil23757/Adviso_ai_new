from __future__ import annotations

import json
import re
import uuid
from typing import Any
from urllib import request as urlrequest
from urllib.error import HTTPError, URLError
from urllib.parse import quote

from fastapi import HTTPException
from psycopg.types.json import Json

from app.config import get_settings
from app.database import get_db, normalize_record, normalize_row
from app.queueing import enqueue_processing_job, persist_job_progress, publish_job_event, redis_configured
from app.services.email_service import queue_welcome_email_for_user
from app.services.limits import enforce_upload_quota
from app.services.usage import record_usage
from app.tenant import store_audit_event


WORKSPACE_ROLES = {"owner", "admin", "analyst", "viewer", "member"}
CSV_CONTENT_TYPES = {
    "text/csv",
    "application/csv",
    "text/x-csv",
    "application/vnd.ms-excel",
}


def normalized_content_type(value: str) -> str:
    return (value or "").split(";", 1)[0].strip().lower()


def validate_csv_upload_request(file_name: str, content_type: str, size_bytes: int) -> str:
    clean_name = (file_name or "").strip()
    if not clean_name.lower().endswith(".csv"):
        raise HTTPException(status_code=415, detail="Only .csv files are allowed.")

    settings = get_settings()
    if size_bytes <= 0:
        raise HTTPException(status_code=400, detail="CSV upload size must be greater than zero.")
    if size_bytes > settings.max_upload_size_bytes:
        raise HTTPException(status_code=413, detail=f"CSV uploads are limited to {settings.max_upload_size_bytes} bytes.")

    normalized = normalized_content_type(content_type or "text/csv")
    if normalized not in CSV_CONTENT_TYPES:
        raise HTTPException(status_code=415, detail="Only CSV content types are allowed.")
    return normalized


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.strip().lower()).strip("-")
    return slug or "workspace"


def safe_file_name(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9._ -]+", "_", value).strip()
    return cleaned[:180] or "dataset.csv"


def ensure_default_workspace(user: dict[str, Any]) -> dict[str, Any]:
    with get_db() as conn:
        existing = conn.execute(
            """
            SELECT w.*, wm.role AS member_role
            FROM workspaces w
            JOIN workspace_members wm ON wm.workspace_id = w.id
            WHERE wm.user_id = %s AND wm.status = 'active'
              AND w.deleted_at IS NULL
            ORDER BY w.created_at ASC
            LIMIT 1
            """,
            (user["id"],),
        ).fetchone()
        if existing:
            return normalize_record(existing) or {}

        name = "Personal Workspace"
        workspace = conn.execute(
            """
            INSERT INTO workspaces (owner_user_id, name, slug, plan_id)
            VALUES (%s, %s, %s, %s)
            RETURNING *
            """,
            (user["id"], name, slugify(name), user.get("plan_id") or "free"),
        ).fetchone()
        conn.execute(
            """
            INSERT INTO workspace_members (workspace_id, user_id, role, status)
            VALUES (%s, %s, 'owner', 'active')
            ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = 'owner', status = 'active'
            """,
            (workspace["id"], user["id"]),
        )
        conn.commit()
    workspace["member_role"] = "owner"
    store_audit_event(
        int(workspace["id"]),
        int(user["id"]),
        "workspace.created",
        "workspace",
        str(workspace["id"]),
        {"name": name},
        event_type="workspace",
    )
    queue_welcome_email_for_user(user, int(workspace["id"]))
    return normalize_record(workspace) or {}


def list_workspaces_for_user(user: dict[str, Any]) -> list[dict[str, Any]]:
    ensure_default_workspace(user)
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT w.*, wm.role AS member_role,
                   (
                       SELECT COUNT(*) FROM datasets d WHERE d.workspace_id = w.id AND d.deleted_at IS NULL
                   ) AS dataset_count
            FROM workspaces w
            JOIN workspace_members wm ON wm.workspace_id = w.id
            WHERE wm.user_id = %s AND wm.status = 'active'
              AND w.deleted_at IS NULL
            ORDER BY w.created_at ASC
            """,
            (user["id"],),
        ).fetchall()
    return normalize_row(rows)


def create_workspace_for_user(user: dict[str, Any], name: str) -> dict[str, Any]:
    clean_name = name.strip() or "New Workspace"
    with get_db() as conn:
        workspace = conn.execute(
            """
            INSERT INTO workspaces (owner_user_id, name, slug, plan_id)
            VALUES (%s, %s, %s, %s)
            RETURNING *
            """,
            (user["id"], clean_name, slugify(clean_name), user.get("plan_id") or "free"),
        ).fetchone()
        conn.execute(
            """
            INSERT INTO workspace_members (workspace_id, user_id, role, status)
            VALUES (%s, %s, 'owner', 'active')
            """,
            (workspace["id"], user["id"]),
        )
        conn.commit()
    workspace["member_role"] = "owner"
    store_audit_event(
        int(workspace["id"]),
        int(user["id"]),
        "workspace.created",
        "workspace",
        str(workspace["id"]),
        {"name": clean_name},
        event_type="workspace",
    )
    return normalize_record(workspace) or {}


def require_workspace_access(user: dict[str, Any], workspace_id: int, allowed_roles: set[str] | None = None) -> dict[str, Any]:
    with get_db() as conn:
        workspace = conn.execute(
            """
            SELECT w.*, wm.role AS member_role
            FROM workspaces w
            JOIN workspace_members wm ON wm.workspace_id = w.id
            WHERE w.id = %s AND wm.user_id = %s AND wm.status = 'active'
              AND w.deleted_at IS NULL
            LIMIT 1
            """,
            (workspace_id, user["id"]),
        ).fetchone()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found.")
    role = workspace.get("member_role") or "member"
    if allowed_roles and role not in allowed_roles:
        raise HTTPException(status_code=403, detail="You do not have access to perform this workspace action.")
    return normalize_record(workspace) or {}


def storage_path_for_upload(workspace_id: int, user_id: int, file_name: str) -> str:
    return f"workspaces/{workspace_id}/uploads/{user_id}/{uuid.uuid4().hex}_{safe_file_name(file_name)}"


def create_signed_upload_payload(storage_path: str) -> dict[str, Any]:
    settings = get_settings()
    bucket = settings.supabase_storage_bucket.strip() or "datasets"
    if not settings.supabase_url.strip() or not settings.supabase_service_role_key.strip():
        return {
            "mode": "record_only",
            "bucket": bucket,
            "path": storage_path,
            "signed_url": "",
            "token": "",
            "configured": False,
            "message": "Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable direct browser uploads.",
        }

    base_url = settings.supabase_url.rstrip("/")
    endpoint = f"{base_url}/storage/v1/object/upload/sign/{bucket}/{quote(storage_path, safe='')}"
    req = urlrequest.Request(
        endpoint,
        method="POST",
        data=b"{}",
        headers={
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "apikey": settings.supabase_service_role_key,
            "Content-Type": "application/json",
        },
    )
    try:
        with urlrequest.urlopen(req, timeout=20) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=502, detail="Supabase signed upload URL could not be created.") from exc

    signed_url = payload.get("url") or payload.get("signedURL") or ""
    if signed_url.startswith("/"):
        signed_url = f"{base_url}{signed_url}"
    return {
        "mode": "supabase_signed_upload",
        "bucket": bucket,
        "path": storage_path,
        "signed_url": signed_url,
        "token": payload.get("token") or "",
        "configured": True,
        "expires_in_seconds": payload.get("expiresIn"),
    }


def init_dataset_upload(user: dict[str, Any], workspace_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    require_workspace_access(user, workspace_id, {"owner", "admin", "analyst", "member"})
    size_bytes = int(payload["size_bytes"])
    content_type = validate_csv_upload_request(
        str(payload["file_name"]),
        str(payload.get("content_type") or "text/csv"),
        size_bytes,
    )
    enforce_upload_quota(user, workspace_id, size_bytes)

    storage_path = storage_path_for_upload(workspace_id, int(user["id"]), payload["file_name"])
    upload = create_signed_upload_payload(storage_path)
    with get_db() as conn:
        dataset = conn.execute(
            """
            INSERT INTO datasets (
                workspace_id, uploaded_by, storage_bucket, storage_path, file_name,
                content_type, size_bytes, checksum_sha256, status, metadata_json
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'upload_requested', %s)
            RETURNING *
            """,
            (
                workspace_id,
                user["id"],
                upload["bucket"],
                storage_path,
                payload["file_name"],
                content_type,
                size_bytes,
                payload.get("checksum_sha256") or "",
                Json({"upload_mode": upload["mode"]}),
            ),
        ).fetchone()
        conn.commit()
    record_usage(
        workspace_id=workspace_id,
        user_id=int(user["id"]),
        metric="upload.requested",
        units=size_bytes,
        dataset_id=int(dataset["id"]),
        endpoint="/api/workspaces/{workspace_id}/uploads/init",
        metadata={"file_name": payload["file_name"], "content_type": content_type},
    )
    store_audit_event(
        workspace_id,
        int(user["id"]),
        "upload.requested",
        "dataset",
        str(dataset["id"]),
        {"file_name": payload["file_name"], "size_bytes": size_bytes, "mode": upload["mode"]},
        event_type="uploads",
    )
    return {"dataset": normalize_record(dataset) or {}, "upload": upload}


def list_datasets_for_workspace(user: dict[str, Any], workspace_id: int) -> list[dict[str, Any]]:
    require_workspace_access(user, workspace_id)
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT d.*, u.email AS uploaded_by_email
            FROM datasets d
            LEFT JOIN users u ON u.id = d.uploaded_by
            WHERE d.workspace_id = %s AND d.deleted_at IS NULL
            ORDER BY d.created_at DESC
            LIMIT 100
            """,
            (workspace_id,),
        ).fetchall()
    return normalize_row(rows)


def get_dataset_for_workspace(user: dict[str, Any], workspace_id: int, dataset_id: int) -> dict[str, Any]:
    require_workspace_access(user, workspace_id)
    with get_db() as conn:
        dataset = conn.execute(
            "SELECT * FROM datasets WHERE workspace_id = %s AND id = %s AND deleted_at IS NULL",
            (workspace_id, dataset_id),
        ).fetchone()
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found.")
        columns = conn.execute(
            "SELECT * FROM dataset_columns WHERE dataset_id = %s ORDER BY position ASC",
            (dataset_id,),
        ).fetchall()
        stats = conn.execute(
            "SELECT * FROM dataset_stats WHERE dataset_id = %s",
            (dataset_id,),
        ).fetchone()
    return {
        "dataset": normalize_record(dataset) or {},
        "columns": normalize_row(columns),
        "stats": normalize_record(stats) or {},
    }


def soft_delete_dataset_for_workspace(user: dict[str, Any], workspace_id: int, dataset_id: int) -> dict[str, Any]:
    require_workspace_access(user, workspace_id, {"owner", "admin", "analyst"})
    with get_db() as conn:
        dataset = conn.execute(
            """
            UPDATE datasets
            SET deleted_at = COALESCE(deleted_at, NOW()),
                status = 'deleted',
                updated_at = NOW()
            WHERE workspace_id = %s AND id = %s AND deleted_at IS NULL
            RETURNING *
            """,
            (workspace_id, dataset_id),
        ).fetchone()
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found.")
        conn.commit()
    store_audit_event(
        workspace_id,
        int(user["id"]),
        "dataset.deleted",
        "dataset",
        str(dataset_id),
        {"soft_delete": True, "file_name": dataset["file_name"]},
        event_type="workspace",
    )
    return normalize_record(dataset) or {}


def soft_delete_workspace_for_user(user: dict[str, Any], workspace_id: int) -> dict[str, Any]:
    require_workspace_access(user, workspace_id, {"owner", "admin"})
    with get_db() as conn:
        workspace = conn.execute(
            """
            UPDATE workspaces
            SET deleted_at = COALESCE(deleted_at, NOW()),
                updated_at = NOW()
            WHERE id = %s AND deleted_at IS NULL
            RETURNING *
            """,
            (workspace_id,),
        ).fetchone()
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found.")
        conn.execute(
            """
            UPDATE ai_chats
            SET deleted_at = COALESCE(deleted_at, NOW()),
                status = 'deleted',
                updated_at = NOW()
            WHERE workspace_id = %s AND deleted_at IS NULL
            """,
            (workspace_id,),
        )
        conn.execute(
            """
            UPDATE datasets
            SET deleted_at = COALESCE(deleted_at, NOW()),
                status = 'deleted',
                updated_at = NOW()
            WHERE workspace_id = %s AND deleted_at IS NULL
            """,
            (workspace_id,),
        )
        conn.commit()
    store_audit_event(
        workspace_id,
        int(user["id"]),
        "workspace.deleted",
        "workspace",
        str(workspace_id),
        {"soft_delete": True},
        event_type="workspace",
    )
    return normalize_record(workspace) or {}


def record_job_event(job_id: int, workspace_id: int, event_type: str, message: str = "", payload: dict[str, Any] | None = None) -> dict[str, Any]:
    payload = payload or {}
    with get_db() as conn:
        job = conn.execute(
            "SELECT id, workspace_id, dataset_id, type, status, progress, error FROM processing_jobs WHERE id = %s",
            (job_id,),
        ).fetchone()
        normalized_job = normalize_record(job) or {}
        if normalized_job:
            payload = {
                **payload,
                "status": normalized_job.get("status") or event_type,
                "progress": int(normalized_job.get("progress") or 0),
            }
        event = conn.execute(
            """
            INSERT INTO job_events (job_id, workspace_id, event_type, message, payload_json)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING *
            """,
            (job_id, workspace_id, event_type, message, Json(payload)),
        ).fetchone()
        conn.commit()
    normalized = normalize_record(event) or {}
    if normalized_job:
        persist_job_progress(workspace_id, normalized_job, normalized)
    publish_job_event(workspace_id, normalized)
    return normalized


def create_processing_job(
    user: dict[str, Any],
    workspace_id: int,
    dataset_id: int | None,
    job_type: str,
    payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    with get_db() as conn:
        job = conn.execute(
            """
            INSERT INTO processing_jobs (workspace_id, dataset_id, type, status, payload_json, created_by)
            VALUES (%s, %s, %s, 'queued', %s, %s)
            RETURNING *
            """,
            (workspace_id, dataset_id, job_type, Json(payload or {}), user["id"]),
        ).fetchone()
        conn.commit()
    normalized = normalize_record(job) or {}
    persist_job_progress(workspace_id, normalized)
    queued = enqueue_processing_job(normalized)
    record_job_event(
        int(normalized["id"]),
        workspace_id,
        "queued",
        "Processing job queued.",
        {"celery_enqueued": queued, "redis_configured": redis_configured()},
    )
    store_audit_event(
        workspace_id,
        int(user["id"]),
        "job.queued",
        "processing_job",
        str(normalized["id"]),
        {"job_type": job_type, "dataset_id": dataset_id, "celery_enqueued": queued},
        event_type="jobs",
    )
    return normalized


def complete_dataset_upload(user: dict[str, Any], workspace_id: int, dataset_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    require_workspace_access(user, workspace_id, {"owner", "admin", "analyst", "member"})
    with get_db() as conn:
        existing = conn.execute(
            """
            SELECT *
            FROM datasets
            WHERE workspace_id = %s AND id = %s AND deleted_at IS NULL
            LIMIT 1
            """,
            (workspace_id, dataset_id),
        ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Dataset not found.")

        expected_path = str(existing["storage_path"] or "")
        supplied_path = str(payload.get("storage_path") or expected_path)
        if supplied_path != expected_path:
            raise HTTPException(status_code=400, detail="Upload completion path does not match the issued signed upload path.")

        completed_size = int(payload.get("size_bytes") or existing["size_bytes"] or 0)
        if completed_size != int(existing["size_bytes"] or 0):
            raise HTTPException(status_code=400, detail="Upload completion size does not match the original CSV upload request.")

        validate_csv_upload_request(
            str(existing["file_name"]),
            str(existing["content_type"] or "text/csv"),
            completed_size,
        )

        dataset = conn.execute(
            """
            UPDATE datasets
            SET status = 'queued',
                checksum_sha256 = COALESCE(NULLIF(%s, ''), checksum_sha256),
                updated_at = NOW()
            WHERE workspace_id = %s AND id = %s
              AND deleted_at IS NULL
            RETURNING *
            """,
            (
                payload.get("checksum_sha256") or "",
                workspace_id,
                dataset_id,
            ),
        ).fetchone()
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found.")
        conn.commit()

    record_usage(
        workspace_id=workspace_id,
        user_id=int(user["id"]),
        metric="upload.count",
        units=int(dataset["size_bytes"] or 1),
        dataset_id=dataset_id,
        endpoint="/api/workspaces/{workspace_id}/uploads/{dataset_id}/complete",
        metadata={"file_name": dataset["file_name"], "status": "queued"},
    )
    store_audit_event(
        workspace_id,
        int(user["id"]),
        "upload.completed",
        "dataset",
        str(dataset_id),
        {"file_name": dataset["file_name"], "size_bytes": dataset["size_bytes"]},
        event_type="uploads",
    )

    job = create_processing_job(
        user,
        workspace_id,
        dataset_id,
        "csv_metadata_extraction",
        {
            "storage_bucket": dataset["storage_bucket"],
            "storage_path": dataset["storage_path"],
            "file_name": dataset["file_name"],
            "size_bytes": dataset["size_bytes"],
        },
    )
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO workspace_sessions (workspace_id, user_id, active_dataset_id, active_page)
            VALUES (%s, %s, %s, 'Overview')
            ON CONFLICT (workspace_id, user_id) DO UPDATE SET
                active_dataset_id = EXCLUDED.active_dataset_id,
                updated_at = NOW(),
                last_seen_at = NOW()
            """,
            (workspace_id, user["id"], dataset_id),
        )
        conn.commit()
    return {"dataset": normalize_record(dataset) or {}, "job": job}


def get_job_for_workspace(user: dict[str, Any], workspace_id: int, job_id: int) -> dict[str, Any]:
    require_workspace_access(user, workspace_id)
    with get_db() as conn:
        job = conn.execute(
            "SELECT * FROM processing_jobs WHERE workspace_id = %s AND id = %s",
            (workspace_id, job_id),
        ).fetchone()
        if not job:
            raise HTTPException(status_code=404, detail="Processing job not found.")
        events = conn.execute(
            "SELECT * FROM job_events WHERE job_id = %s ORDER BY created_at ASC LIMIT 200",
            (job_id,),
        ).fetchall()
    return {"job": normalize_record(job) or {}, "events": normalize_row(events)}
