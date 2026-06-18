from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Callable, Awaitable

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from psycopg.types.json import Json

from app.auth import bearer_token_from_request, verify_firebase_claims
from app.database import get_db, normalize_record
from app.saas import upsert_user_from_claims


WORKSPACE_ROUTE_RE = re.compile(r"^/api/workspaces/(?P<workspace_id>\d+)(?:/|$)")
DATASET_ROUTE_PATTERNS = (
    re.compile(r"/datasets/(?P<dataset_id>\d+)(?:/|$)"),
    re.compile(r"/uploads/(?P<dataset_id>\d+)/complete(?:/|$)"),
)


@dataclass
class WorkspaceScope:
    user: dict[str, Any]
    workspace: dict[str, Any]
    dataset: dict[str, Any] | None = None


def require_workspace_membership(user_id: int, workspace_id: int, allowed_roles: set[str] | None = None) -> dict[str, Any]:
    with get_db() as conn:
        workspace = conn.execute(
            """
            SELECT w.*, wm.role AS member_role
            FROM workspaces w
            JOIN workspace_members wm ON wm.workspace_id = w.id
            WHERE w.id = %s AND wm.user_id = %s AND wm.status = 'active'
              AND w.deleted_at IS NULL
            LIMIT 1
            """,
            (workspace_id, user_id),
        ).fetchone()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found.")
    role = workspace.get("member_role") or "member"
    if allowed_roles and role not in allowed_roles:
        raise HTTPException(status_code=403, detail="You do not have access to perform this workspace action.")
    return normalize_record(workspace) or {}


def require_dataset_in_workspace(workspace_id: int, dataset_id: int) -> dict[str, Any]:
    with get_db() as conn:
        dataset = conn.execute(
            "SELECT * FROM datasets WHERE workspace_id = %s AND id = %s AND deleted_at IS NULL",
            (workspace_id, dataset_id),
        ).fetchone()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found in this workspace.")
    return normalize_record(dataset) or {}


def store_audit_event(
    workspace_id: int | None,
    user_id: int | None,
    action: str,
    target_type: str = "",
    target_id: str = "",
    metadata: dict[str, Any] | None = None,
    event_type: str = "",
    ip_address: str = "",
    user_agent: str = "",
    request_id: str = "",
) -> None:
    try:
        with get_db() as conn:
            conn.execute(
                """
                INSERT INTO audit_logs (
                    workspace_id, actor_user_id, action, target_type, target_id,
                    metadata_json, event_type, ip_address, user_agent, request_id
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    workspace_id,
                    user_id,
                    action,
                    target_type,
                    target_id,
                    Json(metadata or {}),
                    event_type or action.split(".")[0],
                    ip_address,
                    user_agent,
                    request_id,
                ),
            )
            conn.commit()
    except Exception:
        return


def _dataset_id_from_path(path: str) -> int | None:
    for pattern in DATASET_ROUTE_PATTERNS:
        match = pattern.search(path)
        if match:
            return int(match.group("dataset_id"))
    return None


async def workspace_isolation_middleware(request: Request, call_next: Callable[[Request], Awaitable[Any]]) -> Any:
    if request.method.upper() == "OPTIONS":
        return await call_next(request)

    match = WORKSPACE_ROUTE_RE.match(request.url.path)
    if not match:
        return await call_next(request)

    workspace_id = int(match.group("workspace_id"))
    try:
        token = bearer_token_from_request(request)
        claims = verify_firebase_claims(token)
        user = upsert_user_from_claims(claims)
        workspace = require_workspace_membership(int(user["id"]), workspace_id)
        dataset_id = _dataset_id_from_path(request.url.path)
        dataset = require_dataset_in_workspace(workspace_id, dataset_id) if dataset_id else None

        request.state.firebase_claims = claims
        request.state.current_user = user
        request.state.workspace_scope = WorkspaceScope(user=user, workspace=workspace, dataset=dataset)
        request.state.workspace_id = workspace_id
        request.state.workspace = workspace
        if dataset:
            request.state.dataset = dataset
    except HTTPException as exc:
        return JSONResponse(
            status_code=exc.status_code,
            content={"success": False, "error": exc.detail, "detail": exc.detail},
        )
    except Exception:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Workspace isolation check failed."},
        )

    return await call_next(request)
