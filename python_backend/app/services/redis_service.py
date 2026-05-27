from __future__ import annotations

import hashlib
import json
import logging
import time
from typing import Any

from app.config import get_settings


logger = logging.getLogger("adviso-ai.redis")


def _json_default(value: Any) -> str:
    return str(value)


def _stable_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), default=_json_default)


def _hash_identity(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


class RedisService:
    """Shared Redis access for queues, pub/sub, job progress, cache, and limits."""

    def __init__(self) -> None:
        self._sync_client: Any | None = None
        self._async_client: Any | None = None
        self._last_error = ""

    @property
    def configured(self) -> bool:
        return bool(get_settings().redis_url.strip())

    @property
    def last_error(self) -> str:
        return self._last_error

    def sync_client(self) -> Any | None:
        if not self.configured:
            return None
        if self._sync_client is not None:
            return self._sync_client

        try:
            import redis

            self._sync_client = redis.Redis.from_url(
                get_settings().redis_url,
                decode_responses=True,
                health_check_interval=30,
                retry_on_timeout=True,
                socket_connect_timeout=5,
                socket_timeout=5,
            )
            return self._sync_client
        except Exception as exc:
            self._last_error = str(exc)
            logger.warning("Redis sync client is unavailable: %s", exc)
            return None

    def async_client(self) -> Any | None:
        if not self.configured:
            return None
        if self._async_client is not None:
            return self._async_client

        try:
            import redis.asyncio as redis_async

            self._async_client = redis_async.Redis.from_url(
                get_settings().redis_url,
                decode_responses=True,
                health_check_interval=30,
                retry_on_timeout=True,
                socket_connect_timeout=5,
                socket_timeout=5,
            )
            return self._async_client
        except Exception as exc:
            self._last_error = str(exc)
            logger.warning("Redis async client is unavailable: %s", exc)
            return None

    def ping(self) -> bool:
        client = self.sync_client()
        if client is None:
            return False
        try:
            return bool(client.ping())
        except Exception as exc:
            self._last_error = str(exc)
            logger.warning("Redis ping failed: %s", exc)
            return False

    async def async_ping(self) -> bool:
        client = self.async_client()
        if client is None:
            return False
        try:
            return bool(await client.ping())
        except Exception as exc:
            self._last_error = str(exc)
            logger.warning("Redis async ping failed: %s", exc)
            return False

    def health(self) -> dict[str, Any]:
        start = time.perf_counter()
        available = self.ping()
        latency_ms = round((time.perf_counter() - start) * 1000, 2)
        return {
            "configured": self.configured,
            "available": available,
            "latency_ms": latency_ms if available else None,
            "last_error": "" if available else self._last_error,
        }

    def enqueue_processing_job(self, job: dict[str, Any]) -> bool:
        client = self.sync_client()
        if client is None:
            return False
        try:
            queue_name = f"queue:{job.get('type') or 'processing'}"
            payload = _stable_json(
                {
                    "job_id": job["id"],
                    "workspace_id": job["workspace_id"],
                    "dataset_id": job.get("dataset_id"),
                    "type": job.get("type"),
                }
            )
            client.lpush(queue_name, payload)
            return True
        except Exception as exc:
            self._last_error = str(exc)
            logger.warning("Redis enqueue failed: %s", exc)
            return False

    def publish_workspace_event(self, workspace_id: int, event: dict[str, Any]) -> bool:
        client = self.sync_client()
        if client is None:
            return False
        try:
            payload = _stable_json(event)
            channel = f"ws:workspace:{workspace_id}"
            stream = f"stream:workspace:{workspace_id}:events"
            pipeline = client.pipeline()
            pipeline.publish(channel, payload)
            pipeline.xadd(stream, {"event": payload}, maxlen=1000, approximate=True)
            pipeline.expire(stream, 60 * 60 * 24)
            pipeline.execute()
            return True
        except Exception as exc:
            self._last_error = str(exc)
            logger.warning("Redis publish failed: %s", exc)
            return False

    def persist_job_progress(self, workspace_id: int, job: dict[str, Any], event: dict[str, Any] | None = None) -> bool:
        client = self.sync_client()
        if client is None:
            return False
        try:
            payload = {
                "job_id": job.get("id"),
                "workspace_id": workspace_id,
                "dataset_id": job.get("dataset_id"),
                "type": job.get("type"),
                "status": job.get("status") or "queued",
                "progress": int(job.get("progress") or 0),
                "error": job.get("error") or "",
                "event": event or {},
                "updated_at": int(time.time()),
            }
            encoded = _stable_json(payload)
            ttl = 60 * 60 * 24
            pipeline = client.pipeline()
            pipeline.setex(f"upload:job:{job.get('id')}:progress", ttl, encoded)
            pipeline.setex(f"workspace:{workspace_id}:upload:job:{job.get('id')}", ttl, encoded)
            pipeline.hset(f"workspace:{workspace_id}:upload_jobs", str(job.get("id")), encoded)
            pipeline.expire(f"workspace:{workspace_id}:upload_jobs", ttl)
            pipeline.execute()
            return True
        except Exception as exc:
            self._last_error = str(exc)
            logger.warning("Redis job progress persist failed: %s", exc)
            return False

    def get_json(self, key: str) -> Any | None:
        client = self.sync_client()
        if client is None:
            return None
        try:
            raw = client.get(key)
            return json.loads(raw) if raw else None
        except Exception as exc:
            self._last_error = str(exc)
            logger.warning("Redis cache read failed: %s", exc)
            return None

    def set_json(self, key: str, value: Any, ttl_seconds: int) -> bool:
        client = self.sync_client()
        if client is None or ttl_seconds <= 0:
            return False
        try:
            client.setex(key, ttl_seconds, _stable_json(value))
            return True
        except Exception as exc:
            self._last_error = str(exc)
            logger.warning("Redis cache write failed: %s", exc)
            return False

    def cache_key(self, namespace: str, payload: Any) -> str:
        return f"cache:{namespace}:{_hash_identity(_stable_json(payload))}"

    async def check_rate_limit(
        self,
        namespace: str,
        identity: str,
        limit: int,
        window_seconds: int,
    ) -> dict[str, Any]:
        if limit <= 0 or window_seconds <= 0:
            return {"allowed": True, "available": False, "remaining": None, "reset_seconds": None}
        client = self.async_client()
        if client is None:
            return {"allowed": True, "available": False, "remaining": None, "reset_seconds": None}

        key = f"rate:{namespace}:{_hash_identity(identity)}"
        try:
            current = await client.incr(key)
            if current == 1:
                await client.expire(key, window_seconds)
            ttl = await client.ttl(key)
            reset_seconds = ttl if isinstance(ttl, int) and ttl > 0 else window_seconds
            return {
                "allowed": current <= limit,
                "available": True,
                "remaining": max(0, limit - current),
                "reset_seconds": reset_seconds,
                "limit": limit,
            }
        except Exception as exc:
            self._last_error = str(exc)
            logger.warning("Redis rate-limit check failed: %s", exc)
            return {"allowed": True, "available": False, "remaining": None, "reset_seconds": None}

    def close_sync(self) -> None:
        if self._sync_client is None:
            return
        try:
            self._sync_client.close()
        except Exception:
            logger.debug("Redis sync close failed.", exc_info=True)
        finally:
            self._sync_client = None

    async def close_async(self) -> None:
        if self._async_client is None:
            return
        try:
            await self._async_client.aclose()
        except Exception:
            logger.debug("Redis async close failed.", exc_info=True)
        finally:
            self._async_client = None


_redis_service = RedisService()


def get_redis_service() -> RedisService:
    return _redis_service
