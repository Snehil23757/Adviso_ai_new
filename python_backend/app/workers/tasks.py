from __future__ import annotations

from typing import Any, Callable

from celery import Task

from app.celery_app import celery_app
from app.workers.ai_jobs import (
    process_ai_summary_job,
    process_cleanup_expired_cache_job,
    process_cleanup_uploads_job,
    process_insight_generation_job,
    process_recover_interrupted_jobs,
)
from app.workers.csv_profile import process_csv_profile_job
from app.workers.job_utils import fail_job, load_job, record_job_event, update_dataset, update_job
from app.services.email_service import send_email_event


def _retry_delay(retries: int) -> int:
    return min(120, 10 * (2**retries))


def _execute_job_task(
    task: Task,
    job_id: int,
    handler: Callable[[int], dict[str, Any]],
    *,
    retry_message: str,
    fail_message: str,
    fail_dataset: bool = False,
) -> dict[str, Any]:
    try:
        return handler(job_id)
    except Exception as exc:
        if task.request.retries < task.max_retries:
            try:
                job = load_job(job_id)
                update_job(job_id, status="queued", error=str(exc))
                record_job_event(
                    job_id,
                    int(job["workspace_id"]),
                    "retrying",
                    retry_message,
                    {"error": str(exc), "retry": task.request.retries + 1, "max_retries": task.max_retries},
                )
            except Exception:
                pass
            raise task.retry(exc=exc, countdown=_retry_delay(task.request.retries))

        failed = fail_job(job_id, str(exc), fail_message)
        if fail_dataset and failed.get("dataset_id"):
            update_dataset(int(failed["dataset_id"]), status="failed")
        raise


@celery_app.task(bind=True, name="adviso.csv_metadata_extraction", max_retries=3, acks_late=True)
def csv_metadata_extraction(self: Task, job_id: int) -> dict[str, Any]:
    return _execute_job_task(
        self,
        int(job_id),
        process_csv_profile_job,
        retry_message="CSV metadata extraction failed and will be retried.",
        fail_message="CSV metadata extraction failed.",
        fail_dataset=True,
    )


@celery_app.task(bind=True, name="adviso.dataset_profiling", max_retries=3, acks_late=True)
def dataset_profiling(self: Task, job_id: int) -> dict[str, Any]:
    return _execute_job_task(
        self,
        int(job_id),
        process_csv_profile_job,
        retry_message="Dataset profiling failed and will be retried.",
        fail_message="Dataset profiling failed.",
        fail_dataset=True,
    )


@celery_app.task(bind=True, name="adviso.ai_summary_generation", max_retries=2, acks_late=True)
def ai_summary_generation(self: Task, job_id: int) -> dict[str, Any]:
    return _execute_job_task(
        self,
        int(job_id),
        process_ai_summary_job,
        retry_message="AI summary generation failed and will be retried.",
        fail_message="AI summary generation failed.",
    )


@celery_app.task(bind=True, name="adviso.insight_generation", max_retries=2, acks_late=True)
def insight_generation(self: Task, job_id: int) -> dict[str, Any]:
    return _execute_job_task(
        self,
        int(job_id),
        process_insight_generation_job,
        retry_message="AI insight generation failed and will be retried.",
        fail_message="AI insight generation failed.",
    )


@celery_app.task(bind=True, name="adviso.cleanup_uploads", max_retries=2, acks_late=True)
def cleanup_uploads(self: Task, job_id: int | None = None, older_than_hours: int = 24) -> dict[str, Any]:
    if job_id is None:
        return process_cleanup_uploads_job(None, older_than_hours=older_than_hours)
    return _execute_job_task(
        self,
        int(job_id),
        lambda cleanup_job_id: process_cleanup_uploads_job(cleanup_job_id, older_than_hours=older_than_hours),
        retry_message="Upload cleanup failed and will be retried.",
        fail_message="Upload cleanup failed.",
    )


@celery_app.task(bind=True, name="adviso.cleanup_expired_cache", max_retries=2, acks_late=True)
def cleanup_expired_cache(self: Task, job_id: int | None = None, limit: int | None = None) -> dict[str, Any]:
    if job_id is None:
        return process_cleanup_expired_cache_job(None, limit=limit)
    return _execute_job_task(
        self,
        int(job_id),
        lambda cleanup_job_id: process_cleanup_expired_cache_job(cleanup_job_id, limit=limit),
        retry_message="Expired cache cleanup failed and will be retried.",
        fail_message="Expired cache cleanup failed.",
    )


@celery_app.task(bind=True, name="adviso.recover_interrupted_jobs", max_retries=2, acks_late=True)
def recover_interrupted_jobs(self: Task, job_id: int | None = None, older_than_minutes: int | None = None) -> dict[str, Any]:
    if job_id is None:
        return process_recover_interrupted_jobs(None, older_than_minutes=older_than_minutes)
    return _execute_job_task(
        self,
        int(job_id),
        lambda recovery_job_id: process_recover_interrupted_jobs(recovery_job_id, older_than_minutes=older_than_minutes),
        retry_message="Interrupted job recovery failed and will be retried.",
        fail_message="Interrupted job recovery failed.",
    )


@celery_app.task(bind=True, name="adviso.send_transactional_email", max_retries=3, acks_late=True)
def send_transactional_email(self: Task, event_id: int) -> dict[str, Any]:
    try:
        return send_email_event(int(event_id))
    except Exception as exc:
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=_retry_delay(self.request.retries))
        raise
