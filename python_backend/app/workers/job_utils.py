from __future__ import annotations

from typing import Any

from psycopg.types.json import Json

from app.database import get_db, normalize_record, normalize_row, now_utc
from app.workspaces import record_job_event


def update_job(job_id: int, **fields: Any) -> dict[str, Any]:
    if not fields:
        return {}
    assignments = ", ".join(f"{key} = %s" for key in fields)
    values = list(fields.values())
    with get_db() as conn:
        row = conn.execute(
            f"""
            UPDATE processing_jobs
            SET {assignments}, updated_at = NOW()
            WHERE id = %s
            RETURNING *
            """,
            (*values, job_id),
        ).fetchone()
        conn.commit()
    return normalize_record(row) or {}


def update_dataset(dataset_id: int, **fields: Any) -> dict[str, Any]:
    if not fields:
        return {}
    assignments = ", ".join(f"{key} = %s" for key in fields)
    values = list(fields.values())
    with get_db() as conn:
        row = conn.execute(
            f"""
            UPDATE datasets
            SET {assignments}, updated_at = NOW()
            WHERE id = %s
            RETURNING *
            """,
            (*values, dataset_id),
        ).fetchone()
        conn.commit()
    return normalize_record(row) or {}


def load_job(job_id: int) -> dict[str, Any]:
    with get_db() as conn:
        row = conn.execute(
            """
            SELECT j.*, d.storage_bucket, d.storage_path, d.file_name
            FROM processing_jobs j
            LEFT JOIN datasets d ON d.id = j.dataset_id AND d.deleted_at IS NULL
            WHERE j.id = %s
            """,
            (job_id,),
        ).fetchone()
    if not row:
        raise RuntimeError(f"Processing job {job_id} was not found.")
    return normalize_record(row) or {}


def load_dataset_context(dataset_id: int) -> dict[str, Any]:
    with get_db() as conn:
        dataset = conn.execute("SELECT * FROM datasets WHERE id = %s AND deleted_at IS NULL", (dataset_id,)).fetchone()
        stats = conn.execute("SELECT * FROM dataset_stats WHERE dataset_id = %s", (dataset_id,)).fetchone()
        metadata = conn.execute("SELECT * FROM dataset_metadata WHERE dataset_id = %s", (dataset_id,)).fetchone()
        columns = conn.execute(
            "SELECT * FROM dataset_columns WHERE dataset_id = %s ORDER BY position ASC",
            (dataset_id,),
        ).fetchall()
    if not dataset:
        raise RuntimeError(f"Dataset {dataset_id} was not found.")
    return {
        "dataset": normalize_record(dataset) or {},
        "stats": normalize_record(stats) or {},
        "metadata": normalize_record(metadata) or {},
        "columns": normalize_row(columns),
    }


def insert_ai_artifact(
    workspace_id: int,
    dataset_id: int | None,
    kind: str,
    content: dict[str, Any],
    model: str = "",
    prompt_hash: str = "",
    created_by: int | None = None,
) -> dict[str, Any]:
    with get_db() as conn:
        row = conn.execute(
            """
            INSERT INTO ai_artifacts (workspace_id, dataset_id, kind, prompt_hash, model, content_json, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (workspace_id, dataset_id, kind, prompt_hash, model, Json(content), created_by),
        ).fetchone()
        conn.commit()
    return normalize_record(row) or {}


def start_job(job_id: int, message: str) -> dict[str, Any]:
    job = load_job(job_id)
    updated = update_job(
        job_id,
        status="processing",
        progress=max(5, int(job.get("progress") or 0)),
        attempts=int(job.get("attempts") or 0) + 1,
        started_at=now_utc(),
        finished_at=None,
        error="",
    )
    record_job_event(job_id, int(updated["workspace_id"]), "processing", message)
    return updated


def complete_job(job_id: int, message: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    updated = update_job(job_id, status="completed", progress=100, error="", finished_at=now_utc())
    record_job_event(job_id, int(updated["workspace_id"]), "completed", message, payload or {})
    return updated


def fail_job(job_id: int, error: str, message: str = "Processing job failed.") -> dict[str, Any]:
    updated = update_job(job_id, status="failed", error=error, finished_at=now_utc())
    if updated:
        record_job_event(job_id, int(updated["workspace_id"]), "failed", message, {"error": error})
    return updated
