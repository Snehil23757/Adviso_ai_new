from statistics import mean

import numpy as np
from sklearn.linear_model import LinearRegression


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
    columns = sorted({key for row in rows for key in row.keys()})
    numeric_columns: dict[str, list[float]] = {column: [] for column in columns}
    missing: dict[str, int] = {column: 0 for column in columns}

    for row in rows:
        for column in columns:
            value = row.get(column)
            if value in (None, ""):
                missing[column] += 1
                continue
            if isinstance(value, int | float):
                numeric_columns[column].append(float(value))

    numeric_summary = {
        column: {
            "min": min(values),
            "max": max(values),
            "average": round(mean(values), 2),
        }
        for column, values in numeric_columns.items()
        if values
    }

    return {
        "rowCount": len(rows),
        "columnCount": len(columns),
        "columns": columns,
        "missing": missing,
        "numericSummary": numeric_summary,
    }


def data_chat_response(question: str, rows: list[dict], columns: list[str]) -> str:
    if not rows:
        return "Upload a dataset first so I can answer questions about its rows, columns, and numeric patterns."

    summary = dataset_summary(rows)
    question_lower = question.lower().strip()
    known_columns = columns or summary["columns"]
    column_lookup = {column.lower(): column for column in known_columns}
    mentioned_column = next((original for lower, original in column_lookup.items() if lower in question_lower), None)
    numeric_summary = summary["numericSummary"]

    if any(word in question_lower for word in ["row", "record", "count"]):
        return f"The dataset contains {summary['rowCount']} rows and {summary['columnCount']} columns."

    if any(word in question_lower for word in ["column", "field", "schema"]):
        preview = ", ".join(summary["columns"][:8])
        extra = "" if len(summary["columns"]) <= 8 else f", and {len(summary['columns']) - 8} more"
        return f"The dataset has {summary['columnCount']} columns: {preview}{extra}."

    if any(word in question_lower for word in ["missing", "null", "blank", "empty"]):
        missing_items = [
            f"{column}: {count}"
            for column, count in summary["missing"].items()
            if count > 0
        ]
        if not missing_items:
            return "I did not find missing values in the uploaded dataset."
        return "Missing value counts are " + "; ".join(missing_items[:10]) + "."

    if mentioned_column and mentioned_column in numeric_summary:
        stats = numeric_summary[mentioned_column]
        if any(word in question_lower for word in ["average", "avg", "mean"]):
            return f"The average value for {mentioned_column} is {stats['average']}."
        if "min" in question_lower or "lowest" in question_lower:
            return f"The minimum value for {mentioned_column} is {stats['min']}."
        if "max" in question_lower or "highest" in question_lower:
            return f"The maximum value for {mentioned_column} is {stats['max']}."
        if "sum" in question_lower or "total" in question_lower:
            total = sum(float(row.get(mentioned_column) or 0) for row in rows if isinstance(row.get(mentioned_column), int | float))
            return f"The total value for {mentioned_column} is {round(total, 2)}."
        return (
            f"For {mentioned_column}, min is {stats['min']}, max is {stats['max']}, "
            f"and average is {stats['average']}."
        )

    if any(word in question_lower for word in ["average", "avg", "mean", "min", "max", "summary", "insight"]):
        if not numeric_summary:
            return "I found no numeric columns to summarize. I can still answer schema, row-count, or missing-value questions."
        items = [
            f"{column}: avg {stats['average']}, min {stats['min']}, max {stats['max']}"
            for column, stats in numeric_summary.items()
        ]
        return "Numeric summary: " + "; ".join(items[:6]) + "."

    numeric_columns = list(numeric_summary.keys())
    numeric_text = ", ".join(numeric_columns[:5]) if numeric_columns else "none detected"
    return (
        f"I can analyze this dataset locally through the backend API. It has {summary['rowCount']} rows, "
        f"{summary['columnCount']} columns, and numeric fields: {numeric_text}. "
        "Try asking about row count, missing values, columns, or the average/min/max of a specific numeric field."
    )
