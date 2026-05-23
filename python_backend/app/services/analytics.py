import json
import math
import re
from statistics import mean, median, pstdev

import numpy as np
from openai import OpenAI
from sklearn.linear_model import LinearRegression

from app.config import get_settings


NUMBER_RE = re.compile(r"^[+-]?\d+(?:\.\d+)?$")


def parse_number(value) -> float | None:
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, int | float):
        return float(value) if math.isfinite(float(value)) else None
    if isinstance(value, str):
        text = value.strip()
        if not text or text.lower() in {"na", "n/a", "null"}:
            return None
        cleaned = re.sub(r"(₹|â‚¹|rs\.?|inr)", "", text, flags=re.IGNORECASE)
        cleaned = re.sub(r"[$€£,\s]", "", cleaned).removesuffix("%")
        if re.fullmatch(r"\([+-]?\d+(?:\.\d+)?\)", cleaned):
            cleaned = f"-{cleaned[1:-1]}"
        if not NUMBER_RE.fullmatch(cleaned):
            return None
        try:
            return float(cleaned)
        except ValueError:
            return None
    return None


def _ordered_columns(rows: list[dict], preferred: list[str] | None = None) -> list[str]:
    columns: list[str] = []
    for column in preferred or []:
        if column not in columns:
            columns.append(column)
    for row in rows:
        for column in row.keys():
            if column not in columns:
                columns.append(column)
    return columns


def profile_dataset(rows: list[dict], columns: list[str] | None = None) -> dict:
    selected_columns = _ordered_columns(rows, columns)
    row_count = len(rows)
    profiles: list[dict] = []

    for column in selected_columns:
        raw_values = [row.get(column) for row in rows]
        present_values = [value for value in raw_values if value not in (None, "")]
        missing = row_count - len(present_values)
        numeric_values = [parsed for value in present_values if (parsed := parse_number(value)) is not None]
        numeric_ratio = (len(numeric_values) / len(present_values)) if present_values else 0
        value_counts: dict[str, int] = {}
        for value in present_values:
            key = str(value)[:120]
            value_counts[key] = value_counts.get(key, 0) + 1

        top_values = [
            {"value": key, "count": count}
            for key, count in sorted(value_counts.items(), key=lambda item: item[1], reverse=True)[:8]
        ]

        stats = None
        if numeric_values and numeric_ratio >= 0.6:
            sorted_values = sorted(numeric_values)
            stats = {
                "count": len(numeric_values),
                "sum": round(sum(numeric_values), 2),
                "min": round(min(numeric_values), 2),
                "max": round(max(numeric_values), 2),
                "mean": round(mean(numeric_values), 2),
                "median": round(median(numeric_values), 2),
                "std": round(pstdev(numeric_values), 2) if len(numeric_values) > 1 else 0,
            }

        profiles.append(
            {
                "name": column,
                "type": "number" if stats else "category",
                "missing": missing,
                "missingPercent": round((missing / row_count * 100) if row_count else 0, 2),
                "unique": len(value_counts),
                "numeric": stats,
                "topValues": top_values,
            }
        )

    numeric_columns = [profile["name"] for profile in profiles if profile["type"] == "number"]
    category_columns = [profile["name"] for profile in profiles if profile["type"] != "number"]
    missing_columns = [profile for profile in profiles if profile["missing"] > 0]

    return {
        "rowCount": row_count,
        "columnCount": len(selected_columns),
        "columns": selected_columns,
        "numericColumns": numeric_columns,
        "categoryColumns": category_columns,
        "profiles": profiles,
        "sampleRows": rows[:8],
        "quality": {
            "missingCellCount": sum(profile["missing"] for profile in profiles),
            "columnsWithMissing": len(missing_columns),
            "numericColumnCount": len(numeric_columns),
            "categoryColumnCount": len(category_columns),
        },
    }


def _local_insight_text(mode: str, profile: dict, question: str = "", context: dict | None = None) -> str:
    rows = profile["rowCount"]
    cols = profile["columnCount"]
    numeric_profiles = [item for item in profile["profiles"] if item["type"] == "number"]
    category_profiles = [item for item in profile["profiles"] if item["type"] != "number"]
    missing_profiles = [item for item in profile["profiles"] if item["missing"] > 0]

    if not rows:
        return "Upload a CSV dataset first. I need rows before I can calculate insights."

    leading_numeric = numeric_profiles[:5]
    leading_categories = category_profiles[:4]

    if mode == "chat" and question:
        lower = question.lower()
        if "missing" in lower or "null" in lower or "blank" in lower:
            if not missing_profiles:
                return f"The uploaded dataset has {rows} rows and no missing values in the detected columns."
            parts = [f"{item['name']}: {item['missing']} missing ({item['missingPercent']}%)" for item in missing_profiles[:8]]
            return "Missing-value profile: " + "; ".join(parts) + "."
        for item in numeric_profiles:
            if item["name"].lower() in lower:
                stats = item["numeric"]
                return (
                    f"{item['name']} has {stats['count']} numeric values, total {stats['sum']}, "
                    f"average {stats['mean']}, median {stats['median']}, min {stats['min']}, and max {stats['max']}."
                )

    if mode == "ideas":
        category_hint = leading_categories[0]["name"] if leading_categories else "customer segment"
        metric_hint = leading_numeric[0]["name"] if leading_numeric else "revenue or volume"
        return (
            f"Data-backed idea set: segment the business by {category_hint}, rank each segment by {metric_hint}, "
            "then prioritize the top segment for pricing tests, bundled offers, and retention campaigns. "
            "Use the lowest-performing segment as the cost-control lane and validate whether inventory, discounting, "
            "or service friction is driving underperformance."
        )

    if mode == "forecast":
        if not leading_numeric:
            return "Forecasting needs at least one numeric column. I did not detect a reliable numeric series in this CSV."
        stats = leading_numeric[0]["numeric"]
        return (
            f"The best default forecast candidate is {leading_numeric[0]['name']}. Its average is {stats['mean']} "
            f"with a range from {stats['min']} to {stats['max']}. Use a time/order column if available to make the forecast more reliable."
        )

    if mode == "strategy":
        numeric_focus = ", ".join(item["name"] for item in leading_numeric) or "no numeric metrics detected"
        category_focus = ", ".join(item["name"] for item in leading_categories) or "no categorical segments detected"
        return (
            f"Dataset-driven strategy: this file has {rows} rows and {cols} columns. "
            f"Primary measurable fields are {numeric_focus}. Segment fields are {category_focus}. "
            "Recommended next actions: clean missing fields, identify the strongest segment by total value, "
            "compare discount or cost indicators against outcomes, and create a monitoring KPI from the most stable numeric column."
        )

    if mode == "profit":
        revenue_value = (context or {}).get("revenueValue")
        cost_value = (context or {}).get("costValue")
        profit_value = (context or {}).get("profitValue")
        if isinstance(revenue_value, int | float) and isinstance(cost_value, int | float):
            margin = (profit_value / revenue_value * 100) if revenue_value else 0
            return (
                f"Profit view: selected revenue total is {round(revenue_value, 2)}, selected cost total is {round(cost_value, 2)}, "
                f"and calculated profit is {round(float(profit_value or 0), 2)} with margin {round(margin, 2)}%. "
                "Prioritize high-value segments, inspect discount leakage, and compare cost-heavy rows against rating or outcome fields."
            )

    if mode in {"budget", "sustainability", "competitor", "kpi"}:
        metric_hint = leading_numeric[0]["name"] if leading_numeric else "a reliable numeric KPI"
        segment_hint = leading_categories[0]["name"] if leading_categories else "a business segment"
        return (
            f"{mode.title()} insight: use {metric_hint} as the measurable anchor and split it by {segment_hint}. "
            "Review top and bottom segments, missing data, and outlier rows before taking action. "
            "The backend has calculated the schema profile and can enrich this with OpenAI once OPENAI_API_KEY is configured."
        )

    parts = [
        f"Dataset profile: {rows} rows, {cols} columns, {len(numeric_profiles)} numeric columns, and {len(category_profiles)} categorical columns."
    ]
    if leading_numeric:
        parts.append(
            "Numeric highlights: "
            + "; ".join(
                f"{item['name']} avg {item['numeric']['mean']} range {item['numeric']['min']} to {item['numeric']['max']}"
                for item in leading_numeric
            )
            + "."
        )
    if missing_profiles:
        parts.append(
            "Data quality watchlist: "
            + "; ".join(f"{item['name']} {item['missingPercent']}% missing" for item in missing_profiles[:5])
            + "."
        )
    else:
        parts.append("Data quality: no missing values detected in the uploaded sample.")
    return " ".join(parts)


def _ai_dataset_insight(mode: str, profile: dict, question: str = "", context: dict | None = None) -> str | None:
    settings = get_settings()
    if not settings.openai_api_key:
        return None

    compact_profile = {
        "rowCount": profile["rowCount"],
        "columnCount": profile["columnCount"],
        "numericColumns": profile["numericColumns"][:12],
        "categoryColumns": profile["categoryColumns"][:12],
        "quality": profile["quality"],
        "profiles": profile["profiles"][:18],
        "sampleRows": profile["sampleRows"][:5],
        "context": context or {},
    }

    system = (
        "You are Adviso AI, a senior business data analyst. Use only the dataset profile and sample rows provided. "
        "Give concise, concrete, data-driven insights. Do not invent facts. Do not use emojis. "
        "Return clean markdown without code fences. Use these sections when relevant: "
        "## Executive Summary, ## Key Findings, ## Recommended Actions, ## Data Needed. "
        "Use short bullets under each heading. Bold only the lead phrase of a bullet. "
        "If the profile is insufficient, say what column or data is needed."
    )
    user = {
        "mode": mode,
        "question": question,
        "datasetProfile": compact_profile,
        "requiredStyle": (
            "professional BI report; clean markdown only; headings and bullet points; "
            "no raw JSON; no emojis; no long paragraphs"
        ),
    }

    try:
        client = OpenAI(api_key=settings.openai_api_key)
        response = client.chat.completions.create(
            model=settings.ai_model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": json.dumps(user)},
            ],
            temperature=0.2,
        )
        return response.choices[0].message.content or None
    except Exception as exc:
        error_text = str(exc)
        if "invalid_api_key" in error_text or "Incorrect API key" in error_text or "401" in error_text:
            return (
                "OpenAI request failed: the request reached the API, but the key was rejected with 401 invalid_api_key. "
                "I used local backend analysis instead. Replace OPENAI_API_KEY in python_backend/.env with a valid active key, then restart the backend."
            )
        return "OpenAI request failed, so I used local backend analysis instead. Check backend logs and API account status."


def dataset_insights(mode: str, rows: list[dict], columns: list[str] | None = None, question: str = "", context: dict | None = None) -> dict:
    profile = profile_dataset(rows, columns)
    ai_answer = _ai_dataset_insight(mode, profile, question, context)
    if ai_answer and not ai_answer.startswith("OpenAI request failed"):
        return {"answer": ai_answer, "source": "ai", "profile": profile}

    local = _local_insight_text(mode, profile, question, context)
    if ai_answer:
        local = f"{local}\n\n{ai_answer}"
    return {"answer": local, "source": "local", "profile": profile}


def profit_summary(revenue: float, cost: float) -> dict:
    profit = revenue - cost
    margin = (profit / revenue * 100) if revenue else 0
    return {
        "revenue": revenue,
        "cost": cost,
        "profit": profit,
        "marginPercent": round(margin, 2),
        "status": "profitable" if profit >= 0 else "loss",
    }


def budget_summary(income: float, expenses: float, savings_target_percent: float) -> dict:
    surplus = income - expenses
    target = income * (savings_target_percent / 100) if income else 0
    return {
        "income": income,
        "expenses": expenses,
        "surplus": surplus,
        "targetSavings": round(target, 2),
        "targetGap": round(target - max(0, surplus), 2),
        "recommendation": "Hold current budget" if surplus >= target else "Reduce discretionary spend or raise inflow",
    }


def sustainability_summary(budget: float, green_spend: float, energy_usage: float, carbon_output: float) -> dict:
    green_ratio = (green_spend / budget * 100) if budget else 0
    efficiency_score = max(0, 100 - (energy_usage * 0.04) - (carbon_output * 0.6) + green_ratio * 0.5)
    return {
        "greenSpendRatioPercent": round(green_ratio, 2),
        "efficiencyScore": round(min(100, efficiency_score), 2),
        "priority": "Energy reduction" if energy_usage > carbon_output else "Carbon reduction",
    }


def competitor_summary(my_revenue: float, their_revenue: float, my_cost: float, their_cost: float) -> dict:
    my_profit = my_revenue - my_cost
    their_profit = their_revenue - their_cost
    return {
        "myProfit": my_profit,
        "theirProfit": their_profit,
        "revenueGap": my_revenue - their_revenue,
        "costGap": my_cost - their_cost,
        "advantage": "You" if my_profit >= their_profit else "Competitor",
    }


def forecast_values(values: list[float], periods: int) -> dict:
    clean_values = [float(v) for v in values if isinstance(v, int | float) or str(v).replace(".", "", 1).isdigit()]
    if not clean_values:
        return {"forecast": [], "trend": "insufficient-data"}

    if len(clean_values) == 1:
        forecast = [clean_values[0] for _ in range(periods)]
    else:
        x = np.arange(len(clean_values)).reshape(-1, 1)
        y = np.array(clean_values)
        model = LinearRegression().fit(x, y)
        future_x = np.arange(len(clean_values), len(clean_values) + periods).reshape(-1, 1)
        forecast = model.predict(future_x).tolist()

    trend = "upward" if forecast[-1] >= clean_values[-1] else "downward"
    return {
        "historyAverage": round(mean(clean_values), 2),
        "forecast": [round(value, 2) for value in forecast],
        "trend": trend,
    }


def dataset_summary(rows: list[dict]) -> dict:
    profile = profile_dataset(rows)
    numeric_summary = {
        item["name"]: {
            "min": item["numeric"]["min"],
            "max": item["numeric"]["max"],
            "average": item["numeric"]["mean"],
            "median": item["numeric"]["median"],
            "sum": item["numeric"]["sum"],
        }
        for item in profile["profiles"]
        if item["numeric"]
    }
    return {
        "rowCount": profile["rowCount"],
        "columnCount": profile["columnCount"],
        "columns": profile["columns"],
        "missing": {item["name"]: item["missing"] for item in profile["profiles"]},
        "numericSummary": numeric_summary,
        "profile": profile,
    }


def data_chat_response(question: str, rows: list[dict], columns: list[str]) -> str:
    return dataset_insights("chat", rows, columns, question=question)["answer"]
