from __future__ import annotations

from typing import Any

from fastapi import HTTPException
from psycopg.types.json import Json

from app.database import get_db, normalize_record, normalize_row
from app.services.analytics import dataset_insights
from app.tenant import require_dataset_in_workspace
from app.workspaces import ensure_default_workspace, require_workspace_access


def _title_from_question(question: str) -> str:
    clean = " ".join(question.strip().split())
    return clean[:80] or "New chat"


def ensure_workspace_session(user: dict[str, Any], workspace_id: int) -> dict[str, Any]:
    require_workspace_access(user, workspace_id)
    with get_db() as conn:
        latest_dataset = conn.execute(
            """
            SELECT id
            FROM datasets
            WHERE workspace_id = %s
              AND deleted_at IS NULL
            ORDER BY updated_at DESC, created_at DESC
            LIMIT 1
            """,
            (workspace_id,),
        ).fetchone()
        row = conn.execute(
            """
            INSERT INTO workspace_sessions (workspace_id, user_id, active_dataset_id)
            VALUES (%s, %s, %s)
            ON CONFLICT (workspace_id, user_id) DO UPDATE SET
                last_seen_at = NOW(),
                updated_at = NOW(),
                active_dataset_id = COALESCE(workspace_sessions.active_dataset_id, EXCLUDED.active_dataset_id)
            RETURNING *
            """,
            (workspace_id, user["id"], latest_dataset["id"] if latest_dataset else None),
        ).fetchone()
        conn.commit()
    return normalize_record(row) or {}


def _dataset_payload(workspace_id: int, dataset_id: int | None) -> dict[str, Any] | None:
    if not dataset_id:
        return None
    with get_db() as conn:
        dataset = conn.execute(
            "SELECT * FROM datasets WHERE workspace_id = %s AND id = %s AND deleted_at IS NULL",
            (workspace_id, dataset_id),
        ).fetchone()
        if not dataset:
            return None
        columns = conn.execute(
            "SELECT * FROM dataset_columns WHERE dataset_id = %s ORDER BY position ASC",
            (dataset_id,),
        ).fetchall()
        stats = conn.execute(
            "SELECT * FROM dataset_stats WHERE dataset_id = %s",
            (dataset_id,),
        ).fetchone()
        metadata = conn.execute(
            "SELECT * FROM dataset_metadata WHERE workspace_id = %s AND dataset_id = %s",
            (workspace_id, dataset_id),
        ).fetchone()
    return {
        "dataset": normalize_record(dataset) or {},
        "columns": normalize_row(columns),
        "stats": normalize_record(stats) or {},
        "metadata": normalize_record(metadata) or {},
    }


def _chat_payload(workspace_id: int, chat_id: int | None) -> dict[str, Any]:
    with get_db() as conn:
        chats = conn.execute(
            """
            SELECT id, workspace_id, dataset_id, user_id, title, status, context_json, created_at, updated_at
            FROM ai_chats
            WHERE workspace_id = %s AND status = 'active' AND deleted_at IS NULL
            ORDER BY updated_at DESC
            LIMIT 30
            """,
            (workspace_id,),
        ).fetchall()
        active_chat = None
        messages = []
        if chat_id:
            active_chat = conn.execute(
                "SELECT * FROM ai_chats WHERE workspace_id = %s AND id = %s AND status = 'active' AND deleted_at IS NULL",
                (workspace_id, chat_id),
            ).fetchone()
            if active_chat:
                messages = conn.execute(
                    """
                    SELECT id, workspace_id, chat_id, dataset_id, role, content, source, metadata_json, created_at
                    FROM ai_chat_messages
                    WHERE workspace_id = %s AND chat_id = %s
                    ORDER BY created_at ASC
                    LIMIT 200
                    """,
                    (workspace_id, chat_id),
                ).fetchall()
    return {
        "chats": normalize_row(chats),
        "active_chat": normalize_record(active_chat) or None,
        "messages": normalize_row(messages),
    }


def workspace_session_payload(user: dict[str, Any], workspace_id: int) -> dict[str, Any]:
    workspace = require_workspace_access(user, workspace_id)
    session = ensure_workspace_session(user, workspace_id)
    dataset = _dataset_payload(workspace_id, session.get("active_dataset_id"))
    chats = _chat_payload(workspace_id, session.get("active_chat_id"))
    return {
        "success": True,
        "workspace": workspace,
        "session": session,
        "dataset": dataset,
        **chats,
    }


def restore_latest_workspace_session(user: dict[str, Any]) -> dict[str, Any]:
    default_workspace = ensure_default_workspace(user)
    with get_db() as conn:
        row = conn.execute(
            """
            SELECT ws.*
            FROM workspace_sessions ws
            JOIN workspace_members wm ON wm.workspace_id = ws.workspace_id
            JOIN workspaces w ON w.id = ws.workspace_id
            WHERE ws.user_id = %s AND wm.user_id = %s AND wm.status = 'active'
              AND w.deleted_at IS NULL
            ORDER BY ws.last_seen_at DESC
            LIMIT 1
            """,
            (user["id"], user["id"]),
        ).fetchone()
    workspace_id = int((row or {}).get("workspace_id") or default_workspace["id"])
    return workspace_session_payload(user, workspace_id)


def update_workspace_session(user: dict[str, Any], workspace_id: int, updates: dict[str, Any]) -> dict[str, Any]:
    require_workspace_access(user, workspace_id)
    ensure_workspace_session(user, workspace_id)

    active_dataset_id = updates.get("active_dataset_id")
    if active_dataset_id is not None:
        require_dataset_in_workspace(workspace_id, int(active_dataset_id))

    active_chat_id = updates.get("active_chat_id")
    if active_chat_id is not None:
        with get_db() as conn:
            chat = conn.execute(
                "SELECT id FROM ai_chats WHERE workspace_id = %s AND id = %s AND status = 'active' AND deleted_at IS NULL",
                (workspace_id, int(active_chat_id)),
            ).fetchone()
        if not chat:
            raise HTTPException(status_code=404, detail="AI chat not found in this workspace.")

    with get_db() as conn:
        row = conn.execute(
            """
            UPDATE workspace_sessions
            SET active_dataset_id = COALESCE(%s, active_dataset_id),
                active_chat_id = COALESCE(%s, active_chat_id),
                active_page = COALESCE(NULLIF(%s, ''), active_page),
                state_json = COALESCE(%s, state_json),
                updated_at = NOW(),
                last_seen_at = NOW()
            WHERE workspace_id = %s AND user_id = %s
            RETURNING *
            """,
            (
                active_dataset_id,
                active_chat_id,
                str(updates.get("active_page") or "")[:80],
                Json(updates.get("state_json")) if isinstance(updates.get("state_json"), dict) else None,
                workspace_id,
                user["id"],
            ),
        ).fetchone()
        conn.commit()
    return workspace_session_payload(user, workspace_id) | {"session": normalize_record(row) or {}}


def create_ai_chat(user: dict[str, Any], workspace_id: int, dataset_id: int | None = None, title: str = "") -> dict[str, Any]:
    require_workspace_access(user, workspace_id)
    ensure_workspace_session(user, workspace_id)
    if dataset_id is not None:
        require_dataset_in_workspace(workspace_id, dataset_id)
    with get_db() as conn:
        chat = conn.execute(
            """
            INSERT INTO ai_chats (workspace_id, dataset_id, user_id, title)
            VALUES (%s, %s, %s, %s)
            RETURNING *
            """,
            (workspace_id, dataset_id, user["id"], title.strip()[:120] or "New chat"),
        ).fetchone()
        conn.execute(
            """
            UPDATE workspace_sessions
            SET active_chat_id = %s,
                active_dataset_id = COALESCE(%s, active_dataset_id),
                updated_at = NOW(),
                last_seen_at = NOW()
            WHERE workspace_id = %s AND user_id = %s
            """,
            (chat["id"], dataset_id, workspace_id, user["id"]),
        )
        conn.commit()
    return normalize_record(chat) or {}


def _ensure_chat(user: dict[str, Any], workspace_id: int, dataset_id: int | None, chat_id: int | None, question: str) -> dict[str, Any]:
    if chat_id:
        with get_db() as conn:
            chat = conn.execute(
                "SELECT * FROM ai_chats WHERE workspace_id = %s AND id = %s AND status = 'active' AND deleted_at IS NULL",
                (workspace_id, chat_id),
            ).fetchone()
        if not chat:
            raise HTTPException(status_code=404, detail="AI chat not found in this workspace.")
        return normalize_record(chat) or {}
    return create_ai_chat(user, workspace_id, dataset_id, _title_from_question(question))


def _insert_chat_message(
    *,
    workspace_id: int,
    chat_id: int,
    dataset_id: int | None,
    user_id: int | None,
    role: str,
    content: str,
    source: str = "",
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    with get_db() as conn:
        message = conn.execute(
            """
            INSERT INTO ai_chat_messages (workspace_id, chat_id, dataset_id, user_id, role, content, source, metadata_json)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (workspace_id, chat_id, dataset_id, user_id, role, content, source, Json(metadata or {})),
        ).fetchone()
        conn.execute("UPDATE ai_chats SET updated_at = NOW() WHERE id = %s AND deleted_at IS NULL", (chat_id,))
        conn.commit()
    return normalize_record(message) or {}


def answer_workspace_chat(user: dict[str, Any], workspace_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    require_workspace_access(user, workspace_id)
    question = str(payload.get("question") or "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question is required.")

    session = ensure_workspace_session(user, workspace_id)
    dataset_id = payload.get("dataset_id") or session.get("active_dataset_id")
    if dataset_id is not None:
        require_dataset_in_workspace(workspace_id, int(dataset_id))
        dataset_id = int(dataset_id)

    chat = _ensure_chat(user, workspace_id, dataset_id, payload.get("chat_id"), question)
    user_message = _insert_chat_message(
        workspace_id=workspace_id,
        chat_id=int(chat["id"]),
        dataset_id=dataset_id,
        user_id=user["id"],
        role="user",
        content=question,
        metadata={"context": payload.get("context") if isinstance(payload.get("context"), dict) else {}},
    )
    result = dataset_insights(
        "chat",
        rows=payload.get("rows") if isinstance(payload.get("rows"), list) else [],
        columns=payload.get("columns") if isinstance(payload.get("columns"), list) else [],
        question=question,
        context={
            "chat_id": chat["id"],
            "client_context": payload.get("context") if isinstance(payload.get("context"), dict) else {},
        },
        workspace_id=workspace_id,
        dataset_id=dataset_id,
    )
    assistant_message = _insert_chat_message(
        workspace_id=workspace_id,
        chat_id=int(chat["id"]),
        dataset_id=dataset_id,
        user_id=None,
        role="assistant",
        content=result["answer"],
        source=result["source"],
        metadata={"profile": result.get("profile") or {}},
    )
    update_workspace_session(
        user,
        workspace_id,
        {
            "active_dataset_id": dataset_id,
            "active_chat_id": chat["id"],
            "active_page": payload.get("active_page") or "Chat",
        },
    )
    return {
        "success": True,
        "answer": result["answer"],
        "source": result["source"],
        "chat": chat,
        "messages": [user_message, assistant_message],
        "tokens_estimated": result.get("tokens_estimated") or 0,
    }


def workspace_dataset_insight(user: dict[str, Any], workspace_id: int, dataset_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    require_workspace_access(user, workspace_id)
    require_dataset_in_workspace(workspace_id, dataset_id)
    result = dataset_insights(
        mode=str(payload.get("mode") or "overview"),
        rows=payload.get("rows") if isinstance(payload.get("rows"), list) else [],
        columns=payload.get("columns") if isinstance(payload.get("columns"), list) else [],
        question=str(payload.get("question") or ""),
        context=payload.get("context") if isinstance(payload.get("context"), dict) else {},
        workspace_id=workspace_id,
        dataset_id=dataset_id,
    )
    update_workspace_session(
        user,
        workspace_id,
        {
            "active_dataset_id": dataset_id,
            "active_page": payload.get("active_page") or "AI",
        },
    )
    return {"success": True, **result}
