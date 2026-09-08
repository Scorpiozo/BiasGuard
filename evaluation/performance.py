from __future__ import annotations

from typing import Any

import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)

from utils.preprocessing import encode_binary_target


def performance_report(
    df: pd.DataFrame,
    y_true: str,
    y_pred: str,
) -> dict[str, Any]:
    """
    Calculate standard binary-classification performance metrics.
    """
    work = df[
        [y_true, y_pred]
    ].dropna()

    if work.empty:
        raise ValueError(
            "No complete rows exist for performance evaluation."
        )

    true_encoded, _ = encode_binary_target(
        work[y_true]
    )

    pred_encoded, _ = encode_binary_target(
        work[y_pred]
    )

    accuracy = accuracy_score(
        true_encoded,
        pred_encoded,
    )

    precision = precision_score(
        true_encoded,
        pred_encoded,
        zero_division=0,
    )

    recall = recall_score(
        true_encoded,
        pred_encoded,
        zero_division=0,
    )

    f1 = f1_score(
        true_encoded,
        pred_encoded,
        zero_division=0,
    )

    try:
        roc_auc = roc_auc_score(
            true_encoded,
            pred_encoded,
        )
    except ValueError:
        roc_auc = None

    return {
        "accuracy": round(float(accuracy), 4),
        "precision": round(float(precision), 4),
        "recall": round(float(recall), 4),
        "f1": round(float(f1), 4),
        "roc_auc": (
            round(float(roc_auc), 4)
            if roc_auc is not None
            else None
        ),
        "evaluated_rows": int(len(work)),
    }