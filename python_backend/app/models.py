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


class CreateOrderRequest(BaseModel):
    plan_id: str = Field(default="", max_length=32)
    amount: int | None = Field(default=None, ge=100)
    currency: str = Field(default="INR", min_length=3, max_length=3)
    receipt: str = Field(default="", max_length=40)


class CreateOrderResponse(BaseModel):
    success: bool
    order_id: str
    amount: int
    currency: str


class VerifyPaymentRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str


class VerifyPaymentResponse(BaseModel):
    success: bool
    order_id: str
    payment_id: str
    session: dict = Field(default_factory=dict)


class MeResponse(BaseModel):
    success: bool
    user: dict
    subscription: dict
    permissions: dict


class WorkspaceCreateRequest(BaseModel):
    name: str = Field(default="My Workspace", min_length=1, max_length=120)


class WorkspaceResponse(BaseModel):
    success: bool = True
    workspace: dict


class WorkspacesResponse(BaseModel):
    success: bool = True
    workspaces: list[dict] = Field(default_factory=list)


class UploadInitRequest(BaseModel):
    file_name: str = Field(min_length=1, max_length=255)
    size_bytes: int = Field(ge=1)
    content_type: str = Field(default="text/csv", max_length=120)
    checksum_sha256: str = Field(default="", max_length=128)


class UploadCompleteRequest(BaseModel):
    storage_path: str = Field(default="", max_length=1024)
    checksum_sha256: str = Field(default="", max_length=128)
    size_bytes: int | None = Field(default=None, ge=1)


class UploadInitResponse(BaseModel):
    success: bool = True
    dataset: dict
    upload: dict


class DatasetListResponse(BaseModel):
    success: bool = True
    datasets: list[dict] = Field(default_factory=list)


class DatasetResponse(BaseModel):
    success: bool = True
    dataset: dict
    columns: list[dict] = Field(default_factory=list)
    stats: dict = Field(default_factory=dict)


class UploadCompleteResponse(BaseModel):
    success: bool = True
    dataset: dict
    job: dict


class JobResponse(BaseModel):
    success: bool = True
    job: dict
    events: list[dict] = Field(default_factory=list)


class AccountPreferencesUpdate(BaseModel):
    theme: str | None = Field(default=None, max_length=32)
    language: str | None = Field(default=None, max_length=64)
    timezone: str | None = Field(default=None, max_length=64)
    email_notifications: bool | None = None
    product_updates: bool | None = None
    security_alerts: bool | None = None


class PaymentPreferenceUpdate(BaseModel):
    preferred_method: str | None = Field(default=None, max_length=32)
    upi_id: str | None = Field(default=None, max_length=120)
    billing_name: str | None = Field(default=None, max_length=120)
    billing_email: str | None = Field(default=None, max_length=180)
    billing_phone: str | None = Field(default=None, max_length=32)
    notes: str | None = Field(default=None, max_length=500)


class AccountSettingsResponse(BaseModel):
    success: bool
    user: dict
    subscription: dict
    plan: dict
    permissions: dict
    preferences: dict
    payment_preference: dict = Field(default_factory=dict)
    payments: list[dict] = Field(default_factory=list)
    usage: list[dict] = Field(default_factory=list)
    activity: dict = Field(default_factory=dict)
