from __future__ import annotations

import hashlib
import json
from typing import Any
from urllib import request as urlrequest
from urllib.error import HTTPError, URLError

from app.config import get_settings
from app.database import get_db, normalize_row
from app.services.analytics import dataset_insights
from app.services.usage import record_usage
from app.workers.job_utils import complete_job, insert_ai_artifact, load_dataset_context, start_job, update_job
from app.workspaces import record_job_event


def _json_hash(payload: dict[str, Any]) -> str:
    encoded = json.dumps(payload, sort_keys=True, default=str, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _dataset_ai_context(dataset_id: int) -> tuple[list[dict[str, Any]], list[str], dict[str, Any]]:
    context = load_dataset_context(dataset_id)
    stats = context["stats"]
    columns = [str(column.get("name") or "") for column in context["columns"] if column.get("name")]
    sample_rows = stats.get("sample_rows_json") or []
    if not isinstance(sample_rows, list):
        sample_rows = []
    return sample_rows[:25], columns, {
        "dataset": {
            "id": context["dataset"].get("id"),
            "fileName": context["dataset"].get("file_name"),
            "rowCount": context["dataset"].get("row_count"),
            "columnCount": context["dataset"].get("column_count"),
        },
        "stats": stats.get("stats_json") or {},
        "profile": stats.get("profile_json") or {},
        "quality": stats.get("quality_json") or {},
    }


def process_ai_summary_job(job_id: int) -> dict[str, Any]:
    job = start_job(job_id, "AI summary generation started.")
    dataset_id = job.get("dataset_id")
    if not dataset_id:
        raise RuntimeError("AI summary jobs require a dataset_id.")

    rows, columns, context = _dataset_ai_context(int(dataset_id))
    update_job(job_id, progress=35)
    record_job_event(job_id, int(job["workspace_id"]), "progress", "Prepared compact dataset context for AI summary.", {"progress": 35})
    result = dataset_insights(
        mode="strategy",
        rows=rows,
        columns=columns,
        question="Create an executive-ready dataset summary with risks, trends, and next actions.",
        context=context,
        workspace_id=int(job["workspace_id"]),
        dataset_id=int(dataset_id),
    )
    record_usage(
        workspace_id=int(job["workspace_id"]),
        user_id=job.get("created_by"),
        metric="ai.request",
        units=int(result.get("tokens_estimated") or 1),
        dataset_id=int(dataset_id),
        endpoint="worker.ai_summary_generation",
        metadata={"source": result.get("source"), "tokens_used": int(result.get("tokens_estimated") or 0)},
    )
    update_job(job_id, progress=85)
    record_job_event(job_id, int(job["workspace_id"]), "progress", "AI summary generated; saving artifact.", {"progress": 85})
    artifact_payload = {
        "answer": result["answer"],
        "source": result["source"],
        "profile": result.get("profile"),
        "context": context,
    }
    artifact = insert_ai_artifact(
        workspace_id=int(job["workspace_id"]),
        dataset_id=int(dataset_id),
        kind="summary",
        content=artifact_payload,
        model=get_settings().ai_model,
        prompt_hash=_json_hash({"job": "ai_summary_generation", "dataset_id": dataset_id, "columns": columns, "context": context}),
        created_by=job.get("created_by"),
    )
    with get_db() as conn:
        conn.execute(
            """
            UPDATE dataset_metadata
            SET summaries_json = summaries_json || %s::jsonb,
                updated_at = NOW()
            WHERE workspace_id = %s AND dataset_id = %s
            """,
            (
                json.dumps({"executive_summary": {"artifact_id": artifact.get("id"), "source": result["source"], "answer": result["answer"]}}),
                int(job["workspace_id"]),
                int(dataset_id),
            ),
        )
        conn.commit()
    return complete_job(
        job_id,
        "AI summary generation completed.",
        {"artifact_id": artifact.get("id"), "source": result["source"]},
    )


def process_insight_generation_job(job_id: int) -> dict[str, Any]:
    job = start_job(job_id, "AI insight generation started.")
    dataset_id = job.get("dataset_id")
    if not dataset_id:
        raise RuntimeError("Insight generation jobs require a dataset_id.")

    payload = job.get("payload_json") or {}
    if not isinstance(payload, dict):
        payload = {}
    rows, columns, context = _dataset_ai_context(int(dataset_id))
    insight_context = {**context, **(payload.get("context") if isinstance(payload.get("context"), dict) else {})}
    mode = str(payload.get("mode") or "strategy")
    question = str(payload.get("question") or "Generate the most important AI insights and recommended business actions.")

    update_job(job_id, progress=35)
    record_job_event(job_id, int(job["workspace_id"]), "progress", "Prepared compact dataset context for AI insights.", {"progress": 35})
    result = dataset_insights(
        mode=mode,
        rows=rows,
        columns=columns,
        question=question,
        context=insight_context,
        workspace_id=int(job["workspace_id"]),
        dataset_id=int(dataset_id),
    )
    record_usage(
        workspace_id=int(job["workspace_id"]),
        user_id=job.get("created_by"),
        metric="ai.request",
        units=int(result.get("tokens_estimated") or 1),
        dataset_id=int(dataset_id),
        endpoint="worker.insight_generation",
        metadata={"mode": mode, "source": result.get("source"), "tokens_used": int(result.get("tokens_estimated") or 0)},
    )
    update_job(job_id, progress=85)
    record_job_event(job_id, int(job["workspace_id"]), "progress", "AI insights generated; saving artifact.", {"progress": 85})
    artifact_payload = {
        "mode": mode,
        "question": question,
        "answer": result["answer"],
        "source": result["source"],
        "profile": result.get("profile"),
        "context": insight_context,
    }
    artifact = insert_ai_artifact(
        workspace_id=int(job["workspace_id"]),
        dataset_id=int(dataset_id),
        kind="insight",
        content=artifact_payload,
        model=get_settings().ai_model,
        prompt_hash=_json_hash({"job": "insight_generation", "mode": mode, "question": question, "dataset_id": dataset_id}),
        created_by=job.get("created_by"),
    )
    with get_db() as conn:
        conn.execute(
            """
            UPDATE dataset_metadata
            SET summaries_json = summaries_json || %s::jsonb,
                updated_at = NOW()
            WHERE workspace_id = %s AND dataset_id = %s
            """,
            (
                json.dumps({"latest_insight": {"artifact_id": artifact.get("id"), "mode": mode, "source": result["source"], "answer": result["answer"]}}),
                int(job["workspace_id"]),
                int(dataset_id),
            ),
        )
        conn.commit()
    return complete_job(
        job_id,
        "AI insight generation completed.",
        {"artifact_id": artifact.get("id"), "source": result["source"]},
    )


def _delete_supabase_objects(bucket: str, paths: list[str]) -> dict[str, Any]:
    settings = get_settings()
    if not paths:
        return {"attempted": 0, "deleted": 0, "configured": bool(settings.supabase_url and settings.supabase_service_role_key)}
    if not settings.supabase_url.strip() or not settings.supabase_service_role_key.strip():
        return {"attempted": len(paths), "deleted": 0, "configured": False}

    endpoint = f"{settings.supabase_url.rstrip('/')}/storage/v1/object/{bucket}"
    req = urlrequest.Request(
        endpoint,
        method="DELETE",
        data=json.dumps({"prefixes": paths}).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "apikey": settings.supabase_service_role_key,
            "Content-Type": "application/json",
        },
    )
    try:
        with urlrequest.urlopen(req, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8") or "{}")
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        return {"attempted": len(paths), "deleted": 0, "configured": True, "error": str(exc)}

    deleted = len(payload) if isinstance(payload, list) else len(paths)
    return {"attempted": len(paths), "deleted": deleted, "configured": True}


def process_cleanup_uploads_job(job_id: int | None = None, older_than_hours: int = 24, limit: int = 250) -> dict[str, Any]:
    job: dict[str, Any] | None = None
    if job_id is not None:
        job = start_job(job_id, "Upload cleanup started.")

    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT id, workspace_id, storage_bucket, storage_path
            FROM datasets
            WHERE status = 'upload_requested'
              AND deleted_at IS NULL
              AND created_at < NOW() - (%s * INTERVAL '1 hour')
            ORDER BY created_at ASC
            LIMIT %s
            """,
            (older_than_hours, limit),
        ).fetchall()
        stale_uploads = normalize_row(rows)

    by_bucket: dict[str, list[str]] = {}
    for upload in stale_uploads:
        bucket = str(upload.get("storage_bucket") or get_settings().supabase_storage_bucket)
        path = str(upload.get("storage_path") or "")
        if path:
            by_bucket.setdefault(bucket, []).append(path)

    deletion_results = {bucket: _delete_supabase_objects(bucket, paths) for bucket, paths in by_bucket.items()}
    dataset_ids = [int(upload["id"]) for upload in stale_uploads]
    if dataset_ids:
        with get_db() as conn:
            conn.execute(
                """
                UPDATE datasets
                SET status = 'expired',
                    deleted_at = COALESCE(deleted_at, NOW()),
                    metadata_json = metadata_json || '{"cleanup_reason":"upload_not_completed"}'::jsonb,
                    updated_at = NOW()
                WHERE id = ANY(%s)
                """,
                (dataset_ids,),
            )
            conn.commit()

    result = {
        "expired_uploads": len(dataset_ids),
        "older_than_hours": older_than_hours,
        "storage": deletion_results,
    }
    if job_id is not None:
        return complete_job(job_id, "Upload cleanup completed.", result)
    return result


def process_cleanup_expired_cache_job(job_id: int | None = None, limit: int | None = None) -> dict[str, Any]:
    if job_id is not None:
        start_job(job_id, "Expired AI cache cleanup started.")

    cleanup_limit = int(limit or get_settings().expired_cache_cleanup_limit)
    with get_db() as conn:
        rows = conn.execute(
            """
            DELETE FROM ai_response_cache
            WHERE id IN (
                SELECT id
                FROM ai_response_cache
                WHERE expires_at IS NOT NULL
                  AND expires_at < NOW()
                ORDER BY expires_at ASC
                LIMIT %s
            )
            RETURNING id
            """,
            (cleanup_limit,),
        ).fetchall()
        conn.commit()

    result = {"expired_cache_deleted": len(rows), "limit": cleanup_limit}
    if job_id is not None:
        return complete_job(job_id, "Expired AI cache cleanup completed.", result)
    return result


def process_recover_interrupted_jobs(job_id: int | None = None, older_than_minutes: int | None = None, limit: int = 100) -> dict[str, Any]:
    if job_id is not None:
        start_job(job_id, "Interrupted job recovery started.")

    threshold_minutes = int(older_than_minutes or get_settings().abandoned_job_minutes)
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT *
            FROM processing_jobs
            WHERE status IN ('queued', 'processing')
              AND updated_at < NOW() - (%s * INTERVAL '1 minute')
            ORDER BY updated_at ASC
            LIMIT %s
            """,
            (threshold_minutes, limit),
        ).fetchall()
        abandoned_jobs = normalize_row(rows)

    retried = 0
    failed = 0
    for abandoned in abandoned_jobs:
        current_attempts = int(abandoned.get("attempts") or 0)
        max_attempts = int(abandoned.get("max_attempts") or 3)
        job_id_to_recover = int(abandoned["id"])
        workspace_id = int(abandoned["workspace_id"])
        if current_attempts >= max_attempts:
            with get_db() as conn:
                conn.execute(
                    """
                    UPDATE processing_jobs
                    SET status = 'failed',
                        error = 'Job was interrupted and exceeded recovery attempts.',
                        updated_at = NOW(),
                        finished_at = NOW()
                    WHERE id = %s
                    """,
                    (job_id_to_recover,),
                )
                conn.commit()
            record_job_event(
                job_id_to_recover,
                workspace_id,
                "failed",
                "Interrupted job exceeded recovery attempts.",
                {"attempts": current_attempts, "max_attempts": max_attempts},
            )
            failed += 1
            continue

        with get_db() as conn:
            job = conn.execute(
                """
                UPDATE processing_jobs
                SET status = 'queued',
                    progress = LEAST(progress, 25),
                    error = '',
                    started_at = NULL,
                    updated_at = NOW()
                WHERE id = %s
                RETURNING *
                """,
                (job_id_to_recover,),
            ).fetchone()
            conn.commit()
        normalized = dict(job or abandoned)
        try:
            from app.queueing import enqueue_processing_job

            enqueued = enqueue_processing_job(normalized)
        except Exception:
            enqueued = False
        record_job_event(
            job_id_to_recover,
            workspace_id,
            "queued",
            "Interrupted job recovered and requeued.",
            {"attempts": current_attempts + 1, "max_attempts": max_attempts, "celery_enqueued": enqueued},
        )
        retried += 1

    result = {
        "abandoned_found": len(abandoned_jobs),
        "requeued": retried,
        "failed": failed,
        "older_than_minutes": threshold_minutes,
    }
    if job_id is not None:
        return complete_job(job_id, "Interrupted job recovery completed.", result)
    return result
