import json
import re

from openai import OpenAI

from app.config import get_settings
from app.models import (
    BusinessAnalysisRequest,
    KpiForecastPoint,
    Recommendation,
    ScenarioResult,
    StrategicReport,
)


def _extract_numbers(text: str) -> list[float]:
    return [float(match.replace(",", "")) for match in re.findall(r"-?\d+(?:,\d{3})*(?:\.\d+)?", text or "")]


def _estimate_score(payload: BusinessAnalysisRequest) -> int:
    revenue_numbers = _extract_numbers(payload.revenueDesc)
    burn_numbers = _extract_numbers(payload.burnRateDesc)
    revenue = max(revenue_numbers) if revenue_numbers else 0
    burn = max(burn_numbers) if burn_numbers else 0
    ratio = revenue / burn if burn > 0 else 1.8

    score = 62
    score += min(18, int(ratio * 6))
    score += 7 if payload.strategicGoals.strip() else 0
    score += 5 if payload.industry.strip() else 0
    score -= 6 if any(word in payload.obstaclesDesc.lower() for word in ["churn", "cash", "debt", "delay", "risk"]) else 0
    return max(35, min(94, score))


def fallback_report(payload: BusinessAnalysisRequest) -> StrategicReport:
    score = _estimate_score(payload)
    is_msme = payload.businessType == "MSME"
    is_startup = payload.businessType == "Startup"
    business_name = payload.businessName or "your business"

    focus = "working capital discipline and repeat customer velocity" if is_msme else "retention, runway, and scalable acquisition"
    if payload.businessType == "Analyst":
        focus = "data-quality controls, KPI governance, and scenario interpretation"
    elif payload.businessType == "Founder" and not is_startup:
        focus = "leadership alignment, operating cadence, and margin expansion"

    reasoning = (
        f"Based on {business_name} in {payload.industry}, the strongest leverage area is {focus}. "
        f"The goal '{payload.strategicGoals}' is achievable if near-term decisions are tied to measurable cash, conversion, and execution checkpoints."
    )

    recommendations = [
        Recommendation(
            title="Prioritize the highest-margin operating channel",
            impact="High",
            confidence=min(94, score + 8),
            justification=(
                "Current inputs indicate the business should focus resources on channels that improve revenue quality "
                "while reducing avoidable operational drag."
            ),
            actionSteps=[
                "Rank channels by revenue contribution, cost burden, and conversion reliability.",
                "Move 10 to 15 percent of discretionary effort toward the top channel for two review cycles.",
                "Create a weekly KPI review covering cash, conversion, retention, and delivery speed.",
            ],
        ),
        Recommendation(
            title="Build a compact what-if decision cadence",
            impact="Medium",
            confidence=max(60, score - 4),
            justification=(
                "Structured scenario review reduces decision delay and makes risk visible before budget is committed."
            ),
            actionSteps=[
                "Define base, conservative, and aggressive cases for the next quarter.",
                "Attach each case to one owner, one metric, and one stop-loss threshold.",
                "Review outcomes every Friday and record the next action before the next cycle begins.",
            ],
        ),
    ]

    if is_startup:
        recommendations.append(
            Recommendation(
                title="Extend runway through acquisition efficiency controls",
                impact="High",
                confidence=max(70, score - 2),
                justification="Runway improves when acquisition experiments are funded only after clear signal thresholds are met.",
                actionSteps=[
                    "Freeze low-signal spend until conversion evidence is visible.",
                    "Consolidate unused tools and duplicated subscriptions.",
                    "Track CAC payback and activation rate before expanding campaigns.",
                ],
            )
        )

    scenario_analysis = [
        ScenarioResult(
            scenario="Shift 15 percent of effort into the strongest acquisition or retention channel",
            outcome="Expected improvement in execution focus, faster feedback loops, and a more reliable revenue pipeline.",
            riskLevel="Low",
        ),
        ScenarioResult(
            scenario="Increase pricing or package value by 8 to 12 percent",
            outcome="Margin can improve if paired with clearer positioning and controlled churn monitoring.",
            riskLevel="Medium",
        ),
    ]

    kpi_forecast = [
        KpiForecastPoint(timeframe="Current", revenueGrowthRate=1.00, efficiencyFactor=1.00),
        KpiForecastPoint(timeframe="Projected Q1", revenueGrowthRate=1.10, efficiencyFactor=1.12),
        KpiForecastPoint(timeframe="Projected Q2", revenueGrowthRate=1.22, efficiencyFactor=1.24),
        KpiForecastPoint(timeframe="Projected Q3", revenueGrowthRate=1.35, efficiencyFactor=1.33),
        KpiForecastPoint(timeframe="Projected Q4", revenueGrowthRate=1.50, efficiencyFactor=1.42),
    ]

    return StrategicReport(
        score=score,
        reasoning=reasoning,
        recommendations=recommendations,
        scenarioAnalysis=scenario_analysis,
        kpiForecast=kpi_forecast,
    )


def generate_ai_report(payload: BusinessAnalysisRequest) -> StrategicReport | None:
    settings = get_settings()
    if not settings.openai_api_key:
        return None

    client = OpenAI(api_key=settings.openai_api_key)
    prompt = {
        "businessName": payload.businessName,
        "businessType": payload.businessType,
        "industry": payload.industry,
        "revenueDesc": payload.revenueDesc,
        "burnRateDesc": payload.burnRateDesc,
        "strategicGoals": payload.strategicGoals,
        "obstaclesDesc": payload.obstaclesDesc,
    }

    try:
        response = client.chat.completions.create(
            model=settings.ai_model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are Adviso AI, a business strategy analyst. Return only JSON with keys "
                        "score, reasoning, recommendations, scenarioAnalysis, and kpiForecast. "
                        "Use concise professional language and no markdown."
                    ),
                },
                {"role": "user", "content": json.dumps(prompt)},
            ],
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content or ""
        return StrategicReport.model_validate_json(content)
    except Exception:
        return None


def generate_report(payload: BusinessAnalysisRequest) -> tuple[StrategicReport, str]:
    ai_report = generate_ai_report(payload)
    if ai_report:
        return ai_report, "ai"
    return fallback_report(payload), "fallback"
