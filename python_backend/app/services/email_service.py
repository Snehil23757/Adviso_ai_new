from __future__ import annotations

import json
import logging
import threading
from typing import Any
from urllib import request as urlrequest
from urllib.error import HTTPError, URLError

from psycopg.types.json import Json

from app.config import get_settings
from app.database import get_db, normalize_record, now_utc
from app.services.email_templates import render_email_template


logger = logging.getLogger("adviso-ai.email")
RESEND_SEND_ENDPOINT = "https://api.resend.com/emails"
AUTH_CRITICAL_TEMPLATES = {
    "welcome",
    "registration_success",
    "trial_started",
    "password_reset",
    "email_verification",
}


def _app_url(path: str = "") -> str:
    base = get_settings().app_public_url.rstrip("/") or "https://adviso.ai"
    return f"{base}/{path.lstrip('/')}" if path else base


def _audit_email_event(user_id: int | None, action: str, target_id: str, metadata: dict[str, Any] | None = None) -> None:
    try:
        with get_db() as conn:
            conn.execute(
                """
                INSERT INTO audit_logs (actor_user_id, action, target_type, target_id, metadata_json, event_type)
                VALUES (%s, %s, 'email_event', %s, %s, 'email')
                """,
                (user_id, action, target_id, Json(metadata or {})),
            )
            conn.commit()
    except Exception:
        logger.debug("Email audit logging failed.", exc_info=True)


def create_email_event(
    *,
    user_id: int | None,
    workspace_id: int | None,
    email: str,
    template: str,
    subject: str,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    with get_db() as conn:
        row = conn.execute(
            """
            INSERT INTO email_events (user_id, workspace_id, email, template, subject, metadata_json)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (user_id, workspace_id, email, template, subject, Json(metadata or {})),
        ).fetchone()
        conn.commit()
    event = normalize_record(row) or {}
    _audit_email_event(user_id, "email.queued", str(event.get("id") or ""), {"template": template, "email": email})
    return event


def _update_email_event(event_id: int, **fields: Any) -> dict[str, Any]:
    if not fields:
        return {}
    assignments = ", ".join(f"{key} = %s" for key in fields)
    values = list(fields.values())
    with get_db() as conn:
        row = conn.execute(
            f"""
            UPDATE email_events
            SET {assignments}, updated_at = NOW()
            WHERE id = %s
            RETURNING *
            """,
            (*values, event_id),
        ).fetchone()
        conn.commit()
    return normalize_record(row) or {}


def _send_with_resend(event: dict[str, Any], rendered: Any) -> dict[str, Any]:
    settings = get_settings()
    if not settings.resend_api_key.strip():
        raise RuntimeError("RESEND_API_KEY is not configured.")

    payload = {
        "from": rendered.from_address,
        "to": [event["email"]],
        "subject": rendered.subject,
        "html": rendered.html,
        "text": rendered.text,
        "reply_to": [settings.email_reply_to or "support@adviso.ai"],
    }
    body = json.dumps(payload).encode("utf-8")
    request = urlrequest.Request(
        RESEND_SEND_ENDPOINT,
        method="POST",
        data=body,
        headers={
            "Authorization": f"Bearer {settings.resend_api_key}",
            "Content-Type": "application/json",
            "User-Agent": "AdvisoAI/1.0 (+https://adviso.ai)",
            "Idempotency-Key": f"email-event-{event['id']}",
        },
    )
    try:
        with urlrequest.urlopen(request, timeout=20) as response:
            response_body = response.read().decode("utf-8") or "{}"
            return json.loads(response_body)
    except HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Resend email send failed with HTTP {exc.code}: {error_body}") from exc
    except (URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"Resend email send failed: {exc}") from exc


def send_email_event(event_id: int) -> dict[str, Any]:
    with get_db() as conn:
        row = conn.execute("SELECT * FROM email_events WHERE id = %s", (event_id,)).fetchone()
    if not row:
        raise RuntimeError(f"Email event {event_id} was not found.")

    event = normalize_record(row) or {}
    if event.get("status") == "sent":
        return event

    metadata = event.get("metadata_json") if isinstance(event.get("metadata_json"), dict) else {}
    rendered = render_email_template(str(event["template"]), metadata)
    _update_email_event(event_id, status="sending", attempts=int(event.get("attempts") or 0) + 1, error="")

    try:
        provider_response = _send_with_resend(event, rendered)
        sent = _update_email_event(
            event_id,
            status="sent",
            subject=rendered.subject,
            provider_message_id=str(provider_response.get("id") or ""),
            error="",
            sent_at=now_utc(),
        )
        if event.get("template") == "welcome" and event.get("user_id"):
            with get_db() as conn:
                conn.execute(
                    """
                    UPDATE users
                    SET welcome_email_sent_at = COALESCE(welcome_email_sent_at, NOW()),
                        profile_metadata_json = profile_metadata_json || %s::jsonb,
                        updated_at = NOW()
                    WHERE id = %s
                    """,
                    (json.dumps({"welcome_email_sent_at": now_utc().isoformat()}), event["user_id"]),
                )
                conn.commit()
        _audit_email_event(event.get("user_id"), "email.sent", str(event_id), {"template": event["template"]})
        return sent
    except Exception as exc:
        failed = _update_email_event(event_id, status="failed", error=str(exc)[:1000])
        _audit_email_event(event.get("user_id"), "email.failed", str(event_id), {"template": event["template"], "error": str(exc)[:300]})
        raise RuntimeError(str(exc)) from exc


def _send_email_event_in_thread(event_id: int, reason: str) -> None:
    def runner() -> None:
        try:
            send_email_event(int(event_id))
        except Exception:
            logger.warning("Background email send failed for event_id=%s reason=%s", event_id, reason, exc_info=True)

    thread = threading.Thread(target=runner, daemon=True, name=f"email-event-{event_id}")
    thread.start()


def enqueue_email_event(event_id: int, *, prefer_background_send: bool = False) -> bool:
    if prefer_background_send:
        _send_email_event_in_thread(event_id, "auth-critical")
        return False

    try:
        from app.celery_app import celery_app

        celery_app.send_task("adviso.send_transactional_email", args=[int(event_id)], queue="email")
        return True
    except Exception as exc:
        logger.warning("Email queue unavailable; sending event %s in a fallback thread: %s", event_id, exc)
        _send_email_event_in_thread(event_id, "celery-unavailable")
        return False


def queue_transactional_email(
    *,
    template: str,
    email: str,
    user_id: int | None = None,
    workspace_id: int | None = None,
    metadata: dict[str, Any] | None = None,
    prefer_background_send: bool | None = None,
) -> dict[str, Any]:
    rendered = render_email_template(template, metadata or {})
    event = create_email_event(
        user_id=user_id,
        workspace_id=workspace_id,
        email=email,
        template=template,
        subject=rendered.subject,
        metadata=metadata or {},
    )
    send_without_celery = template in AUTH_CRITICAL_TEMPLATES if prefer_background_send is None else prefer_background_send
    queued_to_celery = enqueue_email_event(int(event["id"]), prefer_background_send=send_without_celery)
    return {
        **event,
        "queued_to_celery": queued_to_celery,
        "delivery_mode": "celery" if queued_to_celery else "background",
    }


def queue_welcome_email_for_user(user: dict[str, Any], workspace_id: int | None = None) -> dict[str, Any] | None:
    email = str(user.get("email") or "").strip().lower()
    if not email:
        return None

    with get_db() as conn:
        existing_event = conn.execute(
            """
            SELECT id, status
            FROM email_events
            WHERE user_id = %s
              AND template = 'welcome'
              AND status IN ('queued', 'sending', 'sent')
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (user["id"],),
        ).fetchone()
        if existing_event:
            status = str(existing_event["status"] or "")
            if status == "sent":
                conn.execute(
                    """
                    UPDATE users
                    SET welcome_email_sent_at = COALESCE(welcome_email_sent_at, NOW()),
                        updated_at = NOW()
                    WHERE id = %s
                    """,
                    (user["id"],),
                )
                conn.commit()
            logger.info(
                "Welcome email already %s for user_id=%s email=%s event_id=%s",
                status,
                user.get("id"),
                email,
                existing_event["id"],
            )
            return None

        row = conn.execute(
            """
            UPDATE users
            SET welcome_email_queued_at = NOW(),
                profile_metadata_json = profile_metadata_json || %s::jsonb,
                updated_at = NOW()
            WHERE id = %s AND welcome_email_sent_at IS NULL
            RETURNING *
            """,
            (
                json.dumps(
                    {
                        "email_verified": bool(user.get("email_verified")),
                        "onboarding_completed": bool(user.get("onboarding_completed")),
                        "welcome_email_queued_at": now_utc().isoformat(),
                    }
                ),
                user["id"],
            ),
        ).fetchone()
        conn.commit()
    queued_user = normalize_record(row)
    if not queued_user:
        logger.info("Welcome email already sent for user_id=%s email=%s", user.get("id"), email)
        return None

    event = queue_transactional_email(
        template="welcome",
        email=email,
        user_id=int(user["id"]),
        workspace_id=workspace_id,
        metadata={
            "full_name": user.get("full_name") or "there",
            "plan_name": "Free Workspace",
            "launch_url": _app_url("login"),
            "upgrade_url": _app_url("pricing"),
        },
    )
    logger.info("Welcome email queued for user_id=%s email=%s event_id=%s", user.get("id"), email, event.get("id"))
    return event


def queue_admin_registration_notification(user: dict[str, Any], workspace_id: int | None = None) -> dict[str, Any] | None:
    email = get_settings().admin_notification_email.strip().lower() or "support@adviso.in"
    user_id = int(user["id"]) if user.get("id") is not None else None
    if user_id is None:
        return None

    with get_db() as conn:
        existing = conn.execute(
            """
            SELECT id
            FROM email_events
            WHERE user_id = %s AND template = 'new_registration_admin'
            LIMIT 1
            """,
            (user_id,),
        ).fetchone()
    if existing:
        logger.info("Admin registration notification already queued for user_id=%s", user_id)
        return None

    event = queue_transactional_email(
        template="new_registration_admin",
        email=email,
        user_id=user_id,
        workspace_id=workspace_id,
        metadata={
            "full_name": user.get("full_name") or "Unknown user",
            "email": user.get("email") or "",
            "auth_provider": user.get("auth_provider") or "password",
            "firebase_uid": user.get("firebase_uid") or "",
            "registration_time": user.get("created_at") or now_utc().isoformat(),
            "profile_picture": user.get("profile_picture") or "",
        },
    )
    logger.info("Admin registration notification queued for user_id=%s event_id=%s", user_id, event.get("id"))
    return event


def queue_registration_emails_for_user(user: dict[str, Any], workspace_id: int | None = None) -> dict[str, Any]:
    welcome_event = queue_welcome_email_for_user(user, workspace_id)
    admin_event = queue_admin_registration_notification(user, workspace_id)
    return {
        "welcome": welcome_event,
        "admin_notification": admin_event,
    }


def queue_password_reset_email(email: str, reset_url: str) -> dict[str, Any]:
    return queue_transactional_email(
        template="password_reset",
        email=email,
        user_id=None,
        workspace_id=None,
        metadata={"reset_url": reset_url, "launch_url": _app_url("login")},
    )


def queue_email_verification_email(user: dict[str, Any], verification_url: str) -> dict[str, Any]:
    return queue_transactional_email(
        template="email_verification",
        email=str(user.get("email") or "").strip().lower(),
        user_id=int(user["id"]) if user.get("id") is not None else None,
        workspace_id=None,
        metadata={
            "full_name": user.get("full_name") or "there",
            "verification_url": verification_url,
            "launch_url": _app_url("login"),
        },
    )
