from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException

from app.database import get_db, normalize_record, normalize_row


ColumnRecord = dict[str, Any]


def _matches(value: str, patterns: list[str]) -> bool:
    normalized = value.lower()
    return any(re.search(pattern, normalized) for pattern in patterns)


def _column_names(columns: list[ColumnRecord], patterns: list[str], limit: int = 4) -> list[str]:
    matches = [str(column.get("name") or "") for column in columns if _matches(str(column.get("name") or ""), patterns)]
    return [name for name in matches if name][:limit]


def _typed_column_names(columns: list[ColumnRecord], types: set[str], limit: int = 4) -> list[str]:
    names: list[str] = []
    for column in columns:
        data_type = str(column.get("data_type") or "").lower()
        if data_type in types:
            name = str(column.get("name") or "")
            if name:
                names.append(name)
    return names[:limit]


def _confidence(found: int, expected: int) -> str:
    ratio = found / expected if expected else 0
    if ratio >= 0.65:
        return "High"
    if ratio >= 0.25:
        return "Medium"
    return "Low"


def _quality_score(dataset: dict[str, Any], stats: dict[str, Any], metadata: dict[str, Any]) -> int:
    for source in (
        metadata.get("quality_json"),
        metadata.get("statistics_json"),
        stats.get("quality_json"),
        stats.get("stats_json"),
        dataset.get("metadata_json"),
    ):
        if not isinstance(source, dict):
            continue
        for key in ("score", "quality_score", "data_quality_score", "overall_score"):
            value = source.get(key)
            if isinstance(value, (int, float)):
                return max(0, min(100, int(round(value))))

    row_count = int(dataset.get("row_count") or 0)
    column_count = int(dataset.get("column_count") or 0)
    if not row_count or not column_count:
        return 0

    total_cells = row_count * column_count
    null_count = 0
    with get_db() as conn:
        rows = conn.execute(
            "SELECT null_count FROM dataset_columns WHERE dataset_id = %s",
            (dataset["id"],),
        ).fetchall()
    for row in rows:
        null_count += int(row.get("null_count") or 0)
    missing_ratio = min(1.0, null_count / total_cells) if total_cells else 0
    return max(40, min(100, int(round(96 - (missing_ratio * 70)))))


def _asset(label: str, active: bool, columns: list[str]) -> dict[str, Any]:
    return {
        "label": label,
        "active": active,
        "columns": columns,
    }


def _opportunity(
    *,
    id: str,
    title: str,
    confidence: str,
    columns_used: list[str],
    questions: list[str],
    target_tab: str,
    score: int,
) -> dict[str, Any]:
    return {
        "id": id,
        "title": title,
        "confidence": confidence,
        "columns_used": columns_used,
        "questions": questions,
        "target_tab": target_tab,
        "score": score,
    }


def _business_question(label: str, active: bool, prompt: str) -> dict[str, Any]:
    return {"label": label, "active": active, "prompt": prompt}


def build_kpi_discovery(workspace_id: int, dataset_id: int) -> dict[str, Any]:
    with get_db() as conn:
        dataset_row = conn.execute(
            "SELECT * FROM datasets WHERE workspace_id = %s AND id = %s AND deleted_at IS NULL",
            (workspace_id, dataset_id),
        ).fetchone()
        if not dataset_row:
            raise HTTPException(status_code=404, detail="Dataset not found.")

        column_rows = conn.execute(
            "SELECT * FROM dataset_columns WHERE dataset_id = %s ORDER BY position ASC",
            (dataset_id,),
        ).fetchall()
        stats_row = conn.execute(
            "SELECT * FROM dataset_stats WHERE dataset_id = %s",
            (dataset_id,),
        ).fetchone()
        metadata_row = conn.execute(
            "SELECT * FROM dataset_metadata WHERE workspace_id = %s AND dataset_id = %s",
            (workspace_id, dataset_id),
        ).fetchone()

    dataset = normalize_record(dataset_row) or {}
    columns = normalize_row(column_rows) or []
    stats = normalize_record(stats_row) or {}
    metadata = normalize_record(metadata_row) or {}

    all_column_names = [str(column.get("name") or "") for column in columns if column.get("name")]
    numeric_columns = _typed_column_names(columns, {"number", "numeric", "integer", "float", "decimal"}, 8)
    if not numeric_columns:
        numeric_columns = _column_names(columns, [r"price", r"amount", r"revenue", r"sales", r"cost", r"rating", r"count", r"total"], 8)
    category_columns = [name for name in all_column_names if name not in numeric_columns][:8]

    date_columns = _column_names(columns, [r"\bdate\b", r"time", r"created", r"month", r"year", r"period", r"week", r"day"], 3)
    revenue_columns = _column_names(columns, [r"revenue", r"sales", r"amount", r"price", r"gmv", r"income", r"value", r"total"], 4)
    cost_columns = _column_names(columns, [r"cost", r"expense", r"spend", r"margin", r"profit", r"cogs"], 4)
    product_columns = _column_names(columns, [r"product", r"sku", r"item", r"category", r"brand", r"title", r"name"], 4)
    region_columns = _column_names(columns, [r"country", r"city", r"state", r"region", r"zone", r"location", r"geo"], 4)
    customer_columns = _column_names(columns, [r"customer", r"client", r"user", r"account", r"buyer", r"segment", r"email"], 4)

    fallback_numeric = numeric_columns[:2]
    fallback_category = category_columns[:2]

    assets = [
        _asset("Time Series Data", bool(date_columns), date_columns),
        _asset("Revenue Information", bool(revenue_columns or numeric_columns), revenue_columns or fallback_numeric),
        _asset("Product Catalog", bool(product_columns), product_columns),
        _asset("Geographic Information", bool(region_columns), region_columns),
        _asset("Customer Identifiers", bool(customer_columns), customer_columns),
    ]

    revenue_score = len(revenue_columns) + len(product_columns) + len(date_columns) + len(region_columns)
    profitability_score = len(revenue_columns) + len(cost_columns) + len(product_columns)
    customer_score = len(customer_columns) + len(revenue_columns) + len(date_columns)
    geographic_score = len(region_columns) + len(revenue_columns) + len(product_columns)

    opportunities = [
        _opportunity(
            id="revenue-performance",
            title="Revenue Performance",
            confidence=_confidence(revenue_score, 4),
            columns_used=[*revenue_columns, *date_columns, *product_columns, *region_columns, *fallback_numeric][:5],
            questions=[
                "What drives revenue growth?",
                "Which products generate most revenue?",
                "How is revenue changing over time?",
            ],
            target_tab="Charts",
            score=revenue_score,
        ),
        _opportunity(
            id="profitability-analysis",
            title="Profitability Analysis",
            confidence=_confidence(profitability_score, 3),
            columns_used=[*revenue_columns, *cost_columns, *product_columns, *fallback_numeric][:5],
            questions=[
                "Which products have low margins?",
                "Where are profits leaking?",
                "Which segments are most profitable?",
            ],
            target_tab="Profit",
            score=profitability_score,
        ),
        _opportunity(
            id="customer-analytics",
            title="Customer Analytics",
            confidence=_confidence(customer_score, 3),
            columns_used=[*customer_columns, *revenue_columns, *date_columns, *fallback_category][:5],
            questions=[
                "Who are high value customers?",
                "Which customers are declining?",
                "What segmentation opportunities exist?",
            ],
            target_tab="AI",
            score=customer_score,
        ),
        _opportunity(
            id="geographic-performance",
            title="Geographic Performance",
            confidence=_confidence(geographic_score, 3),
            columns_used=[*region_columns, *revenue_columns, *product_columns, *fallback_category][:5],
            questions=[
                "Which regions outperform?",
                "What are the regional trends?",
                "Where are expansion opportunities?",
            ],
            target_tab="Charts",
            score=geographic_score,
        ),
    ]

    ranked = sorted(opportunities, key=lambda item: (item["score"], item["confidence"] == "High"), reverse=True)
    recommended = ranked[0] if ranked else opportunities[0]

    suggested_focus = [
        {
            "label": "Revenue Growth" if revenue_columns else "Data Completeness",
            "signal": "High Business Impact" if revenue_columns else "Needs Context",
        },
        {
            "label": "Margin Optimization" if cost_columns else "Pricing Structure",
            "signal": "High Confidence" if revenue_columns and cost_columns else "Medium Confidence",
        },
        {
            "label": "Customer Retention" if customer_columns else "Segment Discovery",
            "signal": "Medium Confidence",
        },
    ]

    business_questions = [
        _business_question("Revenue Forecasting", bool(revenue_columns and date_columns), "Can this dataset support revenue forecasting? Explain the available columns and first analysis path."),
        _business_question("Profit Drivers", bool(revenue_columns or cost_columns), "Identify the profit driver KPIs this dataset can support."),
        _business_question("Pricing Optimization", bool(_column_names(columns, [r"price", r"discount", r"margin"], 3)), "What pricing optimization questions can this dataset answer?"),
        _business_question("Product Performance", bool(product_columns), "What product performance KPIs can be explored from this dataset?"),
        _business_question("Regional Analysis", bool(region_columns), "What regional analysis questions can this dataset answer?"),
        _business_question("Customer Segmentation", bool(customer_columns), "What customer segmentation opportunities exist in this dataset?"),
        _business_question("Risk Detection", bool(numeric_columns or category_columns), "What business risks can be detected from this dataset structure?"),
        _business_question("Anomaly Detection", bool(numeric_columns), "What anomaly detection paths are available from this dataset?"),
        _business_question("Trend Analysis", bool(date_columns and numeric_columns), "What trend analysis can this dataset support?"),
    ]

    display_name = dataset.get("display_name") or dataset.get("file_name") or dataset.get("original_filename") or "Uploaded dataset"
    uploaded_at = dataset.get("created_at") or dataset.get("updated_at") or ""

    return {
        "success": True,
        "source": "metadata",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "dataset": {
            "id": dataset.get("id"),
            "name": display_name,
            "uploaded_at": uploaded_at,
            "rows_detected": int(dataset.get("row_count") or 0),
            "columns_detected": int(dataset.get("column_count") or len(columns)),
            "quality_score": _quality_score(dataset, stats, metadata),
        },
        "data_assets": assets,
        "opportunities": opportunities,
        "suggested_focus": suggested_focus,
        "recommended_starting_point": {
            "opportunity_id": recommended["id"],
            "title": recommended["title"],
            "reason": f"Based on your data structure, {recommended['title']} is the most complete analysis path available.",
        },
        "business_questions": business_questions,
    }
