from __future__ import annotations

from typing import Any

import pandas as pd


def missingness_by_group(
    df: pd.DataFrame,
    protected_attribute: str,
) -> dict[str, Any]:
    """
    Compare missing-data patterns across protected groups.
    """
    rows = []

    grouped = df.groupby(
        protected_attribute,
        dropna=False,
    )

    for group, subset in grouped:
        group_name = (
            "Missing"
            if pd.isna(group)
            else str(group)
        )

        for column in df.columns:
            missing_count = int(
                subset[column].isna().sum()
            )

            missing_rate = (
                missing_count / len(subset)
                if len(subset)
                else 0.0
            )

            rows.append(
                {
                    "group": group_name,
                    "column": column,
                    "missing_count": missing_count,
                    "missing_rate": round(
                        float(missing_rate),
                        4,
                    ),
                }
            )

    return {
        "attribute": protected_attribute,
        "details": rows,
    }