from __future__ import annotations

from typing import Any

import pandas as pd

from utils.preprocessing import json_safe


def representation_by_group(
    df: pd.DataFrame,
    protected_attribute: str,
) -> dict[str, Any]:
    """
    Analyse how represented each protected group is.
    """
    series = df[protected_attribute]

    counts = series.value_counts(
        dropna=False
    )

    total = len(series)

    groups = []

    for group, count in counts.items():
        label = "Missing" if pd.isna(group) else str(group)

        groups.append(
            {
                "group": label,
                "count": int(count),
                "percentage": round(
                    float(count / total * 100),
                    2,
                ) if total else 0.0,
                "is_missing": bool(pd.isna(group)),
            }
        )

    non_missing_counts = (
        series.dropna()
        .value_counts()
    )

    if len(non_missing_counts) >= 2:
        largest = float(non_missing_counts.max())
        smallest = float(non_missing_counts.min())

        imbalance_ratio = (
            smallest / largest
            if largest > 0
            else 1.0
        )
    else:
        imbalance_ratio = 1.0

    return {
        "attribute": protected_attribute,
        "groups": groups,
        "number_of_groups": int(series.nunique(dropna=True)),
        "imbalance_ratio": round(
            imbalance_ratio,
            4,
        ),
    }