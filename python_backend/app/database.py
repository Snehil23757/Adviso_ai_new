from contextlib import contextmanager
from datetime import datetime, timezone
from decimal import Decimal
import re
from typing import Any, Iterator
from urllib.parse import quote

import psycopg
from psycopg_pool import ConnectionPool
from psycopg.rows import dict_row

from app.config import get_settings


_pool: ConnectionPool | None = None


PLAN_SEEDS = [
    ("free", "FREE", 0, 0, "Basic workspace access with Home and Settings only."),
    ("go", "GO", 7900, 94800, "Focused operator workspace with chat, ideas, and budget planning."),
    ("pro", "PRO", 39900, 478800, "Advanced analytics, forecasting, and competitive intelligence."),
    ("enterprise", "ENTERPRISE", 399900, 4798800, "All tools, advanced analytics, teams, and enterprise controls."),
]

PLAN_FEATURES: dict[str, list[str]] = {
    "free": ["upload.csv"],
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
    pool = get_database_pool()
    if pool is not None:
        with pool.connection() as conn:
            yield conn
        return

    with psycopg.connect(
        normalize_database_url(settings.database_url),
        row_factory=dict_row,
        prepare_threshold=None,
    ) as conn:
        yield conn


def get_database_pool() -> ConnectionPool | None:
    global _pool
    settings = get_settings()
    if not settings.database_url:
        return None
    if _pool is not None:
        return _pool

    _pool = ConnectionPool(
        conninfo=normalize_database_url(settings.database_url),
        min_size=max(0, settings.db_pool_min_size),
        max_size=max(1, settings.db_pool_max_size),
        timeout=settings.db_pool_timeout_seconds,
        kwargs={"row_factory": dict_row, "prepare_threshold": None},
        open=True,
    )
    return _pool


def close_database_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None


def database_health() -> dict[str, Any]:
    if not database_configured():
        return {"configured": False, "available": False}
    try:
        with get_db() as conn:
            conn.execute("SELECT 1").fetchone()
        pool = get_database_pool()
        stats = pool.get_stats() if pool is not None else {}
        return {"configured": True, "available": True, "pool": normalize_row(stats)}
    except Exception as exc:
        return {"configured": True, "available": False, "error": str(exc)}


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
        email_verified BOOLEAN NOT NULL DEFAULT FALSE,
        onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
        trial_started_at TIMESTAMPTZ,
        trial_start_date TIMESTAMPTZ,
        trial_end_date TIMESTAMPTZ,
        trial_active BOOLEAN NOT NULL DEFAULT FALSE,
        plan_type TEXT NOT NULL DEFAULT 'free',
        subscription_status TEXT NOT NULL DEFAULT 'active',
        profile_metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        welcome_email_queued_at TIMESTAMPTZ,
        welcome_email_sent_at TIMESTAMPTZ,
        login_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_login TIMESTAMPTZ
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_active BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_type TEXT NOT NULL DEFAULT 'free';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'active';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS welcome_email_queued_at TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS welcome_email_sent_at TIMESTAMPTZ;
    ALTER TABLE users ALTER COLUMN trial_active SET DEFAULT FALSE;
    ALTER TABLE users ALTER COLUMN plan_type SET DEFAULT 'free';
    UPDATE users
    SET trial_active = FALSE,
        plan_type = CASE WHEN plan_id <> 'free' THEN 'premium' ELSE 'free' END,
        subscription_status = CASE WHEN subscription_status = 'expired' AND plan_id = 'free' THEN 'active' ELSE subscription_status END,
        updated_at = NOW()
    WHERE trial_active = TRUE OR plan_type = 'trial';

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_users_trial_started ON users(trial_started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_users_trial_end ON users(trial_end_date DESC);
    CREATE INDEX IF NOT EXISTS idx_users_trial_active ON users(trial_active, trial_end_date DESC);
    CREATE INDEX IF NOT EXISTS idx_users_plan_type_status ON users(plan_type, subscription_status);
    CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);

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
    ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    CREATE INDEX IF NOT EXISTS idx_workspaces_owner_active ON workspaces(owner_user_id, created_at DESC) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_workspaces_created ON workspaces(created_at DESC);

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
    CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_user ON workspace_members(workspace_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_created ON workspace_members(workspace_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_workspace_members_user_created ON workspace_members(user_id, created_at DESC);

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
    CREATE INDEX IF NOT EXISTS idx_datasets_workspace_id ON datasets(workspace_id, id);
    ALTER TABLE datasets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    CREATE INDEX IF NOT EXISTS idx_datasets_dataset_id ON datasets(id);
    CREATE INDEX IF NOT EXISTS idx_datasets_uploaded_by_created ON datasets(uploaded_by, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_datasets_workspace_dataset ON datasets(workspace_id, id);
    CREATE INDEX IF NOT EXISTS idx_datasets_workspace_created_active ON datasets(workspace_id, created_at DESC) WHERE deleted_at IS NULL;

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
    CREATE INDEX IF NOT EXISTS idx_dataset_columns_created ON dataset_columns(created_at DESC);

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
    CREATE INDEX IF NOT EXISTS idx_dataset_stats_dataset ON dataset_stats(dataset_id);
    CREATE INDEX IF NOT EXISTS idx_dataset_stats_updated ON dataset_stats(updated_at DESC);

    CREATE TABLE IF NOT EXISTS dataset_metadata (
        id BIGSERIAL PRIMARY KEY,
        workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        dataset_id BIGINT NOT NULL UNIQUE REFERENCES datasets(id) ON DELETE CASCADE,
        metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        column_info_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        statistics_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        summaries_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        embeddings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        sampled_rows_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        quality_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        profile_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_dataset_metadata_workspace_dataset ON dataset_metadata(workspace_id, dataset_id);
    CREATE INDEX IF NOT EXISTS idx_dataset_metadata_dataset ON dataset_metadata(dataset_id);
    CREATE INDEX IF NOT EXISTS idx_dataset_metadata_workspace_created ON dataset_metadata(workspace_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_dataset_metadata_created_by ON dataset_metadata(created_by, created_at DESC);

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
    CREATE INDEX IF NOT EXISTS idx_jobs_workspace_dataset ON processing_jobs(workspace_id, dataset_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_jobs_created_by ON processing_jobs(created_by, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_jobs_status_updated ON processing_jobs(status, updated_at DESC);

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
    CREATE INDEX IF NOT EXISTS idx_job_events_workspace_created ON job_events(workspace_id, created_at DESC);

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
    CREATE INDEX IF NOT EXISTS idx_ai_artifacts_workspace_dataset ON ai_artifacts(workspace_id, dataset_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ai_artifacts_prompt_hash ON ai_artifacts(prompt_hash);
    CREATE INDEX IF NOT EXISTS idx_ai_artifacts_created_by ON ai_artifacts(created_by, created_at DESC);

    CREATE TABLE IF NOT EXISTS ai_chats (
        id BIGSERIAL PRIMARY KEY,
        workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        dataset_id BIGINT REFERENCES datasets(id) ON DELETE SET NULL,
        user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
        title TEXT NOT NULL DEFAULT 'New chat',
        status TEXT NOT NULL DEFAULT 'active',
        context_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_ai_chats_workspace_updated ON ai_chats(workspace_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ai_chats_workspace_dataset ON ai_chats(workspace_id, dataset_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ai_chats_user_updated ON ai_chats(user_id, updated_at DESC);
    ALTER TABLE ai_chats ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    CREATE INDEX IF NOT EXISTS idx_ai_chats_workspace_user ON ai_chats(workspace_id, user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ai_chats_workspace_created ON ai_chats(workspace_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ai_chats_active ON ai_chats(workspace_id, updated_at DESC) WHERE deleted_at IS NULL AND status = 'active';

    CREATE TABLE IF NOT EXISTS ai_chat_messages (
        id BIGSERIAL PRIMARY KEY,
        workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        chat_id BIGINT NOT NULL REFERENCES ai_chats(id) ON DELETE CASCADE,
        dataset_id BIGINT REFERENCES datasets(id) ON DELETE SET NULL,
        user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT '',
        metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_workspace_created ON ai_chat_messages(workspace_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_chat_created ON ai_chat_messages(chat_id, created_at ASC);
    CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_dataset_created ON ai_chat_messages(dataset_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_user_created ON ai_chat_messages(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_workspace_chat ON ai_chat_messages(workspace_id, chat_id, created_at ASC);

    CREATE TABLE IF NOT EXISTS ai_response_cache (
        id BIGSERIAL PRIMARY KEY,
        workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        dataset_id BIGINT REFERENCES datasets(id) ON DELETE CASCADE,
        prompt_hash TEXT NOT NULL,
        model TEXT NOT NULL DEFAULT '',
        prompt_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        response_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        source TEXT NOT NULL DEFAULT '',
        hit_count INTEGER NOT NULL DEFAULT 0,
        expires_at TIMESTAMPTZ,
        last_used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(workspace_id, prompt_hash)
    );

    CREATE INDEX IF NOT EXISTS idx_ai_response_cache_workspace_hash ON ai_response_cache(workspace_id, prompt_hash);
    CREATE INDEX IF NOT EXISTS idx_ai_response_cache_dataset_created ON ai_response_cache(dataset_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ai_response_cache_prompt_hash ON ai_response_cache(prompt_hash);
    CREATE INDEX IF NOT EXISTS idx_ai_response_cache_workspace_created ON ai_response_cache(workspace_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ai_response_cache_expires ON ai_response_cache(expires_at);

    CREATE TABLE IF NOT EXISTS workspace_sessions (
        id BIGSERIAL PRIMARY KEY,
        workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        active_dataset_id BIGINT REFERENCES datasets(id) ON DELETE SET NULL,
        active_chat_id BIGINT REFERENCES ai_chats(id) ON DELETE SET NULL,
        active_page TEXT NOT NULL DEFAULT 'Overview',
        state_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(workspace_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_workspace_sessions_user_seen ON workspace_sessions(user_id, last_seen_at DESC);
    CREATE INDEX IF NOT EXISTS idx_workspace_sessions_workspace_user ON workspace_sessions(workspace_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_workspace_sessions_dataset ON workspace_sessions(active_dataset_id);
    CREATE INDEX IF NOT EXISTS idx_workspace_sessions_workspace_created ON workspace_sessions(workspace_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_workspace_sessions_chat ON workspace_sessions(active_chat_id);

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
    CREATE INDEX IF NOT EXISTS idx_reports_workspace_dataset ON reports(workspace_id, dataset_id, created_at DESC);

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
    CREATE INDEX IF NOT EXISTS idx_chart_configs_workspace_created ON chart_configs(workspace_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_chart_configs_workspace_dataset ON chart_configs(workspace_id, dataset_id, created_at DESC);

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
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT '';
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT NOT NULL DEFAULT '';
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT NOT NULL DEFAULT '';
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS request_id TEXT NOT NULL DEFAULT '';
    CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created ON audit_logs(actor_user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created ON audit_logs(action, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type_created ON audit_logs(event_type, created_at DESC);

    CREATE TABLE IF NOT EXISTS feedback_submissions (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
        workspace_id BIGINT REFERENCES workspaces(id) ON DELETE SET NULL,
        email TEXT NOT NULL DEFAULT '',
        satisfaction_score INTEGER NOT NULL,
        likes_text TEXT NOT NULL DEFAULT '',
        insight_ease_score INTEGER NOT NULL,
        insight_accuracy_score INTEGER NOT NULL,
        features_used_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        improvement_text TEXT NOT NULL DEFAULT '',
        additional_feedback TEXT NOT NULL DEFAULT '',
        active_page TEXT NOT NULL DEFAULT '',
        user_agent TEXT NOT NULL DEFAULT '',
        metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        status TEXT NOT NULL DEFAULT 'new',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_feedback_user_created ON feedback_submissions(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_feedback_workspace_created ON feedback_submissions(workspace_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_feedback_status_created ON feedback_submissions(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_feedback_satisfaction_created ON feedback_submissions(satisfaction_score, created_at DESC);

    CREATE TABLE IF NOT EXISTS email_events (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
        workspace_id BIGINT REFERENCES workspaces(id) ON DELETE SET NULL,
        email TEXT NOT NULL,
        template TEXT NOT NULL,
        subject TEXT NOT NULL DEFAULT '',
        provider TEXT NOT NULL DEFAULT 'resend',
        provider_message_id TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'queued',
        attempts INTEGER NOT NULL DEFAULT 0,
        error TEXT NOT NULL DEFAULT '',
        metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        sent_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_email_events_user_created ON email_events(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_email_events_workspace_created ON email_events(workspace_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_email_events_status_created ON email_events(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_email_events_template_created ON email_events(template, created_at DESC);

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
    CREATE INDEX IF NOT EXISTS idx_subscriptions_created ON subscriptions(created_at DESC);

    CREATE TABLE IF NOT EXISTS payments (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan_id TEXT REFERENCES plans(id),
        amount INTEGER NOT NULL,
        currency TEXT NOT NULL DEFAULT 'INR',
        payment_status TEXT NOT NULL DEFAULT 'pending',
        razorpay_order_id TEXT NOT NULL,
        razorpay_payment_id TEXT,
        razorpay_signature TEXT,
        status_detail TEXT NOT NULL DEFAULT '',
        metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        expires_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE payments ADD COLUMN IF NOT EXISTS status_detail TEXT NOT NULL DEFAULT '';
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    ALTER TABLE payments ALTER COLUMN payment_status SET DEFAULT 'pending';

    CREATE INDEX IF NOT EXISTS idx_payments_user_created ON payments(user_id, created_at DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_order_id ON payments(razorpay_order_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_payment_id ON payments(razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_payments_status_created ON payments(payment_status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_payments_user_status_created ON payments(user_id, payment_status, created_at DESC);

    CREATE TABLE IF NOT EXISTS payment_webhook_events (
        id BIGSERIAL PRIMARY KEY,
        provider TEXT NOT NULL DEFAULT 'razorpay',
        event_id TEXT NOT NULL UNIQUE,
        event_name TEXT NOT NULL DEFAULT '',
        razorpay_order_id TEXT NOT NULL DEFAULT '',
        razorpay_payment_id TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'received',
        error TEXT NOT NULL DEFAULT '',
        payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        processed_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_payment_webhooks_event_created ON payment_webhook_events(event_name, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_payment_webhooks_status_created ON payment_webhook_events(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_payment_webhooks_order_created ON payment_webhook_events(razorpay_order_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_payment_webhooks_payment_created ON payment_webhook_events(razorpay_payment_id, created_at DESC);

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
    ALTER TABLE usage_logs ADD COLUMN IF NOT EXISTS workspace_id BIGINT REFERENCES workspaces(id) ON DELETE SET NULL;
    ALTER TABLE usage_logs ADD COLUMN IF NOT EXISTS dataset_id BIGINT REFERENCES datasets(id) ON DELETE SET NULL;
    ALTER TABLE usage_logs ADD COLUMN IF NOT EXISTS units BIGINT NOT NULL DEFAULT 1;
    ALTER TABLE usage_logs ADD COLUMN IF NOT EXISTS metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb;
    CREATE INDEX IF NOT EXISTS idx_usage_logs_workspace_created ON usage_logs(workspace_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_usage_logs_dataset_created ON usage_logs(dataset_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_usage_logs_request_type_created ON usage_logs(request_type, created_at DESC);

    CREATE TABLE IF NOT EXISTS workspace_usage (
        id BIGSERIAL PRIMARY KEY,
        workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
        metric TEXT NOT NULL,
        period_start TIMESTAMPTZ NOT NULL,
        count BIGINT NOT NULL DEFAULT 0,
        units BIGINT NOT NULL DEFAULT 0,
        metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(workspace_id, user_id, metric, period_start)
    );

    CREATE INDEX IF NOT EXISTS idx_workspace_usage_workspace_metric ON workspace_usage(workspace_id, metric, period_start DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_usage_unique ON workspace_usage(workspace_id, user_id, metric, period_start);
    CREATE INDEX IF NOT EXISTS idx_workspace_usage_user_metric ON workspace_usage(user_id, metric, period_start DESC);
    CREATE INDEX IF NOT EXISTS idx_workspace_usage_created ON workspace_usage(created_at DESC);

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
        conn.execute("UPDATE feature_access SET enabled = FALSE WHERE plan_id = 'free' AND feature_name <> 'upload.csv'")
        conn.commit()
