from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from fastapi import HTTPException

from app.config import get_settings
from app.database import get_db
from app.saas import current_subscription_for_user
from app.services.redis_service import get_redis_service


@dataclass(frozen=True)
class WorkspaceQuota:
    max_uploads_per_month: int
    max_datasets: int
    max_ai_requests_per_month: int
    max_storage_bytes: int


PLAN_QUOTAS: dict[str, WorkspaceQuota] = {
    "free": WorkspaceQuota(max_uploads_per_month=2, max_datasets=2, max_ai_requests_per_month=25, max_storage_bytes=200 * 1024 * 1024),
    "go": WorkspaceQuota(max_uploads_per_month=100, max_datasets=25, max_ai_requests_per_month=1000, max_storage_bytes=5 * 1024 * 1024 * 1024),
    "pro": WorkspaceQuota(max_uploads_per_month=1000, max_datasets=250, max_ai_requests_per_month=10000, max_storage_bytes=50 * 1024 * 1024 * 1024),
    "enterprise": WorkspaceQuota(max_uploads_per_month=100000, max_datasets=100000, max_ai_requests_per_month=1000000, max_storage_bytes=5 * 1024 * 1024 * 1024 * 1024),
}


def quota_for_user(user: dict[str, Any]) -> WorkspaceQuota:
    subscription = current_subscription_for_user(int(user["id"]))
    plan_id = (subscription or {}).get("plan_id") or user.get("plan_id") or "free"
    return PLAN_QUOTAS.get(str(plan_id), PLAN_QUOTAS["free"])


def workspace_counts(workspace_id: int) -> dict[str, int]:
    with get_db() as conn:
        row = conn.execute(
            """
            SELECT COUNT(*) AS dataset_count, COALESCE(SUM(size_bytes), 0) AS storage_bytes
            FROM datasets
            WHERE workspace_id = %s AND deleted_at IS NULL
            """,
            (workspace_id,),
        ).fetchone()
        uploads = conn.execute(
            """
            SELECT COALESCE(SUM(count), 0) AS upload_count
            FROM workspace_usage
            WHERE workspace_id = %s
              AND metric = 'upload.count'
              AND period_start = date_trunc('month', NOW())
            """,
            (workspace_id,),
        ).fetchone()
        ai_requests = conn.execute(
            """
            SELECT COALESCE(SUM(count), 0) AS ai_request_count
            FROM workspace_usage
            WHERE workspace_id = %s
              AND metric = 'ai.request'
              AND period_start = date_trunc('month', NOW())
            """,
            (workspace_id,),
        ).fetchone()
    return {
        "dataset_count": int((row or {}).get("dataset_count") or 0),
        "storage_bytes": int((row or {}).get("storage_bytes") or 0),
        "upload_count": int((uploads or {}).get("upload_count") or 0),
        "ai_request_count": int((ai_requests or {}).get("ai_request_count") or 0),
    }


def enforce_upload_quota(user: dict[str, Any], workspace_id: int, upload_size_bytes: int) -> None:
    quota = quota_for_user(user)
    counts = workspace_counts(workspace_id)
    if counts["dataset_count"] >= quota.max_datasets:
        raise HTTPException(status_code=402, detail="Workspace dataset quota exceeded.")
    if counts["upload_count"] >= quota.max_uploads_per_month:
        raise HTTPException(status_code=402, detail="Monthly upload quota exceeded.")
    if counts["storage_bytes"] + max(0, upload_size_bytes) > quota.max_storage_bytes:
        raise HTTPException(status_code=402, detail="Workspace storage quota exceeded.")


def enforce_ai_quota(user: dict[str, Any], workspace_id: int) -> None:
    quota = quota_for_user(user)
    counts = workspace_counts(workspace_id)
    if counts["ai_request_count"] >= quota.max_ai_requests_per_month:
        raise HTTPException(status_code=402, detail="Monthly AI request quota exceeded.")


async def enforce_rate_limit(namespace: str, identity: str, limit: int, window_seconds: int = 60) -> None:
    result = await get_redis_service().check_rate_limit(namespace, identity, limit, window_seconds)
    if not result.get("allowed", True):
        raise HTTPException(status_code=429, detail="Rate limit exceeded.")


async def enforce_upload_rate_limit(user: dict[str, Any], workspace_id: int) -> None:
    await enforce_rate_limit("upload", f"{user['id']}:{workspace_id}", get_settings().upload_rate_limit_per_minute)


async def enforce_ai_rate_limit(user: dict[str, Any], workspace_id: int) -> None:
    await enforce_rate_limit("ai", f"{user['id']}:{workspace_id}", get_settings().ai_rate_limit_per_minute)


async def enforce_websocket_rate_limit(user_id: int, workspace_id: int) -> None:
    await enforce_rate_limit("ws", f"{user_id}:{workspace_id}", get_settings().websocket_rate_limit_per_minute)


def quota_snapshot(user: dict[str, Any], workspace_id: int) -> dict[str, Any]:
    quota = quota_for_user(user)
    return {
        "quota": {
            "max_uploads_per_month": quota.max_uploads_per_month,
            "max_datasets": quota.max_datasets,
            "max_ai_requests_per_month": quota.max_ai_requests_per_month,
            "max_storage_bytes": quota.max_storage_bytes,
        },
        "usage": workspace_counts(workspace_id),
    }
