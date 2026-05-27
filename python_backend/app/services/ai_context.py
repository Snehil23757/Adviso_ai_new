from __future__ import annotations

import hashlib
import json
from datetime import timedelta
from typing import Any

from psycopg.types.json import Json

from app.config import get_settings
from app.database import get_db, normalize_record, normalize_row, now_utc


def stable_hash(payload: dict[str, Any]) -> str:
    encoded = json.dumps(payload, sort_keys=True, default=str, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def build_ai_context(
    workspace_id: int | None = None,
    dataset_id: int | None = None,
    rows: list[dict] | None = None,
    columns: list[str] | None = None,
    extra_context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    context: dict[str, Any] = {
        "workspace": {},
        "dataset": {},
        "columns": columns or [],
        "sampleRows": (rows or [])[:25],
        "statistics": {},
        "quality": {},
        "profile": {},
        "summaries": {},
        "memory": {},
        "extra": extra_context or {},
    }
    if not workspace_id:
        return context

    with get_db() as conn:
        workspace = conn.execute(
            "SELECT id, name, slug, plan_id, settings_json FROM workspaces WHERE id = %s AND deleted_at IS NULL",
            (workspace_id,),
        ).fetchone()
        context["workspace"] = normalize_record(workspace) or {}
        if not workspace:
            return context

        if dataset_id:
            dataset = conn.execute(
                """
                SELECT id, workspace_id, file_name, size_bytes, status, row_count, column_count,
                       metadata_json, created_at, updated_at
                FROM datasets
                WHERE workspace_id = %s AND id = %s AND deleted_at IS NULL
                """,
                (workspace_id, dataset_id),
            ).fetchone()
            if dataset:
                context["dataset"] = normalize_record(dataset) or {}
                dataset_columns = conn.execute(
                    """
                    SELECT name, data_type, position, null_count, unique_count, sample_values_json, stats_json
                    FROM dataset_columns
                    WHERE dataset_id = %s
                    ORDER BY position ASC
                    """,
                    (dataset_id,),
                ).fetchall()
                metadata = conn.execute(
                    "SELECT * FROM dataset_metadata WHERE workspace_id = %s AND dataset_id = %s",
                    (workspace_id, dataset_id),
                ).fetchone()
                stats = conn.execute(
                    "SELECT * FROM dataset_stats WHERE dataset_id = %s",
                    (dataset_id,),
                ).fetchone()
                normalized_metadata = normalize_record(metadata) or {}
                normalized_stats = normalize_record(stats) or {}
                normalized_columns = normalize_row(dataset_columns)
                context["columns"] = [column["name"] for column in normalized_columns if column.get("name")] or context["columns"]
                context["columnProfiles"] = normalized_columns[:80]
                context["sampleRows"] = (
                    normalized_metadata.get("sampled_rows_json")
                    or normalized_stats.get("sample_rows_json")
                    or context["sampleRows"]
                )[:25]
                context["statistics"] = normalized_metadata.get("statistics_json") or normalized_stats.get("stats_json") or {}
                context["quality"] = normalized_metadata.get("quality_json") or normalized_stats.get("quality_json") or {}
                context["profile"] = normalized_metadata.get("profile_json") or normalized_stats.get("profile_json") or {}
                context["summaries"] = normalized_metadata.get("summaries_json") or {}

        artifacts = conn.execute(
            """
            SELECT kind, content_json, created_at
            FROM ai_artifacts
            WHERE workspace_id = %s
              AND (%s::BIGINT IS NULL OR dataset_id = %s)
            ORDER BY created_at DESC
            LIMIT 8
            """,
            (workspace_id, dataset_id, dataset_id),
        ).fetchall()
        chats = conn.execute(
            """
            SELECT c.id, c.title, c.dataset_id, c.updated_at,
                   (
                     SELECT content
                     FROM ai_chat_messages m
                     WHERE m.chat_id = c.id AND m.role = 'assistant'
                     ORDER BY m.created_at DESC
                     LIMIT 1
                   ) AS last_assistant_message
            FROM ai_chats c
            WHERE c.workspace_id = %s
              AND c.status = 'active'
              AND c.deleted_at IS NULL
              AND (%s::BIGINT IS NULL OR c.dataset_id = %s)
            ORDER BY c.updated_at DESC
            LIMIT 6
            """,
            (workspace_id, dataset_id, dataset_id),
        ).fetchall()

    context["memory"] = {
        "recentArtifacts": normalize_row(artifacts),
        "recentChats": normalize_row(chats),
    }
    return context


def build_prompt_hash(
    *,
    workspace_id: int | None,
    dataset_id: int | None,
    mode: str,
    question: str,
    columns: list[str],
    context: dict[str, Any],
    model: str | None = None,
) -> str:
    return stable_hash(
        {
            "workspace_id": workspace_id,
            "dataset_id": dataset_id,
            "mode": mode,
            "question": question,
            "columns": columns,
            "context": context,
            "model": model or get_settings().ai_model,
        }
    )


def get_cached_ai_response(workspace_id: int | None, prompt_hash: str) -> dict[str, Any] | None:
    if not workspace_id:
        return None
    with get_db() as conn:
        row = conn.execute(
            """
            UPDATE ai_response_cache
            SET hit_count = hit_count + 1,
                last_used_at = NOW(),
                updated_at = NOW()
            WHERE workspace_id = %s
              AND prompt_hash = %s
              AND (expires_at IS NULL OR expires_at > NOW())
            RETURNING response_json, source, model, hit_count
            """,
            (workspace_id, prompt_hash),
        ).fetchone()
        conn.commit()
    return normalize_record(row)


def store_ai_response_cache(
    *,
    workspace_id: int | None,
    dataset_id: int | None,
    prompt_hash: str,
    prompt: dict[str, Any],
    response: dict[str, Any],
    source: str,
) -> None:
    if not workspace_id:
        return
    settings = get_settings()
    expires_at = now_utc() + timedelta(seconds=settings.ai_cache_ttl_seconds)
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO ai_response_cache (
                workspace_id, dataset_id, prompt_hash, model, prompt_json,
                response_json, source, expires_at, last_used_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (workspace_id, prompt_hash) DO UPDATE SET
                response_json = EXCLUDED.response_json,
                source = EXCLUDED.source,
                model = EXCLUDED.model,
                prompt_json = EXCLUDED.prompt_json,
                expires_at = EXCLUDED.expires_at,
                last_used_at = NOW(),
                updated_at = NOW()
            """,
            (
                workspace_id,
                dataset_id,
                prompt_hash,
                settings.ai_model,
                Json(prompt),
                Json(response),
                source,
                expires_at,
            ),
        )
        conn.commit()
