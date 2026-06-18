from __future__ import annotations

from typing import Any

from psycopg.types.json import Json

from app.database import get_db, normalize_record
from app.tenant import store_audit_event


ALLOWED_FEATURE_LABELS = {
    "Overview",
    "Visual Analytics",
    "AI Insights",
    "Data Chat",
    "Ideas",
    "Profit",
    "Forecast",
    "Budget",
    "ESG",
    "Other",
}


def clean_features(features: list[str]) -> list[str]:
    cleaned: list[str] = []
    for feature in features[:20]:
        label = str(feature or "").strip()[:80]
        if label and label in ALLOWED_FEATURE_LABELS and label not in cleaned:
            cleaned.append(label)
    return cleaned


def create_feedback_submission(
    *,
    user: dict[str, Any],
    payload: dict[str, Any],
    user_agent: str = "",
    request_id: str = "",
) -> dict[str, Any]:
    workspace_id = payload.get("workspace_id")
    features_used = clean_features(payload.get("features_used") or [])
    metadata = payload.get("metadata") if isinstance(payload.get("metadata"), dict) else {}

    with get_db() as conn:
        row = conn.execute(
            """
            INSERT INTO feedback_submissions (
                user_id, workspace_id, email, satisfaction_score, likes_text,
                insight_ease_score, insight_accuracy_score, features_used_json,
                improvement_text, additional_feedback, active_page, user_agent,
                metadata_json
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                user.get("id"),
                workspace_id,
                user.get("email") or "",
                payload["satisfaction_score"],
                payload["likes_text"].strip(),
                payload["insight_ease_score"],
                payload["insight_accuracy_score"],
                Json(features_used),
                (payload.get("improvement_text") or "").strip(),
                (payload.get("additional_feedback") or "").strip(),
                (payload.get("active_page") or "").strip(),
                user_agent[:500],
                Json(metadata),
            ),
        ).fetchone()
        conn.commit()

    feedback = normalize_record(row) or {}
    store_audit_event(
        int(workspace_id) if workspace_id else None,
        int(user["id"]) if user.get("id") else None,
        "feedback.submitted",
        "feedback",
        str(feedback.get("id") or ""),
        {
            "satisfaction_score": payload["satisfaction_score"],
            "insight_ease_score": payload["insight_ease_score"],
            "insight_accuracy_score": payload["insight_accuracy_score"],
            "features_used": features_used,
            "active_page": payload.get("active_page") or "",
        },
        event_type="feedback",
        user_agent=user_agent,
        request_id=request_id,
    )
    return feedback
