from __future__ import annotations

import ssl

from celery import Celery

from app.config import get_settings


settings = get_settings()
redis_url = settings.redis_url.strip()

if not redis_url:
    raise RuntimeError("REDIS_URL is required for Celery broker and result backend.")


def _ssl_options() -> dict | None:
    if redis_url.startswith("rediss://"):
        return {"ssl_cert_reqs": ssl.CERT_REQUIRED}
    return None


celery_app = Celery(
    "adviso_ai",
    broker=redis_url,
    backend=redis_url,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    result_expires=settings.celery_result_expires_seconds,
    broker_connection_retry_on_startup=True,
    broker_pool_limit=10,
    worker_concurrency=settings.celery_worker_concurrency,
    worker_prefetch_multiplier=settings.celery_worker_prefetch_multiplier,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    task_track_started=True,
    task_soft_time_limit=settings.celery_task_soft_time_limit_seconds,
    task_time_limit=settings.celery_task_time_limit_seconds,
    task_default_queue="default",
    task_default_exchange="default",
    task_default_routing_key="default",
    task_routes={
        "adviso.csv_metadata_extraction": {"queue": "csv"},
        "adviso.dataset_profiling": {"queue": "csv"},
        "adviso.ai_summary_generation": {"queue": "ai"},
        "adviso.insight_generation": {"queue": "ai"},
        "adviso.cleanup_uploads": {"queue": "maintenance"},
        "adviso.cleanup_expired_cache": {"queue": "maintenance"},
        "adviso.recover_interrupted_jobs": {"queue": "maintenance"},
        "adviso.send_transactional_email": {"queue": "email"},
    },
    beat_schedule={
        "cleanup-stale-upload-requests-hourly": {
            "task": "adviso.cleanup_uploads",
            "schedule": 60 * 60,
            "args": (None, 24),
            "options": {"queue": "maintenance"},
        },
        "cleanup-expired-ai-cache-hourly": {
            "task": "adviso.cleanup_expired_cache",
            "schedule": 60 * 60,
            "args": (None, None),
            "options": {"queue": "maintenance"},
        },
        "recover-interrupted-jobs-every-10-minutes": {
            "task": "adviso.recover_interrupted_jobs",
            "schedule": 10 * 60,
            "args": (None, settings.abandoned_job_minutes),
            "options": {"queue": "maintenance"},
        },
    },
)

ssl_options = _ssl_options()
if ssl_options:
    celery_app.conf.broker_use_ssl = ssl_options
    celery_app.conf.redis_backend_use_ssl = ssl_options
