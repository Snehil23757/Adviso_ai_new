from datetime import timedelta
import logging
from typing import Any

from fastapi import Depends, HTTPException, Request
from psycopg.types.json import Json

from app.auth import get_firebase_claims
from app.database import get_db, normalize_record, normalize_row, now_utc
from app.services.email_validation import validate_registration_email


logger = logging.getLogger("adviso-ai.saas")
OWNER_EMAILS = {"syyash14@gmail.com"}
PAID_PLAN_IDS = {"go", "pro", "enterprise"}


FEATURE_TO_TABS: dict[str, list[str]] = {
    "upload.csv": ["Overview"],
    "charts.visualize": ["Charts"],
    "ai.insights": ["AI"],
    "ai.chat": ["Chat"],
    "ideas.generate": ["Ideas"],
    "profit.analyze": ["Profit"],
    "forecast.run": ["Forecast"],
    "budget.plan": ["Budget"],
    "esg.analyze": ["Sustainability"],
    "competitor.analyze": ["Competitor"],
    "kpi.monitor": ["KPI"],
}

TAB_TO_ROUTE: dict[str, str] = {
    "Overview": "dashboard.tab.Overview",
    "Charts": "dashboard.tab.Charts",
    "AI": "dashboard.tab.AI",
    "Chat": "dashboard.tab.Chat",
    "Ideas": "dashboard.tab.Ideas",
    "Profit": "dashboard.tab.Profit",
    "Forecast": "dashboard.tab.Forecast",
    "Budget": "dashboard.tab.Budget",
    "Sustainability": "dashboard.tab.Sustainability",
    "Competitor": "dashboard.tab.Competitor",
    "KPI": "dashboard.tab.KPI",
}

MODE_TO_FEATURE: dict[str, str] = {
    "overview": "ai.insights",
    "report": "ai.insights",
    "ideas": "ideas.generate",
    "profit": "profit.analyze",
    "forecast": "forecast.run",
    "budget": "budget.plan",
    "sustainability": "esg.analyze",
    "competitor": "competitor.analyze",
    "kpi": "kpi.monitor",
    "chat": "ai.chat",
}


def normalize_email(value: Any) -> str:
    return str(value or "").strip().lower()


def is_owner_email(email: Any) -> bool:
    return normalize_email(email) in OWNER_EMAILS


def is_owner_user(user: dict[str, Any]) -> bool:
    return is_owner_email(user.get("email"))


def provider_from_claims(claims: dict[str, Any]) -> str:
    firebase = claims.get("firebase") or {}
    providers = firebase.get("identities") or {}
    if "google.com" in providers:
        return "google"
    return "password"


def upsert_user_from_claims(claims: dict[str, Any]) -> dict[str, Any]:
    firebase_uid = claims.get("uid") or claims.get("sub")
    if not firebase_uid:
        raise HTTPException(status_code=401, detail="Authentication token is missing a user identifier.")

    email = claims.get("email") or ""
    full_name = claims.get("name") or ""
    picture = claims.get("picture") or ""
    provider = provider_from_claims(claims)
    email_verified = bool(claims.get("email_verified"))
    validation = validate_registration_email(email)
    clean_email = validation.get("email") or email
    owner_access = is_owner_email(clean_email)

    with get_db() as conn:
        existing = conn.execute("SELECT id, email FROM users WHERE firebase_uid = %s", (firebase_uid,)).fetchone()
        is_new_user = existing is None
        if is_new_user and not validation.get("valid"):
            raise HTTPException(status_code=400, detail=validation.get("message") or "Please use a valid permanent email address.")
        if existing and email and str(existing.get("email") or "").lower() != str(email).lower() and not validation.get("valid"):
            raise HTTPException(status_code=400, detail=validation.get("message") or "Please use a valid permanent email address.")

        profile_metadata = {
            "email_verified": email_verified,
            "email_validation": validation,
        }
        if is_new_user:
            profile_metadata["onboarding_completed"] = False
            profile_metadata["registration_detected_at"] = now_utc().isoformat()
        row = conn.execute(
            """
            INSERT INTO users (
                firebase_uid, email, full_name, profile_picture, auth_provider,
                plan_id, is_admin, email_verified, onboarding_completed, trial_started_at,
                trial_start_date, trial_end_date, trial_active, plan_type, subscription_status,
                profile_metadata_json, login_count, last_login, updated_at
            )
            VALUES (
                %s, %s, %s, %s, %s, 'free', %s, %s, FALSE, NULL,
                NULL, NULL, FALSE, 'free', 'active',
                %s, 1, NOW(), NOW()
            )
            ON CONFLICT (firebase_uid) DO UPDATE SET
                email = EXCLUDED.email,
                full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), users.full_name),
                profile_picture = COALESCE(NULLIF(EXCLUDED.profile_picture, ''), users.profile_picture),
                auth_provider = EXCLUDED.auth_provider,
                is_admin = CASE WHEN EXCLUDED.is_admin THEN TRUE ELSE users.is_admin END,
                email_verified = EXCLUDED.email_verified,
                profile_metadata_json = users.profile_metadata_json || EXCLUDED.profile_metadata_json,
                login_count = users.login_count + 1,
                last_login = NOW(),
                updated_at = NOW()
            RETURNING *
            """,
            (firebase_uid, clean_email, full_name, picture, provider, owner_access, email_verified, Json(profile_metadata)),
        ).fetchone()

        row = conn.execute(
            """
            UPDATE users
            SET trial_active = FALSE,
                plan_type = CASE WHEN plan_id <> 'free' THEN 'premium' ELSE 'free' END,
                subscription_status = COALESCE(NULLIF(subscription_status, ''), 'active'),
                is_admin = CASE WHEN %s THEN TRUE ELSE is_admin END,
                updated_at = NOW()
            WHERE id = %s
            RETURNING *
            """,
            (owner_access, row["id"]),
        ).fetchone()

        conn.execute(
            """
            INSERT INTO subscriptions (user_id, plan_id, status, start_date, auto_renew)
            SELECT %s, 'free', 'active', NOW(), FALSE
            WHERE NOT EXISTS (
                SELECT 1 FROM subscriptions WHERE user_id = %s AND status = 'active'
            )
            """,
            (row["id"], row["id"]),
        )
        conn.commit()
        user = normalize_record(row) or {}

    if is_new_user:
        try:
            from app.services.email_service import queue_registration_emails_for_user

            queue_registration_emails_for_user(user)
        except Exception:
            logger.warning("Registration email queue failed for user_id=%s email=%s", user.get("id"), user.get("email"), exc_info=True)

    return user


def get_current_user(request: Request, claims: dict[str, Any] = Depends(get_firebase_claims)) -> dict[str, Any]:
    cached = getattr(request.state, "current_user", None)
    if isinstance(cached, dict):
        return cached
    try:
        return upsert_user_from_claims(claims)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail="Application database is not configured.") from exc


def get_plan(plan_id: str) -> dict[str, Any]:
    with get_db() as conn:
        row = conn.execute("SELECT * FROM plans WHERE id = %s", (plan_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=500, detail=f"Plan {plan_id} is not configured.")
    return normalize_record(row) or {}


def get_features_for_plan(plan_id: str) -> dict[str, bool]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT feature_name, enabled FROM feature_access WHERE plan_id = %s",
            (plan_id,),
        ).fetchall()
    return {row["feature_name"]: bool(row["enabled"]) for row in rows}


def build_permissions(plan_id: str) -> dict[str, Any]:
    features = get_features_for_plan(plan_id)
    tabs: list[str] = []
    for feature, enabled in features.items():
        if not enabled:
            continue
        for tab in FEATURE_TO_TABS.get(feature, []):
            if tab not in tabs:
                tabs.append(tab)
    routes = ["dashboard", *[TAB_TO_ROUTE[tab] for tab in tabs if tab in TAB_TO_ROUTE]]
    return {
        "features": features,
        "tabs": tabs,
        "routes": routes,
    }


def current_subscription_for_user(user_id: int) -> dict[str, Any] | None:
    with get_db() as conn:
        conn.execute(
            """
            UPDATE subscriptions
            SET status = 'expired'
            WHERE user_id = %s
              AND status = 'active'
              AND end_date IS NOT NULL
              AND end_date <= NOW()
            """,
            (user_id,),
        )
        row = conn.execute(
            """
            SELECT s.*, p.name AS plan_name, p.monthly_price, p.yearly_price, p.description AS plan_description
            FROM subscriptions s
            JOIN plans p ON p.id = s.plan_id
            WHERE s.user_id = %s
              AND s.status = 'active'
              AND (s.end_date IS NULL OR s.end_date > NOW())
            ORDER BY s.created_at DESC
            LIMIT 1
            """,
            (user_id,),
        ).fetchone()
        if not row:
            conn.execute(
                """
                UPDATE users
                SET plan_id = 'free', updated_at = NOW()
                WHERE id = %s AND plan_id <> 'free'
                """,
                (user_id,),
            )
        conn.commit()
    return normalize_record(row)


def current_trial_for_user(user_id: int) -> dict[str, Any]:
    return {
        "active": False,
        "expired": False,
        "status": "paused",
        "start_date": None,
        "end_date": None,
        "days_remaining": 0,
        "seconds_remaining": 0,
        "warning_level": "none",
        "trial_days": 0,
    }


def access_plan_for_user(user: dict[str, Any]) -> dict[str, Any]:
    if is_owner_user(user):
        return {
            "subscription": current_subscription_for_user(int(user["id"])),
            "trial": current_trial_for_user(int(user["id"])),
            "paid_active": False,
            "owner_access": True,
            "effective_plan_id": "enterprise",
            "access_allowed": True,
            "access_level": "full",
            "trial_expired": False,
        }

    subscription = current_subscription_for_user(int(user["id"]))
    paid_plan_id = str((subscription or {}).get("plan_id") or "")
    paid_active = bool(subscription and paid_plan_id in PAID_PLAN_IDS)
    trial = current_trial_for_user(int(user["id"]))

    if paid_active:
        return {
            "subscription": subscription,
            "trial": trial,
            "paid_active": True,
            "owner_access": False,
            "effective_plan_id": paid_plan_id,
            "access_allowed": True,
            "access_level": "paid",
            "trial_expired": False,
        }

    return {
        "subscription": subscription,
        "trial": trial,
        "paid_active": False,
        "owner_access": False,
        "effective_plan_id": "free",
        "access_allowed": True,
        "access_level": "free",
        "trial_expired": False,
    }


def session_payload(user: dict[str, Any]) -> dict[str, Any]:
    access = access_plan_for_user(user)
    subscription = access["subscription"]
    plan_id = access["effective_plan_id"] if access.get("owner_access") else (subscription or {}).get("plan_id") or "free"
    plan = get_plan(plan_id)
    permissions = build_permissions(access["effective_plan_id"])
    return {
        "success": True,
        "user": normalize_row(user),
        "access_level": access.get("access_level", "free"),
        "subscription": {
            "plan_id": plan_id,
            "plan": plan,
            "status": (subscription or {}).get("status", "active"),
            "start_date": (subscription or {}).get("start_date"),
            "end_date": (subscription or {}).get("end_date"),
            "auto_renew": (subscription or {}).get("auto_renew", False),
            "credits_remaining": 0 if plan_id == "free" else None,
            "plan_type": "owner" if access.get("owner_access") else "premium" if access["paid_active"] else "free",
            "subscription_status": "active",
            "trial": access["trial"],
            "trial_expired": access["trial_expired"],
            "effective_plan_id": access["effective_plan_id"],
            "access_level": access.get("access_level", "free"),
        },
        "permissions": permissions,
    }


def ensure_account_preferences(user_id: int) -> dict[str, Any]:
    with get_db() as conn:
        row = conn.execute(
            """
            INSERT INTO account_preferences (user_id)
            VALUES (%s)
            ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
            RETURNING *
            """,
            (user_id,),
        ).fetchone()
        conn.commit()
    return normalize_record(row) or {}


def update_account_preferences(user_id: int, updates: dict[str, Any]) -> dict[str, Any]:
    allowed_fields = {
        "theme",
        "language",
        "timezone",
        "email_notifications",
        "product_updates",
        "security_alerts",
    }
    clean_updates = {key: value for key, value in updates.items() if key in allowed_fields and value is not None}
    ensure_account_preferences(user_id)
    if not clean_updates:
        return ensure_account_preferences(user_id)

    assignments = ", ".join(f"{key} = %s" for key in clean_updates)
    values = list(clean_updates.values())
    with get_db() as conn:
        row = conn.execute(
            f"""
            UPDATE account_preferences
            SET {assignments}, updated_at = NOW()
            WHERE user_id = %s
            RETURNING *
            """,
            (*values, user_id),
        ).fetchone()
        conn.commit()
    return normalize_record(row) or {}


PAYMENT_METHODS = {"razorpay_checkout", "upi", "card"}


def ensure_payment_preference(user: dict[str, Any]) -> dict[str, Any]:
    user_id = int(user["id"])
    billing_name = user.get("full_name") or ""
    billing_email = user.get("email") or ""

    with get_db() as conn:
        row = conn.execute(
            """
            INSERT INTO payment_preferences (user_id, preferred_method, billing_name, billing_email)
            VALUES (%s, 'razorpay_checkout', %s, %s)
            ON CONFLICT (user_id) DO UPDATE SET
                billing_name = COALESCE(NULLIF(payment_preferences.billing_name, ''), EXCLUDED.billing_name),
                billing_email = COALESCE(NULLIF(payment_preferences.billing_email, ''), EXCLUDED.billing_email)
            RETURNING *
            """,
            (user_id, billing_name, billing_email),
        ).fetchone()
        conn.commit()
    return normalize_record(row) or {}


def update_payment_preference(user: dict[str, Any], updates: dict[str, Any]) -> dict[str, Any]:
    allowed_fields = {
        "preferred_method",
        "upi_id",
        "billing_name",
        "billing_email",
        "billing_phone",
        "notes",
    }
    clean_updates: dict[str, Any] = {}
    for key, value in updates.items():
        if key not in allowed_fields or value is None:
            continue
        clean_updates[key] = value.strip() if isinstance(value, str) else value

    preferred_method = clean_updates.get("preferred_method")
    if preferred_method:
        normalized_method = str(preferred_method).lower()
        if normalized_method not in PAYMENT_METHODS:
            raise HTTPException(status_code=400, detail="Unsupported payment preference.")
        clean_updates["preferred_method"] = normalized_method

    ensure_payment_preference(user)
    if not clean_updates:
        return ensure_payment_preference(user)

    assignments = ", ".join(f"{key} = %s" for key in clean_updates)
    values = list(clean_updates.values())
    with get_db() as conn:
        row = conn.execute(
            f"""
            UPDATE payment_preferences
            SET {assignments}, updated_at = NOW()
            WHERE user_id = %s
            RETURNING *
            """,
            (*values, user["id"]),
        ).fetchone()
        conn.commit()
    return normalize_record(row) or {}


def account_settings_payload(user: dict[str, Any]) -> dict[str, Any]:
    access = access_plan_for_user(user)
    subscription = access["subscription"]
    plan_id = access["effective_plan_id"] if access.get("owner_access") else (subscription or {}).get("plan_id") or "free"
    plan = get_plan(plan_id)
    permissions = build_permissions(access["effective_plan_id"])
    preferences = ensure_account_preferences(user["id"])
    payment_preference = ensure_payment_preference(user)

    with get_db() as conn:
        payments = conn.execute(
            """
            SELECT id, plan_id, amount, currency, payment_status, razorpay_order_id,
                   razorpay_payment_id, created_at
            FROM payments
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT 12
            """,
            (user["id"],),
        ).fetchall()
        usage = conn.execute(
            """
            SELECT id, endpoint, tokens_used, request_type, created_at
            FROM usage_logs
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT 12
            """,
            (user["id"],),
        ).fetchall()

    return {
        "success": True,
        "user": normalize_row(user),
        "access_level": access.get("access_level", "free"),
        "subscription": {
            "plan_id": plan_id,
            "status": (subscription or {}).get("status", "active"),
            "start_date": (subscription or {}).get("start_date"),
            "end_date": (subscription or {}).get("end_date"),
            "auto_renew": (subscription or {}).get("auto_renew", False),
            "razorpay_order_id": (subscription or {}).get("razorpay_order_id"),
            "razorpay_payment_id": (subscription or {}).get("razorpay_payment_id"),
            "plan_type": "owner" if access.get("owner_access") else "premium" if access["paid_active"] else "free",
            "subscription_status": "active",
            "trial": access["trial"],
            "trial_expired": access["trial_expired"],
            "effective_plan_id": access["effective_plan_id"],
            "access_level": access.get("access_level", "free"),
        },
        "plan": plan,
        "permissions": permissions,
        "preferences": preferences,
        "payment_preference": payment_preference,
        "payments": normalize_row(payments),
        "usage": normalize_row(usage),
        "activity": {
            "last_login": user.get("last_login"),
            "login_count": user.get("login_count") or 0,
            "created_at": user.get("created_at"),
            "auth_provider": user.get("auth_provider") or "password",
            "active_sessions": 1,
        },
    }


def ensure_feature_access(user: dict[str, Any], feature_name: str) -> None:
    access = access_plan_for_user(user)
    features = get_features_for_plan(access["effective_plan_id"])
    if not features.get(feature_name):
        raise HTTPException(
            status_code=402,
            detail={
                "message": "Upgrade required to unlock this Adviso AI module.",
                "upgrade_required": True,
                "feature_name": feature_name,
                "access_level": access.get("access_level", "free"),
            },
        )


def require_feature(feature_name: str):
    def dependency(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
        ensure_feature_access(user, feature_name)
        return user

    return dependency


def ensure_admin(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    if not user.get("is_admin") and not is_owner_user(user):
        raise HTTPException(status_code=403, detail="Admin access is required.")
    return user


def log_usage(user_id: int | None, endpoint: str, request_type: str, tokens_used: int = 0) -> None:
    try:
        with get_db() as conn:
            conn.execute(
                """
                INSERT INTO usage_logs (user_id, endpoint, tokens_used, request_type)
                VALUES (%s, %s, %s, %s)
                """,
                (user_id, endpoint, tokens_used, request_type),
            )
            conn.commit()
    except Exception:
        return


SUCCESS_PAYMENT_STATUSES = {"success", "paid"}
TERMINAL_PAYMENT_STATUSES = SUCCESS_PAYMENT_STATUSES | {
    "failed",
    "refunded",
    "mismatched",
    "amount_mismatch",
    "order_amount_mismatch",
    "order_owner_mismatch",
}

def public_payment_state(payment_status: str) -> str:
    normalized = (payment_status or "").lower()
    if normalized in SUCCESS_PAYMENT_STATUSES:
        return "success"
    if normalized in {"failed", "mismatched", "amount_mismatch", "order_amount_mismatch", "order_owner_mismatch"}:
        return "failed"
    if normalized == "refunded":
        return "refunded"
    if normalized in {"processing", "authorized", "captured", "verification_incomplete", "order_verification_incomplete"}:
        return "processing"
    return "pending"


def create_pending_payment(user_id: int, plan_id: str, order_id: str, amount: int, currency: str) -> None:
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO payments (
                user_id, plan_id, amount, currency, payment_status, razorpay_order_id,
                expires_at, updated_at
            )
            VALUES (%s, %s, %s, %s, 'pending', %s, NOW() + INTERVAL '30 minutes', NOW())
            ON CONFLICT (razorpay_order_id) DO UPDATE SET
                amount = EXCLUDED.amount,
                currency = EXCLUDED.currency,
                plan_id = EXCLUDED.plan_id,
                updated_at = NOW()
            """,
            (user_id, plan_id, amount, currency, order_id),
        )
        conn.commit()


def record_payment_webhook_event(
    *,
    event_id: str,
    event_name: str,
    payload: dict[str, Any],
    razorpay_order_id: str = "",
    razorpay_payment_id: str = "",
) -> tuple[dict[str, Any], bool]:
    with get_db() as conn:
        row = conn.execute(
            """
            INSERT INTO payment_webhook_events (
                event_id, event_name, razorpay_order_id, razorpay_payment_id, payload_json
            )
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (event_id) DO NOTHING
            RETURNING *
            """,
            (event_id, event_name, razorpay_order_id, razorpay_payment_id, Json(payload)),
        ).fetchone()
        if row:
            conn.commit()
            return normalize_record(row) or {}, True

        existing = conn.execute(
            "SELECT * FROM payment_webhook_events WHERE event_id = %s LIMIT 1",
            (event_id,),
        ).fetchone()
        conn.commit()
        return normalize_record(existing) or {}, False


def finish_payment_webhook_event(event_id: str, status: str, error: str = "") -> None:
    with get_db() as conn:
        conn.execute(
            """
            UPDATE payment_webhook_events
            SET status = %s,
                error = %s,
                processed_at = COALESCE(processed_at, NOW())
            WHERE event_id = %s
            """,
            (status, error[:1000], event_id),
        )
        conn.commit()


def get_pending_payment_for_razorpay_order(razorpay_order_id: str) -> dict[str, Any] | None:
    with get_db() as conn:
        row = conn.execute(
            """
            SELECT *
            FROM payments
            WHERE razorpay_order_id = %s
            LIMIT 1
            """,
            (razorpay_order_id,),
        ).fetchone()
    return normalize_record(row)


def mark_razorpay_payment_status(
    *,
    razorpay_order_id: str,
    razorpay_payment_id: str,
    payment_status: str,
    razorpay_signature: str = "",
) -> dict[str, Any] | None:
    with get_db() as conn:
        payment = conn.execute(
            """
            SELECT *
            FROM payments
            WHERE razorpay_order_id = %s
            LIMIT 1
            """,
            (razorpay_order_id,),
        ).fetchone()
        if not payment:
            return None

        if payment.get("payment_status") in SUCCESS_PAYMENT_STATUSES:
            return normalize_record(payment)

        row = conn.execute(
            """
            UPDATE payments
            SET payment_status = %s,
                razorpay_payment_id = COALESCE(NULLIF(%s, ''), razorpay_payment_id),
                razorpay_signature = COALESCE(NULLIF(%s, ''), razorpay_signature),
                updated_at = NOW()
            WHERE id = %s
            RETURNING *
            """,
            (payment_status, razorpay_payment_id, razorpay_signature, payment["id"]),
        ).fetchone()
        conn.commit()
    return normalize_record(row)


def activate_subscription_from_payment(
    user_id: int,
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
    razorpay_payment: dict[str, Any] | None = None,
    razorpay_order: dict[str, Any] | None = None,
) -> dict[str, Any]:
    with get_db() as conn:
        payment = conn.execute(
            """
            SELECT * FROM payments
            WHERE user_id = %s AND razorpay_order_id = %s
            LIMIT 1
            FOR UPDATE
            """,
            (user_id, razorpay_order_id),
        ).fetchone()

        if not payment:
            raise HTTPException(status_code=404, detail="Payment order was not found for this user.")

        if payment.get("payment_status") in SUCCESS_PAYMENT_STATUSES and payment.get("razorpay_payment_id") == razorpay_payment_id:
            user = conn.execute("SELECT * FROM users WHERE id = %s", (user_id,)).fetchone()
            return normalize_record(user) or {}

        def update_status(status: str) -> None:
            conn.execute(
                """
                UPDATE payments
                SET payment_status = %s,
                    razorpay_payment_id = %s,
                    razorpay_signature = %s,
                    updated_at = NOW()
                WHERE id = %s
                """,
                (status, razorpay_payment_id, razorpay_signature, payment["id"]),
            )
            conn.commit()

        if razorpay_payment is None:
            update_status("verification_incomplete")
            raise HTTPException(status_code=409, detail="Payment status could not be confirmed with Razorpay.")

        gateway_payment_id = str(razorpay_payment.get("id") or "")
        gateway_order_id = str(razorpay_payment.get("order_id") or "")
        gateway_status = str(razorpay_payment.get("status") or "").lower()
        gateway_currency = str(razorpay_payment.get("currency") or "").upper()
        gateway_amount = int(razorpay_payment.get("amount") or 0)
        gateway_captured = bool(razorpay_payment.get("captured"))

        if gateway_payment_id != razorpay_payment_id or gateway_order_id != razorpay_order_id:
            update_status("mismatched")
            raise HTTPException(status_code=400, detail="Razorpay payment does not match this order.")

        if gateway_amount != int(payment["amount"]) or gateway_currency != str(payment["currency"]).upper():
            update_status("amount_mismatch")
            raise HTTPException(status_code=400, detail="Razorpay payment amount does not match this order.")

        gateway_order_status = str((razorpay_order or {}).get("status") or "").lower()
        gateway_order_amount = int((razorpay_order or {}).get("amount") or 0)
        gateway_order_currency = str((razorpay_order or {}).get("currency") or "").upper()
        gateway_amount_paid = int((razorpay_order or {}).get("amount_paid") or 0)
        gateway_notes_raw = (razorpay_order or {}).get("notes") or {}
        gateway_notes = gateway_notes_raw if isinstance(gateway_notes_raw, dict) else {}

        if razorpay_order is None:
            update_status("order_verification_incomplete")
            raise HTTPException(status_code=409, detail="Razorpay order status could not be confirmed.")

        if gateway_order_amount != int(payment["amount"]) or gateway_order_currency != str(payment["currency"]).upper():
            update_status("order_amount_mismatch")
            raise HTTPException(status_code=400, detail="Razorpay order amount does not match this checkout.")

        if str(gateway_notes.get("user_id") or "") != str(user_id) or str(gateway_notes.get("plan_id") or "") != str(payment["plan_id"]):
            update_status("order_owner_mismatch")
            raise HTTPException(status_code=400, detail="Razorpay order ownership does not match this user.")

        if gateway_status == "failed":
            update_status("failed")
            raise HTTPException(status_code=402, detail="Razorpay reports this payment as failed.")

        if gateway_status != "captured" or not gateway_captured:
            update_status(gateway_status or "not_captured")
            raise HTTPException(status_code=409, detail="Payment is not captured yet. Subscription was not activated.")

        if gateway_order_status != "paid" and gateway_amount_paid < int(payment["amount"]):
            update_status(gateway_order_status or "order_not_paid")
            raise HTTPException(status_code=409, detail="Razorpay order is not marked paid yet. Subscription was not activated.")

        plan_id = payment["plan_id"]
        now = now_utc()
        conn.execute(
            """
            UPDATE payments
            SET payment_status = 'success',
                razorpay_payment_id = %s,
                razorpay_signature = %s,
                updated_at = NOW()
            WHERE id = %s
            """,
            (razorpay_payment_id, razorpay_signature, payment["id"]),
        )
        conn.execute(
            """
            UPDATE subscriptions
            SET status = 'replaced', end_date = %s
            WHERE user_id = %s AND status = 'active'
            """,
            (now, user_id),
        )
        conn.execute(
            """
            INSERT INTO subscriptions (
                user_id,
                plan_id,
                status,
                start_date,
                end_date,
                auto_renew,
                razorpay_order_id,
                razorpay_payment_id
            )
            VALUES (%s, %s, 'active', %s, %s, FALSE, %s, %s)
            """,
            (
                user_id,
                plan_id,
                now,
                now + timedelta(days=30),
                razorpay_order_id,
                razorpay_payment_id,
            ),
        )
        user = conn.execute(
            """
            UPDATE users
            SET plan_id = %s,
                plan_type = 'premium',
                trial_active = FALSE,
                subscription_status = 'active',
                updated_at = NOW()
            WHERE id = %s
            RETURNING *
            """,
            (plan_id, user_id),
        ).fetchone()
        conn.commit()
        return normalize_record(user) or {}


def payment_status_payload(user: dict[str, Any], razorpay_order_id: str) -> dict[str, Any]:
    with get_db() as conn:
        payment = conn.execute(
            """
            SELECT *
            FROM payments
            WHERE user_id = %s AND razorpay_order_id = %s
            LIMIT 1
            """,
            (user["id"], razorpay_order_id),
        ).fetchone()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment order was not found for this user.")

    payment_record = normalize_record(payment) or {}
    payment_status = str(payment_record.get("payment_status") or "pending")
    public_status = public_payment_state(payment_status)
    subscription = current_subscription_for_user(int(user["id"]))
    subscription_active = bool(
        subscription
        and subscription.get("status") == "active"
        and str(subscription.get("razorpay_order_id") or "") == razorpay_order_id
    )

    if subscription_active and public_status != "success":
        public_status = "success"

    return {
        "success": True,
        "order_id": razorpay_order_id,
        "status": public_status,
        "payment_status": "success" if payment_status == "paid" else payment_status,
        "payment_id": payment_record.get("razorpay_payment_id") or "",
        "plan_id": payment_record.get("plan_id") or "",
        "amount": int(payment_record.get("amount") or 0),
        "currency": payment_record.get("currency") or "INR",
        "subscription_active": subscription_active,
        "session": session_payload(user) if public_status == "success" else {},
        "message": (
            "Payment verified and subscription is active."
            if public_status == "success"
            else "Payment is still being confirmed by Razorpay."
            if public_status in {"pending", "processing"}
            else "Payment could not be completed."
        ),
    }


def admin_list(table_name: str, limit: int = 100) -> list[dict[str, Any]]:
    allowed_tables = {"users", "payments", "subscriptions", "usage_logs"}
    if table_name not in allowed_tables:
        raise HTTPException(status_code=400, detail="Unsupported admin resource.")
    with get_db() as conn:
        rows = conn.execute(f"SELECT * FROM {table_name} ORDER BY id DESC LIMIT %s", (limit,)).fetchall()
    return normalize_row(rows)
