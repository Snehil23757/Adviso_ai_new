from typing import Literal

from pydantic import BaseModel, Field


BusinessType = Literal["MSME", "Startup", "Founder", "Analyst"]
ImpactLevel = Literal["High", "Medium", "Low"]
RiskLevel = Literal["High", "Medium", "Low"]


class BusinessAnalysisRequest(BaseModel):
    businessName: str = ""
    businessType: BusinessType
    industry: str
    revenueDesc: str = ""
    burnRateDesc: str = ""
    strategicGoals: str
    obstaclesDesc: str = ""


class Recommendation(BaseModel):
    title: str
    impact: ImpactLevel
    confidence: int = Field(ge=0, le=100)
    justification: str
    actionSteps: list[str]


class ScenarioResult(BaseModel):
    scenario: str
    outcome: str
    riskLevel: RiskLevel


class KpiForecastPoint(BaseModel):
    timeframe: str
    revenueGrowthRate: float
    efficiencyFactor: float


class StrategicReport(BaseModel):
    score: int = Field(ge=0, le=100)
    reasoning: str
    recommendations: list[Recommendation]
    scenarioAnalysis: list[ScenarioResult]
    kpiForecast: list[KpiForecastPoint]


class AnalyzeResponse(BaseModel):
    success: bool
    report: StrategicReport
    source: Literal["ai", "fallback"]


class ProfitRequest(BaseModel):
    revenue: float = 0
    cost: float = 0


class BudgetRequest(BaseModel):
    income: float = 0
    expenses: float = 0
    savings_target_percent: float = 20


class SustainabilityRequest(BaseModel):
    budget: float = 0
    green_spend: float = 0
    energy_usage: float = 0
    carbon_output: float = 0


class CompetitorRequest(BaseModel):
    my_revenue: float = 0
    their_revenue: float = 0
    my_cost: float = 0
    their_cost: float = 0


class ForecastRequest(BaseModel):
    values: list[float]
    periods: int = Field(default=3, ge=1, le=24)


class DatasetSummaryRequest(BaseModel):
    rows: list[dict]


class DatasetInsightRequest(BaseModel):
    rows: list[dict]
    columns: list[str] = []
    mode: str = "overview"
    question: str = ""
    context: dict = Field(default_factory=dict)


class DatasetInsightResponse(BaseModel):
    success: bool
    answer: str
    source: Literal["ai", "local"]
    profile: dict = Field(default_factory=dict)


class ChatRequest(BaseModel):
    question: str
    rows: list[dict]
    columns: list[str] = []


class ChatResponse(BaseModel):
    success: bool
    answer: str
    source: Literal["ai", "local"]
