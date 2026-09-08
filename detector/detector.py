from __future__ import annotations

from typing import Any

import pandas as pd


def target_imbalance(
    df: pd.DataFrame,
    target: str,
) -> dict[str, Any]:
    """
    Measure binary target imbalance.
    """
    series = df[target].dropna()

    counts = series.value_counts()

    if counts.empty:
        return {
            "target": target,
            "classes": [],
            "imbalance_ratio": None,
            "severity": "unknown",
        }

    largest = int(counts.max())
    smallest = int(counts.min())

    ratio = (
        smallest / largest
        if largest > 0
        else 1.0
    )

    if ratio >= 0.8:
        severity = "low"
    elif ratio >= 0.5:
        severity = "moderate"
    elif ratio >= 0.2:
        severity = "high"
    else:
        severity = "critical"

    classes = [
        {
            "class": str(label),
            "count": int(count),
            "percentage": round(
                float(count / len(series) * 100),
                2,
            ),
        }
        for label, count in counts.items()
    ]

    return {
        "target": target,
        "classes": classes,
        "imbalance_ratio": round(
            float(ratio),
            4,
        ),
        "severity": severity,
    }


def target_imbalance_by_group(
    df: pd.DataFrame,
    protected_attribute: str,
    target: str,
) -> dict[str, Any]:
    """
    Detect whether outcome distribution differs strongly
    across protected groups.
    """
    result = []

    for group, subset in df.groupby(
        protected_attribute,
        dropna=False,
    ):
        counts = (
            subset[target]
            .dropna()
            .value_counts()
        )

        total = counts.sum()

        classes = [
            {
                "class": str(label),
                "count": int(count),
                "percentage": round(
                    float(count / total * 100),
                    2,
                ) if total else 0.0,
            }
            for label, count in counts.items()
        ]

        result.append(
            {
                "group": str(group),
                "classes": classes,
            }
        )

    return {
        "attribute": protected_attribute,
        "target": target,
        "groups": result,
    }