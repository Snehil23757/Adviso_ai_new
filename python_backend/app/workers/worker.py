from __future__ import annotations

import json
import logging
import time
from typing import Any

from app.queueing import redis_client
from app.services.redis_service import get_redis_service
from app.workers.csv_profile import process_csv_profile_job


logger = logging.getLogger("adviso-ai.worker")


def process_job_payload(payload: dict[str, Any]) -> None:
    job_type = payload.get("type")
    job_id = int(payload["job_id"])
    if job_type == "csv_profile":
        process_csv_profile_job(job_id)
        return
    raise RuntimeError(f"Unsupported queued job type: {job_type}")


def run_once(timeout_seconds: int = 5) -> bool:
    client = redis_client()
    if client is None:
        raise RuntimeError("REDIS_URL is required to run queue workers.")

    item = client.brpop(["queue:csv_profile", "queue:processing"], timeout=timeout_seconds)
    if not item:
        return False

    _, raw_payload = item
    payload = json.loads(raw_payload)
    process_job_payload(payload)
    return True


def run_forever() -> None:
    if not get_redis_service().ping():
        raise RuntimeError("REDIS_URL is required and must be reachable to run queue workers.")
    logger.info("Adviso worker started.")
    while True:
        try:
            run_once(timeout_seconds=10)
        except Exception:
            logger.exception("Worker failed to process job.")
            time.sleep(2)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_forever()
