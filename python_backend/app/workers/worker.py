from __future__ import annotations

import logging

from app.celery_app import celery_app
from app.services.redis_service import get_redis_service


logger = logging.getLogger("adviso-ai.worker")
DEFAULT_QUEUES = "csv,ai,email,maintenance,default"


def run_forever() -> None:
    if not get_redis_service().ping():
        raise RuntimeError("REDIS_URL is required and must be reachable to run Celery workers.")
    logger.info("Starting Adviso Celery worker for queues: %s", DEFAULT_QUEUES)
    celery_app.worker_main(["worker", "-Q", DEFAULT_QUEUES, "--loglevel=INFO"])


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_forever()
