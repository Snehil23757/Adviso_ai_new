from __future__ import annotations

from typing import Any

from app.services.redis_service import get_redis_service


def redis_configured() -> bool:
    return get_redis_service().configured


def redis_client():
    return get_redis_service().sync_client()


def redis_health() -> dict[str, Any]:
    return get_redis_service().health()


def enqueue_processing_job(job: dict[str, Any]) -> bool:
    return get_redis_service().enqueue_processing_job(job)


def publish_job_event(workspace_id: int, event: dict[str, Any]) -> bool:
    return get_redis_service().publish_workspace_event(workspace_id, event)


def persist_job_progress(workspace_id: int, job: dict[str, Any], event: dict[str, Any] | None = None) -> bool:
    return get_redis_service().persist_job_progress(workspace_id, job, event)
