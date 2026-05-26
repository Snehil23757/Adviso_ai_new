from datetime import datetime, timezone
import hashlib
import hmac
import logging
from pathlib import Path
import asyncio

import razorpay
from fastapi import Depends, FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.auth import verify_firebase_claims
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
    ProfitRequest,
    SustainabilityRequest,
    UploadCompleteRequest,
    UploadCompleteResponse,
    UploadInitRequest,
    UploadInitResponse,
    VerifyPaymentRequest,
    VerifyPaymentResponse,
    WorkspaceCreateRequest,
    WorkspaceResponse,
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
from app.database import initialize_database
from app.queueing import redis_configured, redis_health
from app.services.redis_service import get_redis_service
from app.saas import (
    MODE_TO_FEATURE,
    account_settings_payload,
    activate_subscription_from_payment,
    admin_list,
    create_pending_payment,
    ensure_admin,
    ensure_feature_access,
    get_current_user,
    get_plan,
    log_usage,
    require_feature,
    session_payload,
    update_account_preferences,
    update_payment_preference,
    upsert_user_from_claims,
)
from app.workspaces import (
    complete_dataset_upload,
    create_workspace_for_user,
    get_dataset_for_workspace,
    get_job_for_workspace,
    init_dataset_upload,
    list_datasets_for_workspace,
    list_workspaces_for_user,
    require_workspace_access,
)


settings = get_settings()
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


@app.middleware("http")
async def redis_rate_limit_middleware(request: Request, call_next):
    path = request.url.path
    if not path.startswith("/api/") or path in {"/api/health", "/api/health/redis"}:
        return await call_next(request)

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
    if limit.get("available"):
        response.headers["X-RateLimit-Limit"] = str(limit.get("limit") or settings.rate_limit_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(limit.get("remaining") or 0)
        response.headers["X-RateLimit-Reset"] = str(limit.get("reset_seconds") or 60)
    return response


def get_razorpay_client() -> razorpay.Client:
    if not settings.razorpay_key_id or not settings.razorpay_key_secret:
        raise HTTPException(
            status_code=500,
            detail="Razorpay is not configured on the backend.",
        )
    return razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))


def razorpay_error_status(error: Exception) -> int:
    message = str(error).lower()
    if "auth" in message or "credential" in message or "key" in message:
        return 401
    return 500

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
        "redis": redis_health(),
    }


@app.get("/api/health/redis")
def redis_health_check() -> dict:
    health_payload = redis_health()
    return {"status": "ok" if health_payload.get("available") else "degraded", "redis": health_payload}


@app.get("/api/metrics")
def metrics() -> dict:
    return {
        "avgDecisionReductionDays": 95,
        "manualAnalysisTimeReduction": 40,
        "activeAgentsSimulated": 1420,
        "recommendationsGeneratedTotal": 12480,
        "supportedPipelines": ["CRM", "Spreadsheets", "Stripe", "QuickBooks", "ERP", "Analytics Hub"],
    }


@app.get("/api/me", response_model=MeResponse)
def me(user: dict = Depends(get_current_user)) -> dict:
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


@app.get("/api/workspaces", response_model=WorkspacesResponse)
def workspaces(user: dict = Depends(get_current_user)) -> WorkspacesResponse:
    return WorkspacesResponse(workspaces=list_workspaces_for_user(user))


@app.post("/api/workspaces", response_model=WorkspaceResponse)
def create_workspace(payload: WorkspaceCreateRequest, user: dict = Depends(get_current_user)) -> WorkspaceResponse:
    return WorkspaceResponse(workspace=create_workspace_for_user(user, payload.name))


@app.get("/api/workspaces/{workspace_id}", response_model=WorkspaceResponse)
def get_workspace(workspace_id: int, user: dict = Depends(get_current_user)) -> WorkspaceResponse:
    return WorkspaceResponse(workspace=require_workspace_access(user, workspace_id))


@app.post("/api/workspaces/{workspace_id}/uploads/init", response_model=UploadInitResponse)
def init_upload(workspace_id: int, payload: UploadInitRequest, user: dict = Depends(require_feature("upload.csv"))) -> UploadInitResponse:
    result = init_dataset_upload(user, workspace_id, payload.model_dump())
    return UploadInitResponse(dataset=result["dataset"], upload=result["upload"])


@app.post("/api/workspaces/{workspace_id}/uploads/{dataset_id}/complete", response_model=UploadCompleteResponse)
def complete_upload(workspace_id: int, dataset_id: int, payload: UploadCompleteRequest, user: dict = Depends(require_feature("upload.csv"))) -> UploadCompleteResponse:
    result = complete_dataset_upload(user, workspace_id, dataset_id, payload.model_dump(exclude_none=True))
    return UploadCompleteResponse(dataset=result["dataset"], job=result["job"])


@app.get("/api/workspaces/{workspace_id}/datasets", response_model=DatasetListResponse)
def list_datasets(workspace_id: int, user: dict = Depends(get_current_user)) -> DatasetListResponse:
    return DatasetListResponse(datasets=list_datasets_for_workspace(user, workspace_id))


@app.get("/api/workspaces/{workspace_id}/datasets/{dataset_id}", response_model=DatasetResponse)
def get_dataset(workspace_id: int, dataset_id: int, user: dict = Depends(get_current_user)) -> DatasetResponse:
    result = get_dataset_for_workspace(user, workspace_id, dataset_id)
    return DatasetResponse(dataset=result["dataset"], columns=result["columns"], stats=result["stats"])


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
    )


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

    updated_user = activate_subscription_from_payment(
        user_id=user["id"],
        razorpay_order_id=payload.razorpay_order_id,
        razorpay_payment_id=payload.razorpay_payment_id,
        razorpay_signature=payload.razorpay_signature,
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
def insight_dataset(payload: DatasetInsightRequest, user: dict = Depends(get_current_user)) -> DatasetInsightResponse:
    ensure_feature_access(user, MODE_TO_FEATURE.get(payload.mode, "ai.insights"))
    result = dataset_insights(
        mode=payload.mode,
        rows=payload.rows,
        columns=payload.columns,
        question=payload.question,
        context=payload.context,
    )
    log_usage(user["id"], "/api/dataset/insights", payload.mode)
    return DatasetInsightResponse(success=True, **result)


@app.post("/api/chat", response_model=ChatResponse)
def chat(payload: ChatRequest, user: dict = Depends(require_feature("ai.chat"))) -> ChatResponse:
    result = dataset_insights("chat", payload.rows, payload.columns, question=payload.question)
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
