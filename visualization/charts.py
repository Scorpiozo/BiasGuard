from __future__ import annotations

from typing import Any

import pandas as pd


def group_distribution_chart(
    df: pd.DataFrame,
    protected_attribute: str,
) -> dict[str, Any]:
    counts = (
        df[protected_attribute]
        .value_counts(dropna=False)
    )

    return {
        "type": "bar",
        "title": f"{protected_attribute} Representation",
        "x_label": "Group",
        "y_label": "Count",
        "data": [
            {
                "group": (
                    "Missing"
                    if pd.isna(group)
                    else str(group)
                ),
                "count": int(count),
            }
            for group, count in counts.items()
        ],
    }


def outcome_rate_chart(
    df: pd.DataFrame,
    protected_attribute: str,
    target: str,
) -> dict[str, Any]:
    work = df[
        [protected_attribute, target]
    ].dropna()

    values = list(work[target].unique())

    if len(values) != 2:
        raise ValueError(
            "Outcome chart requires a binary target."
        )

    positive = values[1]

    data = []

    for group, subset in work.groupby(
        protected_attribute
    ):
        rate = (
            subset[target] == positive
        ).mean()

        data.append(
            {
                "group": str(group),
                "positive_rate": round(
                    float(rate),
                    4,
                ),
            }
        )

    return {
        "type": "bar",
        "title": "Positive Outcome Rate by Group",
        "x_label": "Group",
        "y_label": "Positive Rate",
        "data": data,
    }


def missingness_chart(
    df: pd.DataFrame,
    protected_attribute: str,
) -> dict[str, Any]:
    rows = []

    for group, subset in df.groupby(
        protected_attribute
    ):
        group_name = str(group)

        for column in df.columns:
            rate = subset[column].isna().mean()

            rows.append(
                {
                    "group": group_name,
                    "column": column,
                    "missing_rate": round(
                        float(rate),
                        4,
                    ),
                }
            )

    return {
        "type": "heatmap",
        "title": "Missingness by Protected Group",
        "data": rows,
    }


def fairness_comparison_chart(
    before: dict[str, Any],
    after: dict[str, Any],
) -> dict[str, Any]:
    return {
        "type": "comparison",
        "title": "Before vs After Mitigation",
        "metrics": [
            {
                "metric": "Selection Rate Gap",
                "before": before.get(
                    "selection_rate_gap"
                ),
                "after": after.get(
                    "selection_rate_gap"
                ),
            },
            {
                "metric": "Disparate Impact",
                "before": before.get(
                    "disparate_impact"
                ),
                "after": after.get(
                    "disparate_impact"
                ),
            },
        ],
    }