from contextlib import contextmanager
from datetime import datetime, timezone
from decimal import Decimal
import re
from typing import Any, Iterator
from urllib.parse import quote

import psycopg
from psycopg.rows import dict_row

from app.config import get_settings


PLAN_SEEDS = [
    ("free", "FREE", 0, 0, "Basic workspace access with upload and chat."),
    ("go", "GO", 7900, 94800, "Focused operator workspace with chat, ideas, and budget planning."),
    ("pro", "PRO", 39900, 478800, "Advanced analytics, forecasting, and competitive intelligence."),
    ("enterprise", "ENTERPRISE", 399900, 4798800, "All tools, advanced analytics, teams, and enterprise controls."),
]

PLAN_FEATURES: dict[str, list[str]] = {
    "free": ["upload.csv", "ai.chat"],
    "go": ["upload.csv", "ai.chat", "ideas.generate", "budget.plan", "ai.insights"],
    "pro": [
        "upload.csv",
        "export.csv",
        "charts.visualize",
        "ai.insights",
        "ai.chat",
        "profit.analyze",
        "forecast.run",
        "competitor.analyze",
    ],
    "enterprise": [
        "upload.csv",
        "export.csv",
        "ai.insights",
        "ai.chat",
        "ideas.generate",
        "budget.plan",
        "charts.visualize",
        "profit.analyze",
        "forecast.run",
        "competitor.analyze",
        "kpi.monitor",
        "esg.analyze",
        "team.manage",
        "enterprise.controls",
    ],
}


def database_configured() -> bool:
    return bool(get_settings().database_url.strip())


def normalize_database_url(database_url: str) -> str:
    # Supabase-generated passwords can include reserved URI characters.
    # Rebuild the userinfo with the last @ as the host separator, then encode
    # the password segment for libpq while preserving the host/query portion.
    if "://" not in database_url or "@" not in database_url:
        return re.sub(r"%(?![0-9A-Fa-f]{2})", "%25", database_url)

    scheme, rest = database_url.split("://", 1)
    userinfo, hostinfo = rest.rsplit("@", 1)
    if ":" not in userinfo:
        return re.sub(r"%(?![0-9A-Fa-f]{2})", "%25", database_url)

    username, password = userinfo.split(":", 1)
    safe_password = quote(password, safe="")
    return f"{scheme}://{username}:{safe_password}@{hostinfo}"


@contextmanager
def get_db() -> Iterator[psycopg.Connection[dict[str, Any]]]:
    settings = get_settings()
    if not settings.database_url:
        raise RuntimeError("DATABASE_URL is not configured.")
    with psycopg.connect(
        normalize_database_url(settings.database_url),
        row_factory=dict_row,
        prepare_threshold=None,
    ) as conn:
        yield conn


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def normalize_row(value: Any) -> Any:
    if isinstance(value, Decimal):
        return int(value) if value == value.to_integral() else float(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {key: normalize_row(item) for key, item in value.items()}
    if isinstance(value, list):
        return [normalize_row(item) for item in value]
    return value


def normalize_record(row: dict[str, Any] | None) -> dict[str, Any] | None:
    if row is None:
        return None
    return normalize_row(row)


def initialize_database() -> None:
    if not database_configured() or not get_settings().auto_create_tables:
        return

    schema = """
    CREATE TABLE IF NOT EXISTS plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        monthly_price INTEGER NOT NULL DEFAULT 0,
        yearly_price INTEGER NOT NULL DEFAULT 0,
        description TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        firebase_uid TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL,
        full_name TEXT NOT NULL DEFAULT '',
        profile_picture TEXT NOT NULL DEFAULT '',
        auth_provider TEXT NOT NULL DEFAULT 'password',
        plan_id TEXT NOT NULL DEFAULT 'free' REFERENCES plans(id),
        is_admin BOOLEAN NOT NULL DEFAULT FALSE,
        login_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_login TIMESTAMPTZ
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count INTEGER NOT NULL DEFAULT 0;

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

    CREATE TABLE IF NOT EXISTS workspaces (
        id BIGSERIAL PRIMARY KEY,
        owner_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        slug TEXT NOT NULL DEFAULT '',
        plan_id TEXT NOT NULL DEFAULT 'free' REFERENCES plans(id),
        settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS workspace_members (
        id BIGSERIAL PRIMARY KEY,
        workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'member',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(workspace_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_workspace_members_user_workspace ON workspace_members(user_id, workspace_id);

    CREATE TABLE IF NOT EXISTS datasets (
        id BIGSERIAL PRIMARY KEY,
        workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        uploaded_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
        storage_bucket TEXT NOT NULL DEFAULT '',
        storage_path TEXT NOT NULL DEFAULT '',
        file_name TEXT NOT NULL,
        content_type TEXT NOT NULL DEFAULT 'text/csv',
        size_bytes BIGINT NOT NULL DEFAULT 0,
        checksum_sha256 TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'upload_requested',
        row_count BIGINT,
        column_count INTEGER,
        metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_datasets_workspace_created ON datasets(workspace_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_datasets_workspace_status ON datasets(workspace_id, status);

    CREATE TABLE IF NOT EXISTS dataset_columns (
        id BIGSERIAL PRIMARY KEY,
        dataset_id BIGINT NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        data_type TEXT NOT NULL DEFAULT 'unknown',
        position INTEGER NOT NULL DEFAULT 0,
        null_count BIGINT NOT NULL DEFAULT 0,
        unique_count BIGINT,
        sample_values_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        stats_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(dataset_id, name)
    );

    CREATE INDEX IF NOT EXISTS idx_dataset_columns_dataset_position ON dataset_columns(dataset_id, position);

    CREATE TABLE IF NOT EXISTS dataset_stats (
        id BIGSERIAL PRIMARY KEY,
        dataset_id BIGINT NOT NULL UNIQUE REFERENCES datasets(id) ON DELETE CASCADE,
        stats_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        profile_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        quality_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        sample_rows_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS processing_jobs (
        id BIGSERIAL PRIMARY KEY,
        workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        dataset_id BIGINT REFERENCES datasets(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'queued',
        progress INTEGER NOT NULL DEFAULT 0,
        priority INTEGER NOT NULL DEFAULT 100,
        attempts INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 3,
        error TEXT NOT NULL DEFAULT '',
        payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        started_at TIMESTAMPTZ,
        finished_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_workspace_status ON processing_jobs(workspace_id, status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_jobs_dataset_type ON processing_jobs(dataset_id, type, created_at DESC);

    CREATE TABLE IF NOT EXISTS job_events (
        id BIGSERIAL PRIMARY KEY,
        job_id BIGINT NOT NULL REFERENCES processing_jobs(id) ON DELETE CASCADE,
        workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        message TEXT NOT NULL DEFAULT '',
        payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_job_events_job_created ON job_events(job_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS ai_artifacts (
        id BIGSERIAL PRIMARY KEY,
        workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        dataset_id BIGINT REFERENCES datasets(id) ON DELETE CASCADE,
        kind TEXT NOT NULL,
        prompt_hash TEXT NOT NULL DEFAULT '',
        model TEXT NOT NULL DEFAULT '',
        content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_ai_artifacts_dataset_kind ON ai_artifacts(dataset_id, kind, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ai_artifacts_workspace_kind ON ai_artifacts(workspace_id, kind, created_at DESC);

    CREATE TABLE IF NOT EXISTS reports (
        id BIGSERIAL PRIMARY KEY,
        workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        dataset_id BIGINT REFERENCES datasets(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_reports_workspace_created ON reports(workspace_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS chart_configs (
        id BIGSERIAL PRIMARY KEY,
        workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        dataset_id BIGINT REFERENCES datasets(id) ON DELETE CASCADE,
        name TEXT NOT NULL DEFAULT '',
        config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_chart_configs_dataset_created ON chart_configs(dataset_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS audit_logs (
        id BIGSERIAL PRIMARY KEY,
        workspace_id BIGINT REFERENCES workspaces(id) ON DELETE CASCADE,
        actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        target_type TEXT NOT NULL DEFAULT '',
        target_id TEXT NOT NULL DEFAULT '',
        metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace_created ON audit_logs(workspace_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS subscriptions (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan_id TEXT NOT NULL REFERENCES plans(id),
        status TEXT NOT NULL DEFAULT 'active',
        start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        end_date TIMESTAMPTZ,
        auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
        razorpay_order_id TEXT,
        razorpay_payment_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);

    CREATE TABLE IF NOT EXISTS payments (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan_id TEXT REFERENCES plans(id),
        amount INTEGER NOT NULL,
        currency TEXT NOT NULL DEFAULT 'INR',
        payment_status TEXT NOT NULL DEFAULT 'created',
        razorpay_order_id TEXT NOT NULL,
        razorpay_payment_id TEXT,
        razorpay_signature TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_payments_user_created ON payments(user_id, created_at DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_order_id ON payments(razorpay_order_id);

    CREATE TABLE IF NOT EXISTS feature_access (
        id BIGSERIAL PRIMARY KEY,
        plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
        feature_name TEXT NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        UNIQUE(plan_id, feature_name)
    );

    CREATE TABLE IF NOT EXISTS usage_logs (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
        endpoint TEXT NOT NULL,
        tokens_used INTEGER NOT NULL DEFAULT 0,
        request_type TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_usage_logs_user_created ON usage_logs(user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS account_preferences (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        theme TEXT NOT NULL DEFAULT 'system',
        language TEXT NOT NULL DEFAULT 'English',
        timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
        email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
        product_updates BOOLEAN NOT NULL DEFAULT TRUE,
        security_alerts BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS payment_preferences (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        preferred_method TEXT NOT NULL DEFAULT 'upi',
        upi_id TEXT NOT NULL DEFAULT '',
        billing_name TEXT NOT NULL DEFAULT '',
        billing_email TEXT NOT NULL DEFAULT '',
        billing_phone TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS chat_sessions (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL DEFAULT 'New chat',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
        id BIGSERIAL PRIMARY KEY,
        session_id BIGINT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """

    with get_db() as conn:
        conn.execute(schema)
        for plan_id, name, monthly_price, yearly_price, description in PLAN_SEEDS:
            conn.execute(
                """
                INSERT INTO plans (id, name, monthly_price, yearly_price, description)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    monthly_price = EXCLUDED.monthly_price,
                    yearly_price = EXCLUDED.yearly_price,
                    description = EXCLUDED.description
                """,
                (plan_id, name, monthly_price, yearly_price, description),
            )
        for plan_id, features in PLAN_FEATURES.items():
            for feature in features:
                conn.execute(
                    """
                    INSERT INTO feature_access (plan_id, feature_name, enabled)
                    VALUES (%s, %s, TRUE)
                    ON CONFLICT (plan_id, feature_name) DO UPDATE SET enabled = TRUE
                    """,
                    (plan_id, feature),
                )
        conn.commit()
