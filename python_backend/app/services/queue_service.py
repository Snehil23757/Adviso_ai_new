from __future__ import annotations

import logging
from typing import Any

from celery.exceptions import CeleryError

from app.celery_app import celery_app
from app.services.redis_service import get_redis_service


logger = logging.getLogger("adviso-ai.queue")

TASK_BY_JOB_TYPE = {
    "csv_profile": "adviso.csv_metadata_extraction",
    "csv_metadata_extraction": "adviso.csv_metadata_extraction",
    "dataset_profiling": "adviso.dataset_profiling",
    "ai_summary_generation": "adviso.ai_summary_generation",
    "insight_generation": "adviso.insight_generation",
    "cleanup_uploads": "adviso.cleanup_uploads",
    "cleanup_expired_cache": "adviso.cleanup_expired_cache",
    "recover_interrupted_jobs": "adviso.recover_interrupted_jobs",
}

QUEUE_BY_JOB_TYPE = {
    "csv_profile": "csv",
    "csv_metadata_extraction": "csv",
    "dataset_profiling": "csv",
    "ai_summary_generation": "ai",
    "insight_generation": "ai",
    "cleanup_uploads": "maintenance",
    "cleanup_expired_cache": "maintenance",
    "recover_interrupted_jobs": "maintenance",
}

QUEUES = ("csv", "ai", "email", "maintenance", "default")


class QueueService:
    def enqueue_processing_job(self, job: dict[str, Any]) -> bool:
        job_type = str(job.get("type") or "")
        task_name = TASK_BY_JOB_TYPE.get(job_type)
        if not task_name:
            logger.warning("No Celery task mapped for processing job type %s.", job_type)
            return False

        try:
            result = celery_app.send_task(
                task_name,
                args=[int(job["id"])],
                queue=QUEUE_BY_JOB_TYPE.get(job_type, "default"),
            )
            self._store_task_mapping(job, result.id)
            return True
        except CeleryError as exc:
            logger.warning("Celery enqueue failed for job %s: %s", job.get("id"), exc)
            return False
        except Exception as exc:
            logger.warning("Unexpected Celery enqueue failure for job %s: %s", job.get("id"), exc)
            return False

    def _store_task_mapping(self, job: dict[str, Any], task_id: str) -> None:
        workspace_id = int(job["workspace_id"])
        job_id = int(job["id"])
        get_redis_service().set_json(
            f"celery:job:{job_id}",
            {
                "job_id": job_id,
                "workspace_id": workspace_id,
                "dataset_id": job.get("dataset_id"),
                "job_type": job.get("type"),
                "task_id": task_id,
                "queue": QUEUE_BY_JOB_TYPE.get(str(job.get("type") or ""), "default"),
            },
            60 * 60 * 24,
        )

    def celery_health(self) -> dict[str, Any]:
        try:
            inspector = celery_app.control.inspect(timeout=1.0)
            ping = inspector.ping() or {}
            stats = inspector.stats() or {}
            active = inspector.active() or {}
            reserved = inspector.reserved() or {}
            return {
                "available": bool(ping),
                "workers": sorted(ping.keys()),
                "worker_count": len(ping),
                "active_count": sum(len(items) for items in active.values()),
                "reserved_count": sum(len(items) for items in reserved.values()),
                "stats_available": bool(stats),
            }
        except Exception as exc:
            logger.warning("Celery health check failed: %s", exc)
            return {"available": False, "workers": [], "worker_count": 0, "error": str(exc)}

    def queue_status(self) -> dict[str, Any]:
        client = get_redis_service().sync_client()
        lengths: dict[str, int | None] = {}
        if client is not None:
            for queue in QUEUES:
                try:
                    lengths[queue] = int(client.llen(queue))
                except Exception:
                    lengths[queue] = None

        return {
            "redis": get_redis_service().health(),
            "celery": self.celery_health(),
            "queues": lengths,
            "known_queues": list(QUEUES),
            "task_routes": TASK_BY_JOB_TYPE,
        }


_queue_service = QueueService()


def get_queue_service() -> QueueService:
    return _queue_service
