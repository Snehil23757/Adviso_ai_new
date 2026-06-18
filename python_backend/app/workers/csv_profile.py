from __future__ import annotations

import csv
import io
from typing import Any
from urllib import request as urlrequest
from urllib.parse import quote

from psycopg.types.json import Json

from app.config import get_settings
from app.database import get_db, normalize_record, now_utc
from app.workspaces import CSV_CONTENT_TYPES, normalized_content_type, record_job_event, validate_csv_upload_request


SAMPLE_ROW_LIMIT = 25
SAMPLE_VALUE_LIMIT = 20
UNIQUE_TRACK_LIMIT = 1000
PROGRESS_EVERY_ROWS = 25_000


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
            SELECT j.*, d.storage_bucket, d.storage_path, d.file_name, d.content_type, d.size_bytes
            FROM processing_jobs j
            LEFT JOIN datasets d ON d.id = j.dataset_id
            WHERE j.id = %s
            """,
            (job_id,),
        ).fetchone()
    if not row:
        raise RuntimeError(f"Processing job {job_id} was not found.")
    return normalize_record(row) or {}


def supabase_object_stream(bucket: str, storage_path: str):
    settings = get_settings()
    if not settings.supabase_url.strip() or not settings.supabase_service_role_key.strip():
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for worker downloads.")

    endpoint = f"{settings.supabase_url.rstrip('/')}/storage/v1/object/{bucket}/{quote(storage_path, safe='/')}"
    req = urlrequest.Request(
        endpoint,
        method="GET",
        headers={
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "apikey": settings.supabase_service_role_key,
        },
    )
    return urlrequest.urlopen(req, timeout=120)


def validate_csv_object_response(response, job: dict[str, Any]) -> None:
    file_name = str(job.get("file_name") or "")
    content_type = str(job.get("content_type") or "text/csv")
    size_bytes = int(job.get("size_bytes") or 0)

    try:
        validate_csv_upload_request(file_name, content_type, size_bytes)
    except Exception as exc:
        raise RuntimeError("Stored upload metadata failed CSV validation.") from exc

    response_content_type = normalized_content_type(response.headers.get("Content-Type") or content_type)
    if response_content_type not in CSV_CONTENT_TYPES:
        raise RuntimeError("Stored object content type is not CSV. Upload rejected before processing.")

    content_length = response.headers.get("Content-Length")
    if content_length:
        try:
            response_size = int(content_length)
        except ValueError as exc:
            raise RuntimeError("Stored object size could not be verified.") from exc
        settings = get_settings()
        if response_size > settings.max_upload_size_bytes:
            raise RuntimeError("Stored object exceeds the CSV upload size limit.")
        if size_bytes and response_size != size_bytes:
            raise RuntimeError("Stored object size does not match the original upload request.")


def empty_column_state(position: int) -> dict[str, Any]:
    return {
        "position": position,
        "null_count": 0,
        "non_null_count": 0,
        "numeric_count": 0,
        "numeric_min": None,
        "numeric_max": None,
        "numeric_sum": 0.0,
        "samples": [],
        "uniques": set(),
        "unique_overflow": False,
    }


def parse_number(value: str) -> float | None:
    cleaned = value.strip().replace(",", "").replace("%", "")
    if not cleaned:
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def profile_csv_response(response, job: dict[str, Any]) -> dict[str, Any]:
    wrapper = io.TextIOWrapper(response, encoding="utf-8", errors="replace", newline="")
    reader = csv.reader(wrapper)
    header = next(reader, None)
    if not header:
        return {"row_count": 0, "columns": [], "sample_rows": [], "quality": {"empty": True}}
    if len(header) == 1 and header[0].lstrip().startswith(("{", "[")):
        raise RuntimeError("Uploaded object does not look like CSV data.")

    columns = [name.strip() or f"column_{index + 1}" for index, name in enumerate(header)]
    states = [empty_column_state(index) for index in range(len(columns))]
    sample_rows: list[dict[str, str]] = []
    row_count = 0

    for row in reader:
        row_count += 1
        if len(sample_rows) < SAMPLE_ROW_LIMIT:
            sample_rows.append({columns[index]: row[index] if index < len(row) else "" for index in range(len(columns))})

        for index, column in enumerate(columns):
            value = row[index].strip() if index < len(row) and row[index] is not None else ""
            state = states[index]
            if not value:
                state["null_count"] += 1
                continue

            state["non_null_count"] += 1
            if len(state["samples"]) < SAMPLE_VALUE_LIMIT:
                state["samples"].append(value)
            if not state["unique_overflow"]:
                state["uniques"].add(value)
                if len(state["uniques"]) > UNIQUE_TRACK_LIMIT:
                    state["unique_overflow"] = True
                    state["uniques"].clear()

            number = parse_number(value)
            if number is not None:
                state["numeric_count"] += 1
                state["numeric_sum"] += number
                state["numeric_min"] = number if state["numeric_min"] is None else min(state["numeric_min"], number)
                state["numeric_max"] = number if state["numeric_max"] is None else max(state["numeric_max"], number)

        if row_count % PROGRESS_EVERY_ROWS == 0:
            progress = min(90, 10 + row_count // PROGRESS_EVERY_ROWS)
            update_job(int(job["id"]), progress=progress)
            record_job_event(int(job["id"]), int(job["workspace_id"]), "progress", f"Profiled {row_count:,} rows.", {"row_count": row_count})

    column_profiles = []
    for name, state in zip(columns, states):
        numeric_ratio = state["numeric_count"] / state["non_null_count"] if state["non_null_count"] else 0
        data_type = "number" if numeric_ratio >= 0.75 else "text"
        numeric_mean = state["numeric_sum"] / state["numeric_count"] if state["numeric_count"] else None
        column_profiles.append(
            {
                "name": name,
                "data_type": data_type,
                "position": state["position"],
                "null_count": state["null_count"],
                "unique_count": None if state["unique_overflow"] else len(state["uniques"]),
                "sample_values": state["samples"],
                "stats": {
                    "numeric_count": state["numeric_count"],
                    "numeric_min": state["numeric_min"],
                    "numeric_max": state["numeric_max"],
                    "numeric_mean": numeric_mean,
                },
            }
        )

    return {
        "row_count": row_count,
        "column_count": len(columns),
        "columns": column_profiles,
        "sample_rows": sample_rows,
        "quality": {
            "empty": row_count == 0,
            "profiled_rows": row_count,
            "profile_strategy": "streaming_csv",
        },
    }


def save_profile(job: dict[str, Any], profile: dict[str, Any]) -> None:
    dataset_id = int(job["dataset_id"])
    with get_db() as conn:
        conn.execute("DELETE FROM dataset_columns WHERE dataset_id = %s", (dataset_id,))
        for column in profile["columns"]:
            conn.execute(
                """
                INSERT INTO dataset_columns (
                    dataset_id, name, data_type, position, null_count,
                    unique_count, sample_values_json, stats_json
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (dataset_id, name) DO UPDATE SET
                    data_type = EXCLUDED.data_type,
                    position = EXCLUDED.position,
                    null_count = EXCLUDED.null_count,
                    unique_count = EXCLUDED.unique_count,
                    sample_values_json = EXCLUDED.sample_values_json,
                    stats_json = EXCLUDED.stats_json
                """,
                (
                    dataset_id,
                    column["name"],
                    column["data_type"],
                    column["position"],
                    column["null_count"],
                    column["unique_count"],
                    Json(column["sample_values"]),
                    Json(column["stats"]),
                ),
            )
        conn.execute(
            """
            INSERT INTO dataset_stats (dataset_id, stats_json, profile_json, quality_json, sample_rows_json, updated_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
            ON CONFLICT (dataset_id) DO UPDATE SET
                stats_json = EXCLUDED.stats_json,
                profile_json = EXCLUDED.profile_json,
                quality_json = EXCLUDED.quality_json,
                sample_rows_json = EXCLUDED.sample_rows_json,
                updated_at = NOW()
            """,
            (
                dataset_id,
                Json({"row_count": profile["row_count"], "column_count": profile["column_count"]}),
                Json({"columns": profile["columns"]}),
                Json(profile["quality"]),
                Json(profile["sample_rows"]),
            ),
        )
        conn.execute(
            """
            INSERT INTO dataset_metadata (
                workspace_id, dataset_id, metadata_json, column_info_json, statistics_json,
                summaries_json, embeddings_json, sampled_rows_json, quality_json, profile_json,
                created_by, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (dataset_id) DO UPDATE SET
                workspace_id = EXCLUDED.workspace_id,
                metadata_json = EXCLUDED.metadata_json,
                column_info_json = EXCLUDED.column_info_json,
                statistics_json = EXCLUDED.statistics_json,
                sampled_rows_json = EXCLUDED.sampled_rows_json,
                quality_json = EXCLUDED.quality_json,
                profile_json = EXCLUDED.profile_json,
                updated_at = NOW()
            """,
            (
                int(job["workspace_id"]),
                dataset_id,
                Json(
                    {
                        "file_name": job.get("file_name"),
                        "storage_bucket": job.get("storage_bucket"),
                        "storage_path": job.get("storage_path"),
                        "processing_job_id": job.get("id"),
                    }
                ),
                Json(profile["columns"]),
                Json({"row_count": profile["row_count"], "column_count": profile["column_count"]}),
                Json({}),
                Json({}),
                Json(profile["sample_rows"]),
                Json(profile["quality"]),
                Json({"columns": profile["columns"]}),
                job.get("created_by"),
            ),
        )
        conn.execute(
            """
            UPDATE datasets
            SET status = 'profiled', row_count = %s, column_count = %s, updated_at = NOW()
            WHERE id = %s
            """,
            (profile["row_count"], profile["column_count"], dataset_id),
        )
        conn.commit()


def process_csv_profile_job(job_id: int) -> dict[str, Any]:
    job = load_job(job_id)
    if job.get("type") not in {"csv_profile", "csv_metadata_extraction", "dataset_profiling"}:
        raise RuntimeError(f"Unsupported job type: {job.get('type')}")

    update_job(job_id, status="processing", progress=5, attempts=int(job.get("attempts") or 0) + 1, started_at=now_utc(), error="")
    update_dataset(int(job["dataset_id"]), status="processing")
    record_job_event(job_id, int(job["workspace_id"]), "started", "CSV metadata extraction started.")

    with supabase_object_stream(job["storage_bucket"], job["storage_path"]) as response:
        validate_csv_object_response(response, job)
        profile = profile_csv_response(response, job)
    save_profile(job, profile)
    final_job = update_job(job_id, status="completed", progress=100, error="", finished_at=now_utc())
    record_job_event(
        job_id,
        int(job["workspace_id"]),
        "completed",
        "CSV metadata extraction completed.",
        {"row_count": profile["row_count"], "column_count": profile["column_count"]},
    )
    return final_job
