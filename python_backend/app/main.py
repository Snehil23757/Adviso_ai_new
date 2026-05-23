from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.models import (
    AnalyzeResponse,
    BudgetRequest,
    BusinessAnalysisRequest,
    ChatRequest,
    ChatResponse,
    CompetitorRequest,
    DatasetSummaryRequest,
    ForecastRequest,
    ProfitRequest,
    SustainabilityRequest,
)
from app.services.analytics import (
    budget_summary,
    competitor_summary,
    data_chat_response,
    dataset_summary,
    forecast_values,
    profit_summary,
    sustainability_summary,
)
from app.services.strategy import generate_report


settings = get_settings()

app = FastAPI(
    title="Adviso AI Python Backend",
    version="1.0.0",
    description="Python services for Adviso AI strategy analysis and business analytics.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "Adviso AI - Python Decision Intelligence Layer",
    }


@app.get("/api/metrics")
def metrics() -> dict:
    return {
        "avgDecisionReductionDays": 95,
        "manualAnalysisTimeReduction": 40,
        "activeAgentsSimulated": 1420,
        "recommendationsGeneratedTotal": 12480,
        "supportedPipelines": ["CRM", "Spreadsheets", "Stripe", "QuickBooks", "ERP", "Analytics Hub"],
    }


@app.post("/api/analyze", response_model=AnalyzeResponse)
def analyze(payload: BusinessAnalysisRequest) -> AnalyzeResponse:
    if not payload.businessType or not payload.industry or not payload.strategicGoals:
        raise HTTPException(
            status_code=400,
            detail="BusinessType, industry, and strategicGoals are required.",
        )
    report, source = generate_report(payload)
    return AnalyzeResponse(success=True, report=report, source=source)  # type: ignore[arg-type]


@app.post("/api/profit")
def profit(payload: ProfitRequest) -> dict:
    return profit_summary(payload.revenue, payload.cost)


@app.post("/api/budget")
def budget(payload: BudgetRequest) -> dict:
    return budget_summary(payload.income, payload.expenses, payload.savings_target_percent)


@app.post("/api/sustainability")
def sustainability(payload: SustainabilityRequest) -> dict:
    return sustainability_summary(payload.budget, payload.green_spend, payload.energy_usage, payload.carbon_output)


@app.post("/api/competitor")
def competitor(payload: CompetitorRequest) -> dict:
    return competitor_summary(payload.my_revenue, payload.their_revenue, payload.my_cost, payload.their_cost)


@app.post("/api/forecast")
def forecast(payload: ForecastRequest) -> dict:
    return forecast_values(payload.values, payload.periods)


@app.post("/api/dataset/summary")
def summarize_dataset(payload: DatasetSummaryRequest) -> dict:
    return dataset_summary(payload.rows)


@app.post("/api/chat", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    answer = data_chat_response(payload.question, payload.rows, payload.columns)
    return ChatResponse(success=True, answer=answer, source="local")


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
