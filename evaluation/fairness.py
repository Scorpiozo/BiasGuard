from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from utils.preprocessing import encode_binary_target


def _safe_divide(
    numerator: float,
    denominator: float,
) -> float | None:
    if denominator == 0:
        return None

    return float(numerator / denominator)


def demographic_parity(
    df: pd.DataFrame,
    protected_attribute: str,
    outcome_column: str,
) -> dict[str, Any]:
    """
    Demographic parity / selection-rate analysis.

    The outcome column is interpreted as a binary decision.
    """
    work = df[
        [protected_attribute, outcome_column]
    ].dropna()

    encoded, mapping = encode_binary_target(
        work[outcome_column]
    )

    work = work.copy()
    work["_binary_outcome"] = encoded

    groups = []

    for group, subset in work.groupby(
        protected_attribute
    ):
        rate = subset["_binary_outcome"].mean()

        groups.append(
            {
                "group": str(group),
                "selection_rate": round(
                    float(rate),
                    4,
                ),
                "count": int(len(subset)),
            }
        )

    rates = [
        item["selection_rate"]
        for item in groups
    ]

    max_rate = max(rates) if rates else 0
    min_rate = min(rates) if rates else 0

    return {
        "metric": "demographic_parity",
        "positive_class": str(
            list(mapping.keys())[1]
        ),
        "groups": groups,
        "statistical_parity_difference": round(
            float(min_rate - max_rate),
            4,
        ) if rates else None,
        "selection_rate_gap": round(
            float(max_rate - min_rate),
            4,
        ) if rates else None,
        "disparate_impact": round(
            float(
                min_rate / max_rate
            ),
            4,
        ) if max_rate > 0 else None,
    }


def equal_opportunity(
    df: pd.DataFrame,
    protected_attribute: str,
    y_true: str,
    y_pred: str,
) -> dict[str, Any]:
    """
    Equal opportunity evaluates true-positive rates by group.
    """
    work = df[
        [
            protected_attribute,
            y_true,
            y_pred,
        ]
    ].dropna()

    true_encoded, _ = encode_binary_target(
        work[y_true]
    )

    pred_encoded, _ = encode_binary_target(
        work[y_pred]
    )

    work = work.copy()
    work["_true"] = true_encoded
    work["_pred"] = pred_encoded

    groups = []

    for group, subset in work.groupby(
        protected_attribute
    ):
        positives = subset[
            subset["_true"] == 1
        ]

        tpr = (
            (
                positives["_pred"] == 1
            ).mean()
            if len(positives)
            else None
        )

        groups.append(
            {
                "group": str(group),
                "true_positive_rate": (
                    round(float(tpr), 4)
                    if tpr is not None
                    else None
                ),
            }
        )

    rates = [
        item["true_positive_rate"]
        for item in groups
        if item["true_positive_rate"] is not None
    ]

    return {
        "metric": "equal_opportunity",
        "groups": groups,
        "tpr_gap": round(
            float(max(rates) - min(rates)),
            4,
        ) if rates else None,
    }


def equalized_odds(
    df: pd.DataFrame,
    protected_attribute: str,
    y_true: str,
    y_pred: str,
) -> dict[str, Any]:
    """
    Equalized odds compares both TPR and FPR across groups.
    """
    work = df[
        [
            protected_attribute,
            y_true,
            y_pred,
        ]
    ].dropna()

    true_encoded, _ = encode_binary_target(
        work[y_true]
    )

    pred_encoded, _ = encode_binary_target(
        work[y_pred]
    )

    work = work.copy()
    work["_true"] = true_encoded
    work["_pred"] = pred_encoded

    groups = []

    for group, subset in work.groupby(
        protected_attribute
    ):
        actual_positive = subset["_true"] == 1
        actual_negative = subset["_true"] == 0

        tpr = (
            (
                subset.loc[
                    actual_positive,
                    "_pred",
                ]
                == 1
            ).mean()
            if actual_positive.sum()
            else None
        )

        fpr = (
            (
                subset.loc[
                    actual_negative,
                    "_pred",
                ]
                == 1
            ).mean()
            if actual_negative.sum()
            else None
        )

        groups.append(
            {
                "group": str(group),
                "true_positive_rate": (
                    round(float(tpr), 4)
                    if tpr is not None
                    else None
                ),
                "false_positive_rate": (
                    round(float(fpr), 4)
                    if fpr is not None
                    else None
                ),
            }
        )

    tprs = [
        item["true_positive_rate"]
        for item in groups
        if item["true_positive_rate"] is not None
    ]

    fprs = [
        item["false_positive_rate"]
        for item in groups
        if item["false_positive_rate"] is not None
    ]

    return {
        "metric": "equalized_odds",
        "groups": groups,
        "tpr_gap": (
            round(
                float(max(tprs) - min(tprs)),
                4,
            )
            if tprs
            else None
        ),
        "fpr_gap": (
            round(
                float(max(fprs) - min(fprs)),
                4,
            )
            if fprs
            else None
        ),
    }


def fairness_report(
    df: pd.DataFrame,
    protected_attribute: str,
    target: str,
    prediction_column: str | None = None,
) -> dict[str, Any]:
    result = {
        "demographic_parity": demographic_parity(
            df,
            protected_attribute,
            target,
        )
    }

    if prediction_column:
        result["equal_opportunity"] = equal_opportunity(
            df,
            protected_attribute,
            target,
            prediction_column,
        )

        result["equalized_odds"] = equalized_odds(
            df,
            protected_attribute,
            target,
            prediction_column,
        )

    return result