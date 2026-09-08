from __future__ import annotations

import pandas as pd


def calculate_group_weights(
    df: pd.DataFrame,
    protected_attribute: str,
) -> pd.DataFrame:
    """
    Calculate inverse-frequency group weights.

    The average weight is normalized to approximately 1.
    """
    result = df.copy()

    counts = (
        result[protected_attribute]
        .value_counts(dropna=False)
    )

    total = len(result)
    number_of_groups = len(counts)

    weights = {}

    for group, count in counts.items():
        if count == 0:
            weight = 1.0
        else:
            weight = total / (
                number_of_groups * count
            )

        weights[group] = weight

    def lookup(value):
        for key, weight in weights.items():
            if pd.isna(key) and pd.isna(value):
                return weight

            if value == key:
                return weight

        return 1.0

    result["biasguard_weight"] = (
        result[protected_attribute]
        .map(lookup)
        .astype(float)
    )

    return result


def apply_reweighting(
    df: pd.DataFrame,
    protected_attribute: str,
) -> pd.DataFrame:
    return calculate_group_weights(
        df,
        protected_attribute,
    )