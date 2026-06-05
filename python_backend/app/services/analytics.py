import json
import math
import re
import time
from statistics import mean, median, pstdev

import numpy as np
from openai import OpenAI
from sklearn.linear_model import LinearRegression

from app.config import get_settings
from app.services.ai_context import (
    build_ai_context,
    build_prompt_hash,
    get_cached_ai_response,
    store_ai_response_cache,
)
from app.services.redis_service import get_redis_service


NUMBER_RE = re.compile(r"^[+-]?\d+(?:\.\d+)?$")


def _estimate_tokens(*values: object) -> int:
    text = json.dumps(values, default=str, separators=(",", ":"))
    return max(1, len(text) // 4)


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


def _profile_by_patterns(profiles: list[dict], patterns: list[str]) -> dict | None:
    for pattern in patterns:
        compiled = re.compile(pattern, re.IGNORECASE)
        for item in profiles:
            if compiled.search(str(item.get("name") or "")):
                return item
    return None


def _client_context(context: dict | None) -> dict:
    if not isinstance(context, dict):
        return {}
    value = context.get("client_context")
    if isinstance(value, dict):
        return value
    direct_context_keys = {"active_columns", "ignored_columns", "selected_columns", "file_name", "row_count", "focus_area"}
    if any(key in context for key in direct_context_keys):
        return context
    return {}


def _chat_context_note(context: dict | None) -> str:
    client_context = _client_context(context)
    parts = []
    focus = str(client_context.get("focus_area") or "").strip()
    time_range = str(client_context.get("time_range") or "").strip()
    business_context = str(client_context.get("business_context") or "").strip()
    if focus and focus.lower() != "auto detect":
        parts.append(f"focus area: {focus}")
    if time_range and time_range.lower() != "all time":
        parts.append(f"time range: {time_range}")
    if business_context:
        parts.append(f"business context: {business_context[:220]}")
    return f"Using selected chat context ({'; '.join(parts)}). " if parts else ""


def _sample_top_rows(profile: dict, value_column: str, label_column: str | None = None, limit: int = 5) -> list[str]:
    ranked: list[tuple[float, dict]] = []
    for row in profile.get("sampleRows") or []:
        if not isinstance(row, dict):
            continue
        value = parse_number(row.get(value_column))
        if value is not None:
            ranked.append((value, row))
    ranked.sort(key=lambda item: item[0], reverse=True)
    results = []
    for value, row in ranked[:limit]:
        label = row.get(label_column) if label_column else None
        if label in (None, ""):
            label = row.get("product_name") or row.get("name") or row.get("category") or row.get(value_column)
        results.append(f"{label}: {round(value, 2)}")
    return results


def _direct_chat_answer(profile: dict, question: str, context: dict | None = None) -> str | None:
    if not question:
        return None

    lower = question.lower().strip()
    client_context = _client_context(context)
    active_columns = client_context.get("active_columns")
    ignored_columns = client_context.get("ignored_columns")
    selected_columns = client_context.get("selected_columns")

    active_column_count = len(active_columns) if isinstance(active_columns, list) and active_columns else None
    selected_column_count = len(selected_columns) if isinstance(selected_columns, list) and selected_columns else None
    ignored_column_count = len(ignored_columns) if isinstance(ignored_columns, list) else 0
    total_columns = int(profile.get("columnCount") or 0)
    row_count = int(profile.get("rowCount") or 0)
    numeric_columns = profile.get("numericColumns") if isinstance(profile.get("numericColumns"), list) else []
    category_columns = profile.get("categoryColumns") if isinstance(profile.get("categoryColumns"), list) else []

    asks_count = any(term in lower for term in ("how many", "number of", "count", "total"))
    asks_column = "column" in lower or "field" in lower
    asks_row = "row" in lower or "record" in lower

    if asks_column and asks_count:
        if any(term in lower for term in ("numeric", "numerical", "measure", "metric")):
            return f"The dataset has {len(numeric_columns)} numeric columns."
        if any(term in lower for term in ("category", "categorical", "text")):
            return f"The dataset has {len(category_columns)} categorical columns."
        if active_column_count is not None and active_column_count != total_columns:
            return (
                f"The active analysis view has {active_column_count} columns. "
                f"The uploaded dataset profile has {total_columns} total columns"
                f"{f', with {ignored_column_count} excluded from analysis' if ignored_column_count else ''}."
            )
        if selected_column_count is not None and selected_column_count != total_columns:
            return f"The selected chat context has {selected_column_count} columns. The dataset profile has {total_columns} total columns."
        return f"The dataset has {total_columns} columns."

    if asks_row and asks_count:
        return f"The dataset has {row_count} rows."

    if asks_column and any(term in lower for term in ("which", "list", "show", "names", "name")):
        columns = profile.get("columns") if isinstance(profile.get("columns"), list) else []
        if not columns:
            return "I could not find column names in the active dataset profile."
        shown = ", ".join(str(column) for column in columns[:40])
        suffix = f" and {len(columns) - 40} more" if len(columns) > 40 else ""
        return f"Columns: {shown}{suffix}."

    return None


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
        context_note = _chat_context_note(context)
        if any(term in lower for term in ("summarize", "summary", "key point", "overview")):
            numeric_hint = ", ".join(item["name"] for item in leading_numeric[:5]) or "no reliable numeric fields"
            category_hint = ", ".join(item["name"] for item in leading_categories[:5]) or "no categorical fields"
            quality_hint = (
                f"{len(missing_profiles)} columns contain missing values"
                if missing_profiles
                else "no missing values detected in the active profile"
            )
            return (
                f"{context_note}Dataset summary: {rows} rows, {cols} columns, "
                f"{len(numeric_profiles)} numeric fields, and {len(category_profiles)} categorical fields. "
                f"Main numeric fields: {numeric_hint}. Main segment fields: {category_hint}. "
                f"Data quality: {quality_hint}. Recommended next step: ask about top/bottom segments, anomalies, or actions."
            )
        if "missing" in lower or "null" in lower or "blank" in lower:
            if not missing_profiles:
                return f"{context_note}The uploaded dataset has {rows} rows and no missing values in the detected columns."
            parts = [f"{item['name']}: {item['missing']} missing ({item['missingPercent']}%)" for item in missing_profiles[:8]]
            return f"{context_note}Missing-value profile: " + "; ".join(parts) + "."
        if any(term in lower for term in ("risk", "risks", "anomaly", "anomalies", "problem", "watch")):
            risks = []
            if missing_profiles:
                risks.append(
                    "missing data in "
                    + ", ".join(f"{item['name']} ({item['missingPercent']}%)" for item in missing_profiles[:4])
                )
            for item in leading_categories:
                top_values = item.get("topValues") or []
                if top_values and rows:
                    top_value = top_values[0]
                    share = round((int(top_value.get("count") or 0) / rows) * 100, 1)
                    if share >= 45:
                        risks.append(f"concentration in {item['name']} where '{top_value.get('value')}' is {share}% of rows")
            if not risks and not numeric_profiles:
                risks.append("limited numeric fields, which reduces trend and impact analysis quality")
            if not risks:
                risks.append("no severe structural risk found in the active profile; inspect outliers in key numeric columns next")
            return f"{context_note}Risk scan: " + "; ".join(risks[:6]) + "."
        if any(term in lower for term in ("top", "highest", "best", "leader")):
            value_profile = _profile_by_patterns(numeric_profiles, [r"revenue|sales|amount|price|value|total|order|rating_count|count"])
            label_profile = _profile_by_patterns(category_profiles, [r"product|item|name|sku|category|segment|region"])
            if value_profile:
                top_rows = _sample_top_rows(profile, str(value_profile["name"]), str(label_profile["name"]) if label_profile else None)
                if top_rows:
                    return f"{context_note}Top rows by {value_profile['name']} in the available sample: " + "; ".join(top_rows) + "."
                stats = value_profile.get("numeric") or {}
                return (
                    f"{context_note}{value_profile['name']} is the best detected ranking metric. "
                    f"It has average {stats.get('mean')} and max {stats.get('max')}. "
                    "Use the Data Explorer for full-row ranking once the backend has the complete profile loaded."
                )
            if leading_categories and leading_categories[0].get("topValues"):
                top_values = leading_categories[0]["topValues"][:5]
                return (
                    f"{context_note}Top values in {leading_categories[0]['name']}: "
                    + "; ".join(f"{item['value']} ({item['count']} rows)" for item in top_values)
                    + "."
                )
        if "rating" in lower and "discount" in lower:
            rating_profile = _profile_by_patterns(numeric_profiles, [r"rating|score|stars"])
            discount_profile = _profile_by_patterns(numeric_profiles, [r"discount|markdown|offer|pct|percent"])
            if rating_profile and discount_profile:
                rating_stats = rating_profile.get("numeric") or {}
                discount_stats = discount_profile.get("numeric") or {}
                return (
                    f"{context_note}Detected rating field '{rating_profile['name']}' and discount field '{discount_profile['name']}'. "
                    f"Average rating is {rating_stats.get('mean')} and average discount is {discount_stats.get('mean')}. "
                    "Rows with below-average rating and above-average discount should be reviewed first for margin leakage or product quality issues."
                )
        for item in numeric_profiles:
            if item["name"].lower() in lower:
                stats = item["numeric"]
                return (
                    f"{context_note}{item['name']} has {stats['count']} numeric values, total {stats['sum']}, "
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
        "Treat the provided context as the active workspace, dataset, selected focus area, time range, and business note. "
        "If the user asks a direct factual/count question, answer in one short sentence and do not add sections. "
        "For analytical questions, give concise, concrete, data-driven insights. Do not invent facts. Do not use emojis. "
        "Return clean markdown without code fences. Use these sections only when relevant or when the user asks for analysis: "
        "## Executive Summary, ## Key Findings, ## Recommended Actions, ## Data Needed. "
        "Use short bullets under each heading. Bold only the lead phrase of a bullet. "
        "If the profile is insufficient, say what column or data is needed."
    )
    user = {
        "mode": mode,
        "question": question,
        "datasetProfile": compact_profile,
        "requiredStyle": (
            "direct one-sentence answer for factual questions; professional BI report only for analytical questions; "
            "no raw JSON; no emojis; no long paragraphs"
        ),
    }

    client = OpenAI(api_key=settings.openai_api_key)
    last_error = ""
    for attempt in range(3):
        try:
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
            last_error = str(exc)
            if "invalid_api_key" in last_error or "Incorrect API key" in last_error or "401" in last_error:
                return (
                    "OpenAI request failed: the request reached the API, but the key was rejected with 401 invalid_api_key. "
                    "I used local backend analysis instead. Replace OPENAI_API_KEY in python_backend/.env with a valid active key, then restart the backend."
                )
            if attempt < 2:
                time.sleep(0.6 * (attempt + 1))
    return f"OpenAI request failed after retries, so I used local backend analysis instead. Last error: {last_error[:180]}"


def dataset_insights(
    mode: str,
    rows: list[dict],
    columns: list[str] | None = None,
    question: str = "",
    context: dict | None = None,
    workspace_id: int | None = None,
    dataset_id: int | None = None,
) -> dict:
    settings = get_settings()
    workspace_context = build_ai_context(
        workspace_id=workspace_id,
        dataset_id=dataset_id,
        rows=rows,
        columns=columns or [],
        extra_context=context or {},
    )
    context_rows = workspace_context.get("sampleRows") if workspace_id and dataset_id else rows
    context_columns = workspace_context.get("columns") if workspace_id and dataset_id else (columns or [])
    effective_rows = context_rows if isinstance(context_rows, list) else rows
    effective_columns = context_columns if isinstance(context_columns, list) else (columns or [])
    enriched_context = {
        **(context or {}),
        "workspaceContext": workspace_context if workspace_id else {},
    }
    prompt_hash = build_prompt_hash(
        workspace_id=workspace_id,
        dataset_id=dataset_id,
        mode=mode,
        question=question,
        columns=effective_columns,
        context=enriched_context,
        model=settings.ai_model,
    )
    profile = profile_dataset(effective_rows, effective_columns)
    direct_answer = _direct_chat_answer(profile, question, enriched_context) if mode == "chat" else None
    if direct_answer:
        return {
            "answer": direct_answer,
            "source": "local",
            "profile": profile,
            "tokens_estimated": _estimate_tokens({"mode": mode, "question": question, "context": enriched_context}, direct_answer),
        }

    cached_db = get_cached_ai_response(workspace_id, prompt_hash)
    if isinstance(cached_db, dict) and isinstance(cached_db.get("response_json"), dict):
        return cached_db["response_json"]

    cache_payload = {
        "mode": mode,
        "rows": effective_rows,
        "columns": effective_columns,
        "question": question,
        "context": enriched_context,
        "model": settings.ai_model,
        "workspace_id": workspace_id,
        "dataset_id": dataset_id,
    }
    cache_key = get_redis_service().cache_key("ai:dataset_insights", cache_payload)
    cached = get_redis_service().get_json(cache_key)
    if isinstance(cached, dict):
        return cached

    ai_answer = _ai_dataset_insight(mode, profile, question, enriched_context)
    if ai_answer and not ai_answer.startswith("OpenAI request failed"):
        result = {
            "answer": ai_answer,
            "source": "ai",
            "profile": profile,
            "tokens_estimated": _estimate_tokens(cache_payload, ai_answer),
        }
        get_redis_service().set_json(cache_key, result, settings.ai_cache_ttl_seconds)
        store_ai_response_cache(
            workspace_id=workspace_id,
            dataset_id=dataset_id,
            prompt_hash=prompt_hash,
            prompt=cache_payload,
            response=result,
            source="ai",
        )
        return result

    local = _local_insight_text(mode, profile, question, enriched_context)
    if ai_answer:
        local = f"{local}\n\n{ai_answer}"
    result = {
        "answer": local,
        "source": "local",
        "profile": profile,
        "tokens_estimated": _estimate_tokens(cache_payload, local),
    }
    get_redis_service().set_json(cache_key, result, min(settings.ai_cache_ttl_seconds, 300))
    store_ai_response_cache(
        workspace_id=workspace_id,
        dataset_id=dataset_id,
        prompt_hash=prompt_hash,
        prompt=cache_payload,
        response=result,
        source="local",
    )
    return result


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
