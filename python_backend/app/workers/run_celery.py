from __future__ import annotations

import os

from app.celery_app import celery_app
from app.config import get_settings


def main() -> None:
    settings = get_settings()
    queues = os.getenv("CELERY_QUEUES", "csv,ai,email,maintenance,default")
    loglevel = os.getenv("CELERY_LOGLEVEL", "info")
    concurrency = os.getenv("CELERY_WORKER_CONCURRENCY", str(settings.celery_worker_concurrency))

    celery_app.worker_main(
        [
            "worker",
            "-Q",
            queues,
            "--loglevel",
            loglevel,
            "--concurrency",
            str(concurrency),
        ]
    )


if __name__ == "__main__":
    main()
