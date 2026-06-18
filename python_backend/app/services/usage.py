from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from psycopg.types.json import Json

from app.database import get_db


def month_start() -> datetime:
    now = datetime.now(timezone.utc)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def record_usage(
    *,
    workspace_id: int | None,
    user_id: int | None,
    metric: str,
    units: int = 1,
    dataset_id: int | None = None,
    endpoint: str = "",
    metadata: dict[str, Any] | None = None,
) -> None:
    metadata = metadata or {}
    try:
        with get_db() as conn:
            conn.execute(
                """
                INSERT INTO usage_logs (
                    user_id, workspace_id, dataset_id, endpoint, request_type,
                    tokens_used, units, metadata_json
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (user_id, workspace_id, dataset_id, endpoint, metric, metadata.get("tokens_used") or 0, units, Json(metadata)),
            )
            if workspace_id is not None:
                conn.execute(
                    """
                    INSERT INTO workspace_usage (workspace_id, user_id, metric, period_start, count, units, metadata_json)
                    VALUES (%s, %s, %s, %s, 1, %s, %s)
                    ON CONFLICT (workspace_id, user_id, metric, period_start) DO UPDATE SET
                        count = workspace_usage.count + 1,
                        units = workspace_usage.units + EXCLUDED.units,
                        metadata_json = workspace_usage.metadata_json || EXCLUDED.metadata_json,
                        updated_at = NOW()
                    """,
                    (workspace_id, user_id, metric, month_start(), units, Json(metadata)),
                )
            conn.commit()
    except Exception:
        return


def workspace_usage_snapshot(workspace_id: int) -> dict[str, Any]:
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT metric, SUM(count) AS count, SUM(units) AS units
            FROM workspace_usage
            WHERE workspace_id = %s
              AND period_start = %s
            GROUP BY metric
            """,
            (workspace_id, month_start()),
        ).fetchall()
        datasets = conn.execute(
            """
            SELECT COUNT(*) AS dataset_count, COALESCE(SUM(size_bytes), 0) AS storage_bytes
            FROM datasets
            WHERE workspace_id = %s AND deleted_at IS NULL
            """,
            (workspace_id,),
        ).fetchone()
    return {
        "period_start": month_start().isoformat(),
        "metrics": {row["metric"]: {"count": int(row["count"] or 0), "units": int(row["units"] or 0)} for row in rows},
        "datasets": {
            "count": int((datasets or {}).get("dataset_count") or 0),
            "storage_bytes": int((datasets or {}).get("storage_bytes") or 0),
        },
    }
