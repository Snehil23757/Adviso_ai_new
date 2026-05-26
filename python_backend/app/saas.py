from datetime import timedelta
from typing import Any

from fastapi import Depends, HTTPException, Request

from app.auth import get_firebase_claims
from app.database import get_db, normalize_record, normalize_row, now_utc


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

    with get_db() as conn:
        row = conn.execute(
            """
            INSERT INTO users (firebase_uid, email, full_name, profile_picture, auth_provider, plan_id, login_count, last_login, updated_at)
            VALUES (%s, %s, %s, %s, %s, 'free', 1, NOW(), NOW())
            ON CONFLICT (firebase_uid) DO UPDATE SET
                email = EXCLUDED.email,
                full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), users.full_name),
                profile_picture = COALESCE(NULLIF(EXCLUDED.profile_picture, ''), users.profile_picture),
                auth_provider = EXCLUDED.auth_provider,
                login_count = users.login_count + 1,
                last_login = NOW(),
                updated_at = NOW()
            RETURNING *
            """,
            (firebase_uid, email, full_name, picture, provider),
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
        return normalize_record(row) or {}


def get_current_user(claims: dict[str, Any] = Depends(get_firebase_claims)) -> dict[str, Any]:
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


def session_payload(user: dict[str, Any]) -> dict[str, Any]:
    subscription = current_subscription_for_user(user["id"])
    plan_id = (subscription or {}).get("plan_id") or "free"
    plan = get_plan(plan_id)
    permissions = build_permissions(plan_id)
    return {
        "success": True,
        "user": normalize_row(user),
        "subscription": {
            "plan_id": plan_id,
            "plan": plan,
            "status": (subscription or {}).get("status", "active"),
            "start_date": (subscription or {}).get("start_date"),
            "end_date": (subscription or {}).get("end_date"),
            "auto_renew": (subscription or {}).get("auto_renew", False),
            "credits_remaining": 0 if plan_id == "free" else None,
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
    subscription = current_subscription_for_user(user["id"])
    plan_id = (subscription or {}).get("plan_id") or "free"
    plan = get_plan(plan_id)
    permissions = build_permissions(plan_id)
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
        "subscription": {
            "plan_id": plan_id,
            "status": (subscription or {}).get("status", "active"),
            "start_date": (subscription or {}).get("start_date"),
            "end_date": (subscription or {}).get("end_date"),
            "auto_renew": (subscription or {}).get("auto_renew", False),
            "razorpay_order_id": (subscription or {}).get("razorpay_order_id"),
            "razorpay_payment_id": (subscription or {}).get("razorpay_payment_id"),
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
    subscription = current_subscription_for_user(user["id"])
    plan_id = (subscription or {}).get("plan_id") or "free"
    features = get_features_for_plan(plan_id)
    if not features.get(feature_name):
        raise HTTPException(status_code=403, detail=f"Upgrade required for feature: {feature_name}.")


def require_feature(feature_name: str):
    def dependency(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
        ensure_feature_access(user, feature_name)
        return user

    return dependency


def ensure_admin(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    if not user.get("is_admin"):
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


def create_pending_payment(user_id: int, plan_id: str, order_id: str, amount: int, currency: str) -> None:
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO payments (user_id, plan_id, amount, currency, payment_status, razorpay_order_id)
            VALUES (%s, %s, %s, %s, 'created', %s)
            ON CONFLICT (razorpay_order_id) DO UPDATE SET
                amount = EXCLUDED.amount,
                currency = EXCLUDED.currency,
                plan_id = EXCLUDED.plan_id
            """,
            (user_id, plan_id, amount, currency, order_id),
        )
        conn.commit()


def activate_subscription_from_payment(
    user_id: int,
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
) -> dict[str, Any]:
    with get_db() as conn:
        payment = conn.execute(
            """
            SELECT * FROM payments
            WHERE user_id = %s AND razorpay_order_id = %s
            LIMIT 1
            """,
            (user_id, razorpay_order_id),
        ).fetchone()

        if not payment:
            raise HTTPException(status_code=404, detail="Payment order was not found for this user.")

        plan_id = payment["plan_id"]
        now = now_utc()
        conn.execute(
            """
            UPDATE payments
            SET payment_status = 'paid',
                razorpay_payment_id = %s,
                razorpay_signature = %s
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
            SET plan_id = %s, updated_at = NOW()
            WHERE id = %s
            RETURNING *
            """,
            (plan_id, user_id),
        ).fetchone()
        conn.commit()
        return normalize_record(user) or {}


def admin_list(table_name: str, limit: int = 100) -> list[dict[str, Any]]:
    allowed_tables = {"users", "payments", "subscriptions", "usage_logs"}
    if table_name not in allowed_tables:
        raise HTTPException(status_code=400, detail="Unsupported admin resource.")
    with get_db() as conn:
        rows = conn.execute(f"SELECT * FROM {table_name} ORDER BY id DESC LIMIT %s", (limit,)).fetchall()
    return normalize_row(rows)
