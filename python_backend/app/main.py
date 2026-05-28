from datetime import datetime, timezone
import hashlib
import hmac
import json
import logging
from pathlib import Path
import asyncio
import uuid

import razorpay
from fastapi import Depends, FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.auth import generate_email_verification_link, generate_password_reset_link, verify_firebase_claims
from app.models import (
    AccountPreferencesUpdate,
    AccountSettingsResponse,
    AnalyzeResponse,
    BudgetRequest,
    BusinessAnalysisRequest,
    ChatRequest,
    ChatResponse,
    CreateOrderRequest,
    CreateOrderResponse,
    EmailValidationRequest,
    EmailValidationResponse,
    EmailVerificationResponse,
    FeedbackSubmissionRequest,
    FeedbackSubmissionResponse,
    CompetitorRequest,
    DatasetListResponse,
    DatasetInsightRequest,
    DatasetInsightResponse,
    DatasetResponse,
    DatasetSummaryRequest,
    ForecastRequest,
    JobResponse,
    MeResponse,
    PaymentPreferenceUpdate,
    PaymentStatusResponse,
    PasswordResetEmailRequest,
    PasswordResetEmailResponse,
    ProfitRequest,
    SustainabilityRequest,
    UploadCompleteRequest,
    UploadCompleteResponse,
    UploadInitRequest,
    UploadInitResponse,
    VerifyPaymentRequest,
    VerifyPaymentResponse,
    WorkspaceChatCreateRequest,
    WorkspaceChatRequest,
    WorkspaceCreateRequest,
    WorkspaceResponse,
    WorkspaceSessionResponse,
    WorkspaceSessionUpdate,
    WorkspacesResponse,
)
from app.services.analytics import (
    budget_summary,
    competitor_summary,
    dataset_insights,
    dataset_summary,
    forecast_values,
    profit_summary,
    sustainability_summary,
)
from app.services.strategy import generate_report
from app.logging_config import configure_logging
from app.services.workspace_memory import (
    answer_workspace_chat,
    create_ai_chat,
    restore_latest_workspace_session,
    update_workspace_session,
    workspace_dataset_insight,
    workspace_session_payload,
)
from app.database import close_database_pool, database_health, initialize_database
from app.queueing import celery_health, queue_status, redis_configured, redis_health
from app.services.limits import (
    enforce_ai_quota,
    enforce_ai_rate_limit,
    enforce_upload_rate_limit,
    enforce_websocket_rate_limit,
    quota_snapshot,
)
from app.services.redis_service import get_redis_service
from app.services.email_service import queue_email_verification_email, queue_password_reset_email
from app.services.email_validation import validate_registration_email
from app.services.feedback_service import create_feedback_submission
from app.services.usage import record_usage, workspace_usage_snapshot
from app.saas import (
    MODE_TO_FEATURE,
    account_settings_payload,
    activate_subscription_from_payment,
    admin_list,
    create_pending_payment,
    ensure_admin,
    ensure_feature_access,
    finish_payment_webhook_event,
    get_pending_payment_for_razorpay_order,
    get_current_user,
    get_plan,
    log_usage,
    mark_razorpay_payment_status,
    payment_status_payload,
    record_payment_webhook_event,
    require_feature,
    session_payload,
    update_account_preferences,
    update_payment_preference,
    upsert_user_from_claims,
)
from app.tenant import store_audit_event, workspace_isolation_middleware
from app.workspaces import (
    complete_dataset_upload,
    create_workspace_for_user,
    get_dataset_for_workspace,
    get_job_for_workspace,
    init_dataset_upload,
    list_datasets_for_workspace,
    list_workspaces_for_user,
    require_workspace_access,
    soft_delete_dataset_for_workspace,
    soft_delete_workspace_for_user,
)


settings = get_settings()
configure_logging()
logger = logging.getLogger("adviso-ai")

app = FastAPI(
    title="Adviso AI Python Backend",
    version="1.0.0",
    description="Python services for Adviso AI strategy analysis and business analytics.",
)

# CORS must be registered before any routes so browser preflight OPTIONS
# requests from Firebase Hosting are answered by Starlette's CORS layer.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_origin_regex=settings.origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    try:
        initialize_database()
    except Exception as exc:
        logger.exception("Database initialization failed. Protected SaaS endpoints will fail closed.", exc_info=exc)
    if settings.redis_url:
        if get_redis_service().ping():
            logger.info("Redis connection is healthy.")
        else:
            logger.warning("Redis is configured but not reachable. Queueing, pub/sub, caching, and rate limits will fail open.")


@app.on_event("shutdown")
async def shutdown() -> None:
    await get_redis_service().close_async()
    get_redis_service().close_sync()
    close_database_pool()


@app.middleware("http")
async def redis_rate_limit_middleware(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or uuid.uuid4().hex
    request.state.request_id = request_id
    path = request.url.path
    if not path.startswith("/api/") or path.startswith("/api/health") or path == "/api/webhooks/razorpay":
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

    auth_header = request.headers.get("authorization", "")
    identity = auth_header or (request.client.host if request.client else "anonymous")
    limit = await get_redis_service().check_rate_limit(
        "http",
        f"{identity}:{path}",
        settings.rate_limit_per_minute,
        60,
    )
    if not limit.get("allowed", True):
        return JSONResponse(
            status_code=429,
            content={
                "success": False,
                "error": "Rate limit exceeded.",
                "detail": "Too many requests. Please retry shortly.",
            },
            headers={
                "Retry-After": str(limit.get("reset_seconds") or 60),
                "X-RateLimit-Limit": str(limit.get("limit") or settings.rate_limit_per_minute),
                "X-RateLimit-Remaining": "0",
            },
        )

    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    if limit.get("available"):
        response.headers["X-RateLimit-Limit"] = str(limit.get("limit") or settings.rate_limit_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(limit.get("remaining") or 0)
        response.headers["X-RateLimit-Reset"] = str(limit.get("reset_seconds") or 60)
    return response


@app.middleware("http")
async def tenant_workspace_isolation_middleware(request: Request, call_next):
    return await workspace_isolation_middleware(request, call_next)


def get_razorpay_client() -> razorpay.Client:
    if not settings.razorpay_key_id or not settings.razorpay_key_secret:
        raise HTTPException(
            status_code=500,
            detail="Razorpay is not configured on the backend.",
        )
    return razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))


def razorpay_error_status(error: Exception) -> int:
    status_code = getattr(error, "status_code", None)
    if isinstance(status_code, int) and 400 <= status_code <= 599:
        return status_code
    message = str(error).lower()
    if "auth" in message or "credential" in message or "key" in message:
        return 401
    if "forbidden" in message or "403" in message:
        return 403
    return 502


def verify_razorpay_webhook_signature(raw_body: bytes, signature: str) -> None:
    if not settings.razorpay_webhook_secret.strip():
        raise HTTPException(status_code=503, detail="Razorpay webhook secret is not configured.")
    if not signature:
        raise HTTPException(status_code=400, detail="Missing Razorpay webhook signature.")

    expected_signature = hmac.new(
        settings.razorpay_webhook_secret.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected_signature, signature):
        raise HTTPException(status_code=400, detail="Invalid Razorpay webhook signature.")


def razorpay_payload_entity(payload: dict, key: str) -> dict:
    payload_root = payload.get("payload") if isinstance(payload.get("payload"), dict) else {}
    wrapper = payload_root.get(key) if isinstance(payload_root, dict) else {}
    entity = wrapper.get("entity") if isinstance(wrapper, dict) else {}
    return entity if isinstance(entity, dict) else {}

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": "Request validation failed.",
            "detail": exc.errors(),
            "path": str(request.url.path),
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled backend error on %s", request.url.path, exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal backend error.",
            "detail": "The backend could not complete the request. Check Cloud Run logs for details.",
            "path": str(request.url.path),
        },
    )


@app.get("/api/health")
def health() -> dict:
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "Adviso AI - Python Decision Intelligence Layer",
        "database": database_health(),
        "redis": redis_health(),
        "celery": celery_health(),
    }


@app.get("/api/health/redis")
def redis_health_check() -> dict:
    health_payload = redis_health()
    return {"status": "ok" if health_payload.get("available") else "degraded", "redis": health_payload}


@app.get("/api/health/celery")
def celery_health_check() -> dict:
    health_payload = celery_health()
    return {"status": "ok" if health_payload.get("available") else "degraded", "celery": health_payload}


@app.get("/api/health/queues")
def queues_health_check() -> dict:
    health_payload = queue_status()
    available = health_payload.get("redis", {}).get("available") and health_payload.get("celery", {}).get("available")
    return {"status": "ok" if available else "degraded", **health_payload}


@app.get("/api/health/database")
def database_health_check() -> dict:
    health_payload = database_health()
    return {"status": "ok" if health_payload.get("available") else "degraded", "database": health_payload}


@app.get("/api/metrics")
def metrics() -> dict:
    return {
        "avgDecisionReductionDays": 95,
        "manualAnalysisTimeReduction": 40,
        "activeAgentsSimulated": 1420,
        "recommendationsGeneratedTotal": 12480,
        "supportedPipelines": ["CRM", "Spreadsheets", "Stripe", "QuickBooks", "ERP", "Analytics Hub"],
    }


@app.post("/api/auth/validate-email", response_model=EmailValidationResponse)
def validate_auth_email(payload: EmailValidationRequest) -> EmailValidationResponse:
    result = validate_registration_email(payload.email)
    return EmailValidationResponse(**result)


@app.post("/api/auth/password-reset", response_model=PasswordResetEmailResponse)
def password_reset_email(payload: PasswordResetEmailRequest) -> PasswordResetEmailResponse:
    validation = validate_registration_email(payload.email)
    if not validation.get("valid"):
        raise HTTPException(status_code=400, detail=validation.get("message") or "Please enter a valid email address.")

    try:
        reset_link = generate_password_reset_link(str(validation["email"]))
    except HTTPException:
        logger.info("Password reset requested for an email without a Firebase account.")
        return PasswordResetEmailResponse(message="If this email has an Adviso AI account, a reset link will be sent.")

    queue_password_reset_email(str(validation["email"]), reset_link)
    return PasswordResetEmailResponse(message="If this email has an Adviso AI account, a reset link will be sent.")


@app.post("/api/auth/email-verification", response_model=EmailVerificationResponse)
def email_verification_email(user: dict = Depends(get_current_user)) -> EmailVerificationResponse:
    email = str(user.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Current account does not have an email address.")
    if user.get("email_verified"):
        return EmailVerificationResponse(message="This email is already verified.")

    verification_link = generate_email_verification_link(email)
    queue_email_verification_email(user, verification_link)
    return EmailVerificationResponse(message="Verification email queued.")


@app.get("/api/me", response_model=MeResponse)
def me(user: dict = Depends(get_current_user)) -> dict:
    store_audit_event(
        None,
        int(user["id"]),
        "auth.session_restored",
        "user",
        str(user["id"]),
        {"email": user.get("email") or ""},
        event_type="authentication",
    )
    return session_payload(user)


@app.get("/api/account/settings", response_model=AccountSettingsResponse)
def account_settings(user: dict = Depends(get_current_user)) -> dict:
    return account_settings_payload(user)


@app.patch("/api/account/preferences", response_model=AccountSettingsResponse)
def account_preferences(payload: AccountPreferencesUpdate, user: dict = Depends(get_current_user)) -> dict:
    update_account_preferences(user["id"], payload.model_dump(exclude_none=True))
    return account_settings_payload(user)


@app.patch("/api/account/payment-method", response_model=AccountSettingsResponse)
def account_payment_method(payload: PaymentPreferenceUpdate, user: dict = Depends(get_current_user)) -> dict:
    update_payment_preference(user, payload.model_dump(exclude_none=True))
    return account_settings_payload(user)


@app.post("/api/feedback", response_model=FeedbackSubmissionResponse)
def submit_platform_feedback(
    payload: FeedbackSubmissionRequest,
    request: Request,
    user: dict = Depends(get_current_user),
) -> FeedbackSubmissionResponse:
    if payload.workspace_id:
        require_workspace_access(user, int(payload.workspace_id))

    feedback = create_feedback_submission(
        user=user,
        payload=payload.model_dump(),
        user_agent=request.headers.get("user-agent", ""),
        request_id=getattr(request.state, "request_id", ""),
    )
    return FeedbackSubmissionResponse(feedback=feedback)


@app.get("/api/workspaces", response_model=WorkspacesResponse)
def workspaces(user: dict = Depends(get_current_user)) -> WorkspacesResponse:
    return WorkspacesResponse(workspaces=list_workspaces_for_user(user))


@app.post("/api/workspaces", response_model=WorkspaceResponse)
def create_workspace(payload: WorkspaceCreateRequest, user: dict = Depends(get_current_user)) -> WorkspaceResponse:
    return WorkspaceResponse(workspace=create_workspace_for_user(user, payload.name))


@app.get("/api/workspaces/session", response_model=WorkspaceSessionResponse)
def restore_workspace_session(user: dict = Depends(get_current_user)) -> WorkspaceSessionResponse:
    return WorkspaceSessionResponse(**restore_latest_workspace_session(user))


@app.get("/api/workspaces/{workspace_id}", response_model=WorkspaceResponse)
def get_workspace(workspace_id: int, user: dict = Depends(get_current_user)) -> WorkspaceResponse:
    return WorkspaceResponse(workspace=require_workspace_access(user, workspace_id))


@app.delete("/api/workspaces/{workspace_id}")
def delete_workspace(workspace_id: int, user: dict = Depends(get_current_user)) -> dict:
    workspace = soft_delete_workspace_for_user(user, workspace_id)
    return {"success": True, "workspace": workspace}


@app.get("/api/workspaces/{workspace_id}/quotas")
def workspace_quotas(workspace_id: int, user: dict = Depends(get_current_user)) -> dict:
    require_workspace_access(user, workspace_id)
    return {
        "success": True,
        **quota_snapshot(user, workspace_id),
        "usage_snapshot": workspace_usage_snapshot(workspace_id),
    }


@app.get("/api/workspaces/{workspace_id}/session", response_model=WorkspaceSessionResponse)
def get_workspace_session(workspace_id: int, user: dict = Depends(get_current_user)) -> WorkspaceSessionResponse:
    return WorkspaceSessionResponse(**workspace_session_payload(user, workspace_id))


@app.patch("/api/workspaces/{workspace_id}/session", response_model=WorkspaceSessionResponse)
def patch_workspace_session(workspace_id: int, payload: WorkspaceSessionUpdate, user: dict = Depends(get_current_user)) -> WorkspaceSessionResponse:
    return WorkspaceSessionResponse(**update_workspace_session(user, workspace_id, payload.model_dump(exclude_none=True)))


@app.post("/api/workspaces/{workspace_id}/uploads/init", response_model=UploadInitResponse)
async def init_upload(workspace_id: int, payload: UploadInitRequest, user: dict = Depends(require_feature("upload.csv"))) -> UploadInitResponse:
    await enforce_upload_rate_limit(user, workspace_id)
    result = init_dataset_upload(user, workspace_id, payload.model_dump())
    return UploadInitResponse(dataset=result["dataset"], upload=result["upload"])


@app.post("/api/workspaces/{workspace_id}/uploads/{dataset_id}/complete", response_model=UploadCompleteResponse)
async def complete_upload(workspace_id: int, dataset_id: int, payload: UploadCompleteRequest, user: dict = Depends(require_feature("upload.csv"))) -> UploadCompleteResponse:
    await enforce_upload_rate_limit(user, workspace_id)
    result = complete_dataset_upload(user, workspace_id, dataset_id, payload.model_dump(exclude_none=True))
    return UploadCompleteResponse(dataset=result["dataset"], job=result["job"])


@app.get("/api/workspaces/{workspace_id}/datasets", response_model=DatasetListResponse)
def list_datasets(workspace_id: int, user: dict = Depends(get_current_user)) -> DatasetListResponse:
    return DatasetListResponse(datasets=list_datasets_for_workspace(user, workspace_id))


@app.get("/api/workspaces/{workspace_id}/datasets/{dataset_id}", response_model=DatasetResponse)
def get_dataset(workspace_id: int, dataset_id: int, user: dict = Depends(get_current_user)) -> DatasetResponse:
    result = get_dataset_for_workspace(user, workspace_id, dataset_id)
    return DatasetResponse(dataset=result["dataset"], columns=result["columns"], stats=result["stats"])


@app.delete("/api/workspaces/{workspace_id}/datasets/{dataset_id}")
def delete_dataset(workspace_id: int, dataset_id: int, user: dict = Depends(get_current_user)) -> dict:
    dataset = soft_delete_dataset_for_workspace(user, workspace_id, dataset_id)
    return {"success": True, "dataset": dataset}


@app.post("/api/workspaces/{workspace_id}/datasets/{dataset_id}/insights", response_model=DatasetInsightResponse)
async def workspace_dataset_insights(workspace_id: int, dataset_id: int, payload: DatasetInsightRequest, user: dict = Depends(get_current_user)) -> DatasetInsightResponse:
    ensure_feature_access(user, MODE_TO_FEATURE.get(payload.mode, "ai.insights"))
    enforce_ai_quota(user, workspace_id)
    await enforce_ai_rate_limit(user, workspace_id)
    result = workspace_dataset_insight(user, workspace_id, dataset_id, payload.model_dump())
    record_usage(
        workspace_id=workspace_id,
        user_id=int(user["id"]),
        metric="ai.request",
        units=int(result.get("tokens_estimated") or 1),
        dataset_id=dataset_id,
        endpoint=f"/api/workspaces/{workspace_id}/datasets/{dataset_id}/insights",
        metadata={"mode": payload.mode, "source": result.get("source"), "tokens_used": int(result.get("tokens_estimated") or 0)},
    )
    store_audit_event(
        workspace_id,
        int(user["id"]),
        "ai.insight_requested",
        "dataset",
        str(dataset_id),
        {"mode": payload.mode, "source": result.get("source")},
        event_type="ai_requests",
    )
    log_usage(user["id"], f"/api/workspaces/{workspace_id}/datasets/{dataset_id}/insights", payload.mode)
    return DatasetInsightResponse(success=True, answer=result["answer"], source=result["source"], profile=result.get("profile", {}))


@app.post("/api/workspaces/{workspace_id}/chats")
def create_workspace_chat(workspace_id: int, payload: WorkspaceChatCreateRequest, user: dict = Depends(require_feature("ai.chat"))) -> dict:
    chat = create_ai_chat(user, workspace_id, payload.dataset_id, payload.title)
    store_audit_event(
        workspace_id,
        int(user["id"]),
        "chat.created",
        "ai_chat",
        str(chat.get("id") or ""),
        {"dataset_id": payload.dataset_id, "title": payload.title},
        event_type="ai_requests",
    )
    return {"success": True, "chat": chat}


@app.post("/api/workspaces/{workspace_id}/chats/message")
async def workspace_chat_message(workspace_id: int, payload: WorkspaceChatRequest, user: dict = Depends(require_feature("ai.chat"))) -> dict:
    enforce_ai_quota(user, workspace_id)
    await enforce_ai_rate_limit(user, workspace_id)
    result = answer_workspace_chat(user, workspace_id, payload.model_dump())
    record_usage(
        workspace_id=workspace_id,
        user_id=int(user["id"]),
        metric="ai.request",
        units=int(result.get("tokens_estimated") or 1),
        dataset_id=payload.dataset_id,
        endpoint=f"/api/workspaces/{workspace_id}/chats/message",
        metadata={"mode": "chat", "source": result.get("source"), "tokens_used": int(result.get("tokens_estimated") or 0)},
    )
    store_audit_event(
        workspace_id,
        int(user["id"]),
        "ai.chat_message",
        "ai_chat",
        str((result.get("chat") or {}).get("id") or payload.chat_id or ""),
        {"dataset_id": payload.dataset_id, "source": result.get("source")},
        event_type="ai_requests",
    )
    log_usage(user["id"], f"/api/workspaces/{workspace_id}/chats/message", "chat")
    return result


@app.get("/api/workspaces/{workspace_id}/jobs/{job_id}", response_model=JobResponse)
def get_processing_job(workspace_id: int, job_id: int, user: dict = Depends(get_current_user)) -> JobResponse:
    result = get_job_for_workspace(user, workspace_id, job_id)
    return JobResponse(job=result["job"], events=result["events"])


@app.websocket("/api/ws/workspaces/{workspace_id}")
async def workspace_events_socket(websocket: WebSocket, workspace_id: int) -> None:
    token = websocket.query_params.get("token") or ""
    try:
        claims = verify_firebase_claims(token)
        user = upsert_user_from_claims(claims)
        require_workspace_access(user, workspace_id)
        await enforce_websocket_rate_limit(int(user["id"]), workspace_id)
    except Exception:
        await websocket.close(code=1008)
        return

    await websocket.accept()
    await websocket.send_json({"type": "connected", "workspace_id": workspace_id, "redis_configured": redis_configured()})

    client = get_redis_service().async_client()
    if client is None:
        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            return

    pubsub = client.pubsub()
    channel = f"ws:workspace:{workspace_id}"
    await pubsub.subscribe(channel)
    try:
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message and message.get("type") == "message":
                await websocket.send_text(str(message.get("data") or "{}"))
            await asyncio.sleep(0.05)
    except WebSocketDisconnect:
        return
    finally:
        await pubsub.unsubscribe(channel)
        await pubsub.aclose()


@app.post("/api/webhooks/razorpay")
async def razorpay_webhook(request: Request) -> dict:
    raw_body = await request.body()
    signature = request.headers.get("x-razorpay-signature", "")
    verify_razorpay_webhook_signature(raw_body, signature)

    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid Razorpay webhook JSON payload.") from exc
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Invalid Razorpay webhook payload.")

    event_name = str(payload.get("event") or "")
    payment_entity = razorpay_payload_entity(payload, "payment")
    order_entity = razorpay_payload_entity(payload, "order")
    razorpay_order_id = str(payment_entity.get("order_id") or order_entity.get("id") or "")
    razorpay_payment_id = str(payment_entity.get("id") or "")
    event_id = (
        request.headers.get("x-razorpay-event-id")
        or str(payload.get("id") or "")
        or hashlib.sha256(raw_body).hexdigest()
    )

    event_row, inserted = record_payment_webhook_event(
        event_id=event_id,
        event_name=event_name,
        payload=payload,
        razorpay_order_id=razorpay_order_id,
        razorpay_payment_id=razorpay_payment_id,
    )
    if not inserted:
        return {"success": True, "duplicate": True, "event_id": event_id, "status": event_row.get("status")}

    try:
        if event_name not in {"payment.authorized", "payment.captured", "payment.failed", "order.paid"}:
            finish_payment_webhook_event(event_id, "ignored")
            return {"success": True, "ignored": True, "event": event_name}

        if not razorpay_order_id:
            finish_payment_webhook_event(event_id, "failed", "Missing Razorpay order id.")
            return {"success": True, "processed": False, "reason": "missing_order_id"}

        if event_name in {"payment.authorized", "payment.failed"}:
            status = "processing" if event_name == "payment.authorized" else "failed"
            local_payment = mark_razorpay_payment_status(
                razorpay_order_id=razorpay_order_id,
                razorpay_payment_id=razorpay_payment_id,
                payment_status=status,
                razorpay_signature=f"webhook:{event_id}",
            )
            finish_payment_webhook_event(event_id, "processed" if local_payment else "unmatched")
            return {"success": True, "event": event_name, "payment_status": status, "matched": bool(local_payment)}

        local_payment = get_pending_payment_for_razorpay_order(razorpay_order_id)
        if not local_payment:
            finish_payment_webhook_event(event_id, "unmatched", "No local pending payment matched this Razorpay order.")
            return {"success": True, "event": event_name, "matched": False}

        if not razorpay_payment_id:
            finish_payment_webhook_event(event_id, "ignored", "Order paid webhook did not include a payment id.")
            return {"success": True, "event": event_name, "processed": False, "reason": "missing_payment_id"}

        try:
            razorpay_client = get_razorpay_client()
            razorpay_payment = razorpay_client.payment.fetch(razorpay_payment_id)
            razorpay_order = razorpay_client.order.fetch(razorpay_order_id)
        except Exception as exc:
            finish_payment_webhook_event(event_id, "retryable_error", str(exc))
            raise HTTPException(
                status_code=razorpay_error_status(exc),
                detail="Razorpay webhook could not confirm payment status. Retry requested.",
            ) from exc

        activate_subscription_from_payment(
            user_id=int(local_payment["user_id"]),
            razorpay_order_id=razorpay_order_id,
            razorpay_payment_id=razorpay_payment_id,
            razorpay_signature=f"webhook:{event_id}",
            razorpay_payment=razorpay_payment,
            razorpay_order=razorpay_order,
        )
        finish_payment_webhook_event(event_id, "processed")
        store_audit_event(
            None,
            int(local_payment["user_id"]),
            "payment.webhook_processed",
            "payment",
            razorpay_payment_id,
            {"event": event_name, "order_id": razorpay_order_id, "event_id": event_id},
            event_type="payments",
        )
        return {"success": True, "event": event_name, "payment_status": "paid", "matched": True}
    except HTTPException as exc:
        finish_payment_webhook_event(event_id, "failed", str(exc.detail))
        if exc.status_code >= 500:
            raise
        return {"success": True, "processed": False, "event": event_name, "detail": exc.detail}


@app.post("/api/create-order", response_model=CreateOrderResponse)
def create_order(payload: CreateOrderRequest, user: dict = Depends(get_current_user)) -> CreateOrderResponse:
    if not payload.plan_id:
        raise HTTPException(status_code=400, detail="A plan_id is required to create a subscription order.")

    plan = get_plan(payload.plan_id)
    amount = int(plan["monthly_price"])
    if amount < 100:
        raise HTTPException(status_code=400, detail="Minimum amount is 100 paise.")

    currency = payload.currency.upper()
    receipt = payload.receipt.strip() or f"adviso_{payload.plan_id}_{int(datetime.now(timezone.utc).timestamp())}"

    try:
        order = get_razorpay_client().order.create(
            {
                "amount": amount,
                "currency": currency,
                "receipt": receipt[:40],
                "payment_capture": 1,
                "notes": {
                    "user_id": str(user["id"]),
                    "plan_id": payload.plan_id,
                },
            }
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Razorpay order creation failed.", exc_info=exc)
        status_code = razorpay_error_status(exc)
        raise HTTPException(
            status_code=status_code,
            detail=(
                "Payment gateway authentication failed. Check the backend Razorpay key ID and secret pair."
                if status_code == 401
                else "Razorpay order creation failed."
            ),
        ) from exc

    create_pending_payment(
        user_id=user["id"],
        plan_id=payload.plan_id,
        order_id=order["id"],
        amount=order["amount"],
        currency=order["currency"],
    )

    return CreateOrderResponse(
        success=True,
        order_id=order["id"],
        amount=order["amount"],
        currency=order["currency"],
        payment_status="pending",
    )


@app.get("/api/payments/{razorpay_order_id}/status", response_model=PaymentStatusResponse)
def payment_status(razorpay_order_id: str, user: dict = Depends(get_current_user)) -> PaymentStatusResponse:
    if not razorpay_order_id.startswith("order_"):
        raise HTTPException(status_code=400, detail="Invalid payment order id.")
    return PaymentStatusResponse(**payment_status_payload(user, razorpay_order_id))


@app.post("/api/verify-payment", response_model=VerifyPaymentResponse)
def verify_payment(payload: VerifyPaymentRequest, user: dict = Depends(get_current_user)) -> VerifyPaymentResponse:
    if not payload.razorpay_order_id or not payload.razorpay_payment_id or not payload.razorpay_signature:
        raise HTTPException(status_code=400, detail="Missing Razorpay payment verification fields.")

    if not settings.razorpay_key_secret:
        raise HTTPException(status_code=500, detail="Razorpay signature secret is not configured on the backend.")

    signed_payload = f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}".encode("utf-8")
    expected_signature = hmac.new(
        settings.razorpay_key_secret.encode("utf-8"),
        signed_payload,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected_signature, payload.razorpay_signature):
        raise HTTPException(status_code=400, detail="Razorpay payment signature verification failed.")

    try:
        razorpay_client = get_razorpay_client()
        razorpay_payment = razorpay_client.payment.fetch(payload.razorpay_payment_id)
        razorpay_order = razorpay_client.order.fetch(payload.razorpay_order_id)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Razorpay payment status verification failed.", exc_info=exc)
        raise HTTPException(
            status_code=razorpay_error_status(exc),
            detail="Payment status could not be confirmed with Razorpay. Subscription was not activated.",
        ) from exc

    updated_user = activate_subscription_from_payment(
        user_id=user["id"],
        razorpay_order_id=payload.razorpay_order_id,
        razorpay_payment_id=payload.razorpay_payment_id,
        razorpay_signature=payload.razorpay_signature,
        razorpay_payment=razorpay_payment,
        razorpay_order=razorpay_order,
    )

    return VerifyPaymentResponse(
        success=True,
        order_id=payload.razorpay_order_id,
        payment_id=payload.razorpay_payment_id,
        session=session_payload(updated_user),
    )


@app.post("/api/analyze", response_model=AnalyzeResponse)
def analyze(payload: BusinessAnalysisRequest, user: dict = Depends(require_feature("ai.insights"))) -> AnalyzeResponse:
    if not payload.businessType or not payload.industry or not payload.strategicGoals:
        raise HTTPException(
            status_code=400,
            detail="BusinessType, industry, and strategicGoals are required.",
        )
    report, source = generate_report(payload)
    log_usage(user["id"], "/api/analyze", "strategy")
    return AnalyzeResponse(success=True, report=report, source=source)  # type: ignore[arg-type]


@app.post("/api/profit")
def profit(payload: ProfitRequest, user: dict = Depends(require_feature("profit.analyze"))) -> dict:
    log_usage(user["id"], "/api/profit", "profit")
    return profit_summary(payload.revenue, payload.cost)


@app.post("/api/budget")
def budget(payload: BudgetRequest, user: dict = Depends(require_feature("budget.plan"))) -> dict:
    log_usage(user["id"], "/api/budget", "budget")
    return budget_summary(payload.income, payload.expenses, payload.savings_target_percent)


@app.post("/api/sustainability")
def sustainability(payload: SustainabilityRequest, user: dict = Depends(require_feature("esg.analyze"))) -> dict:
    log_usage(user["id"], "/api/sustainability", "sustainability")
    return sustainability_summary(payload.budget, payload.green_spend, payload.energy_usage, payload.carbon_output)


@app.post("/api/competitor")
def competitor(payload: CompetitorRequest, user: dict = Depends(require_feature("competitor.analyze"))) -> dict:
    log_usage(user["id"], "/api/competitor", "competitor")
    return competitor_summary(payload.my_revenue, payload.their_revenue, payload.my_cost, payload.their_cost)


@app.post("/api/forecast")
def forecast(payload: ForecastRequest, user: dict = Depends(require_feature("forecast.run"))) -> dict:
    log_usage(user["id"], "/api/forecast", "forecast")
    return forecast_values(payload.values, payload.periods)


@app.post("/api/dataset/summary")
def summarize_dataset(payload: DatasetSummaryRequest, user: dict = Depends(require_feature("upload.csv"))) -> dict:
    log_usage(user["id"], "/api/dataset/summary", "dataset_summary")
    return dataset_summary(payload.rows)


@app.post("/api/dataset/insights", response_model=DatasetInsightResponse)
async def insight_dataset(payload: DatasetInsightRequest, user: dict = Depends(get_current_user)) -> DatasetInsightResponse:
    ensure_feature_access(user, MODE_TO_FEATURE.get(payload.mode, "ai.insights"))
    if payload.workspace_id and payload.dataset_id:
        enforce_ai_quota(user, payload.workspace_id)
        await enforce_ai_rate_limit(user, payload.workspace_id)
        result = workspace_dataset_insight(user, payload.workspace_id, payload.dataset_id, payload.model_dump())
        record_usage(
            workspace_id=payload.workspace_id,
            user_id=int(user["id"]),
            metric="ai.request",
            units=int(result.get("tokens_estimated") or 1),
            dataset_id=payload.dataset_id,
            endpoint="/api/dataset/insights",
            metadata={"mode": payload.mode, "source": result.get("source"), "tokens_used": int(result.get("tokens_estimated") or 0)},
        )
        log_usage(user["id"], "/api/dataset/insights", payload.mode)
        return DatasetInsightResponse(success=True, answer=result["answer"], source=result["source"], profile=result.get("profile", {}))
    result = dataset_insights(
        mode=payload.mode,
        rows=payload.rows,
        columns=payload.columns,
        question=payload.question,
        context=payload.context,
        workspace_id=payload.workspace_id,
        dataset_id=payload.dataset_id,
    )
    log_usage(user["id"], "/api/dataset/insights", payload.mode)
    return DatasetInsightResponse(success=True, **result)


@app.post("/api/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest, user: dict = Depends(require_feature("ai.chat"))) -> ChatResponse:
    if payload.workspace_id:
        enforce_ai_quota(user, payload.workspace_id)
        await enforce_ai_rate_limit(user, payload.workspace_id)
        result = answer_workspace_chat(user, payload.workspace_id, payload.model_dump())
        record_usage(
            workspace_id=payload.workspace_id,
            user_id=int(user["id"]),
            metric="ai.request",
            units=int(result.get("tokens_estimated") or 1),
            dataset_id=payload.dataset_id,
            endpoint="/api/chat",
            metadata={"mode": "chat", "source": result.get("source"), "tokens_used": int(result.get("tokens_estimated") or 0)},
        )
        log_usage(user["id"], "/api/chat", "chat")
        return ChatResponse(success=True, answer=result["answer"], source=result["source"])
    result = dataset_insights(
        "chat",
        payload.rows,
        payload.columns,
        question=payload.question,
        context=payload.context,
        workspace_id=payload.workspace_id,
        dataset_id=payload.dataset_id,
    )
    log_usage(user["id"], "/api/chat", "chat")
    return ChatResponse(success=True, answer=result["answer"], source=result["source"])


@app.get("/api/admin/users")
def admin_users(_: dict = Depends(ensure_admin)) -> dict:
    return {"success": True, "users": admin_list("users")}


@app.get("/api/admin/payments")
def admin_payments(_: dict = Depends(ensure_admin)) -> dict:
    return {"success": True, "payments": admin_list("payments")}


@app.get("/api/admin/subscriptions")
def admin_subscriptions(_: dict = Depends(ensure_admin)) -> dict:
    return {"success": True, "subscriptions": admin_list("subscriptions")}


@app.get("/api/admin/usage")
def admin_usage(_: dict = Depends(ensure_admin)) -> dict:
    return {"success": True, "usage": admin_list("usage_logs")}


frontend_dist = Path(__file__).resolve().parents[2] / "dist"
assets_dir = frontend_dist / "assets"

if assets_dir.exists():
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")


@app.get("/{path:path}", include_in_schema=False)
def serve_frontend(path: str) -> FileResponse:
    index_file = frontend_dist / "index.html"
    requested_file = frontend_dist / path
    if requested_file.is_file():
        return FileResponse(requested_file)
    if index_file.exists():
        return FileResponse(index_file)
    raise HTTPException(status_code=404, detail="Frontend build not found. Run npm run build first.")
