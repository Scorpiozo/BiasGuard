from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from evaluation.fairness import fairness_report
from evaluation.performance import performance_report
from utils.preprocessing import encode_binary_target


# Columns with more distinct values than this (or that look like an
# identifier by cardinality) are dropped as training features - one-hot
# encoding them would blow up the feature space and they carry no
# generalizable signal anyway (e.g. names, free-text, row IDs).
MAX_CATEGORICAL_CARDINALITY = 30
ID_LIKE_UNIQUE_RATE = 0.9

MIN_ROWS_FOR_TRAINING = 20
MIN_ROWS_PER_CLASS = 5


class ModelTrainingError(ValueError):
    """Raised when the dataset/outcome/attribute combination can't
    support training a model (too small, too few classes, etc.)."""


def _select_feature_columns(
    df: pd.DataFrame,
    outcome: str,
    protected_attribute: str,
) -> tuple[list[str], list[str]]:
    """
    Pick which columns to train on, and which were skipped (with the
    skip surfaced to the user for transparency - this is a dataset bias
    tool, so silently dropping columns during training would be the
    exact kind of opacity it's meant to push back on).
    """
    used: list[str] = []
    skipped: list[str] = []

    for column in df.columns:
        if column == outcome:
            continue

        series = df[column]
        non_null = series.dropna()
        n = len(series)
        unique_rate = (non_null.nunique() / n) if n else 0.0
        is_numeric = pd.api.types.is_numeric_dtype(series)

        # A continuous numeric column (price, score, age) is normal and
        # expected to be almost all unique - that's not an identifier.
        # High cardinality is only suspicious for non-numeric columns
        # (free text, names, emails, row IDs).
        looks_like_id = (
            not is_numeric
            and unique_rate > ID_LIKE_UNIQUE_RATE
            and non_null.nunique() > MAX_CATEGORICAL_CARDINALITY
        )

        too_many_categories = (
            not is_numeric
            and non_null.nunique() > MAX_CATEGORICAL_CARDINALITY
        )

        if looks_like_id or too_many_categories:
            skipped.append(column)
            continue

        used.append(column)

    # The protected attribute is always kept as a feature if it survived
    # the filter above - if it got skipped (e.g. too many categories),
    # that's worth knowing too, but we don't force it back in since a
    # column the model can't reasonably use isn't a feature the model
    # "sees" in training.
    if protected_attribute not in used and protected_attribute not in skipped:
        skipped.append(protected_attribute)

    return used, skipped


def _build_preprocessor(X: pd.DataFrame) -> ColumnTransformer:
    numeric_cols = X.select_dtypes(include=["number", "bool"]).columns.tolist()
    categorical_cols = [c for c in X.columns if c not in numeric_cols]

    numeric_pipeline = Pipeline(
        steps=[
            ("impute", SimpleImputer(strategy="median")),
            ("scale", StandardScaler()),
        ]
    )

    categorical_pipeline = Pipeline(
        steps=[
            ("impute", SimpleImputer(strategy="most_frequent")),
            ("encode", OneHotEncoder(handle_unknown="ignore")),
        ]
    )

    transformers = []
    if numeric_cols:
        transformers.append(("numeric", numeric_pipeline, numeric_cols))
    if categorical_cols:
        transformers.append(("categorical", categorical_pipeline, categorical_cols))

    return ColumnTransformer(transformers=transformers)


def train_and_evaluate(
    df: pd.DataFrame,
    outcome: str,
    protected_attribute: str,
    test_size: float = 0.25,
    random_state: int = 42,
) -> dict[str, Any]:
    """
    Train a small, interpretable classifier (logistic regression) to
    predict a binary outcome, then check both:
      - how well it performs (accuracy/precision/recall/F1/ROC-AUC), and
      - whether its predictions are fair across the chosen group,
        using the same fairness definitions (demographic parity, equal
        opportunity, equalized odds) already used elsewhere in the app.

    This is deliberately small and explainable rather than a black box:
    the point is to show whether bias in the raw data carries through
    into a trained model's decisions, not to produce the most accurate
    model possible.
    """
    if outcome not in df.columns:
        raise ModelTrainingError(f"Outcome column '{outcome}' does not exist.")

    if protected_attribute not in df.columns:
        raise ModelTrainingError(
            f"Group column '{protected_attribute}' does not exist."
        )

    work = df[[c for c in df.columns if c != outcome] + [outcome]].copy()
    work = work.dropna(subset=[outcome])

    if len(work) < MIN_ROWS_FOR_TRAINING:
        raise ModelTrainingError(
            f"Need at least {MIN_ROWS_FOR_TRAINING} rows with a non-missing "
            f"outcome to train a model (found {len(work)})."
        )

    try:
        y_encoded, mapping = encode_binary_target(work[outcome])
    except ValueError as exc:
        raise ModelTrainingError(
            "A model can only be trained against a binary outcome "
            "(exactly two distinct values)."
        ) from exc

    class_counts = y_encoded.value_counts()
    if class_counts.min() < MIN_ROWS_PER_CLASS:
        raise ModelTrainingError(
            "Each outcome class needs at least "
            f"{MIN_ROWS_PER_CLASS} examples to train and test a model "
            f"reliably."
        )

    feature_columns, skipped_columns = _select_feature_columns(
        work, outcome, protected_attribute
    )

    if not feature_columns:
        raise ModelTrainingError(
            "No usable feature columns remain after excluding "
            "identifier-like columns - nothing left to train a model on."
        )

    X = work[feature_columns]
    y = y_encoded

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=test_size,
        random_state=random_state,
        stratify=y,
    )

    preprocessor = _build_preprocessor(X)

    pipeline = Pipeline(
        steps=[
            ("preprocess", preprocessor),
            (
                "classifier",
                LogisticRegression(max_iter=1000, random_state=random_state),
            ),
        ]
    )

    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)

    inverse_mapping = {v: k for k, v in mapping.items()}
    actual_labels = [inverse_mapping[int(v)] for v in y_test.to_numpy()]
    predicted_labels = [inverse_mapping[int(v)] for v in y_pred]

    # Reuse the existing (previously unused) performance_report by
    # handing it a tiny two-column frame shaped the way it expects.
    performance_frame = pd.DataFrame(
        {
            "_actual": actual_labels,
            "_predicted": predicted_labels,
        }
    )
    performance = performance_report(performance_frame, "_actual", "_predicted")

    # Reuse fairness_report with a prediction column supplied, which
    # activates equal_opportunity and equalized_odds in addition to
    # demographic parity - both previously unreachable from the UI.
    fairness_frame = pd.DataFrame(
        {
            protected_attribute: X_test[protected_attribute].to_numpy()
            if protected_attribute in X_test.columns
            else df.loc[X_test.index, protected_attribute].to_numpy(),
            "_actual": actual_labels,
            "_predicted": predicted_labels,
        }
    )
    fairness = fairness_report(
        fairness_frame, protected_attribute, "_actual", "_predicted"
    )

    return {
        "model": "logistic_regression",
        "outcome": outcome,
        "protected_attribute": protected_attribute,
        "feature_columns": feature_columns,
        "skipped_columns": skipped_columns,
        "train_rows": int(len(X_train)),
        "test_rows": int(len(X_test)),
        "performance": performance,
        "fairness": fairness,
    }
