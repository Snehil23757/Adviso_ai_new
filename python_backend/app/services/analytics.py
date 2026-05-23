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
