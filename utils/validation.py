from __future__ import annotations

from typing import Iterable

import pandas as pd


SUPPORTED_BINARY_TASKS = {"binary_classification"}


class ValidationError(ValueError):
    """Raised when user-supplied dataset configuration is invalid."""


def validate_dataframe(df: pd.DataFrame) -> None:
    if df is None:
        raise ValidationError("Dataset is missing.")

    if df.empty:
        raise ValidationError("Dataset is empty.")

    if len(df.columns) == 0:
        raise ValidationError("Dataset contains no columns.")

    duplicated = df.columns[df.columns.duplicated()].tolist()
    if duplicated:
        raise ValidationError(
            f"Duplicate column names are not allowed: {duplicated}"
        )


def validate_columns(
    df: pd.DataFrame,
    columns: Iterable[str],
    label: str = "columns",
) -> None:
    requested = list(columns)

    if not requested:
        raise ValidationError(f"At least one {label} must be selected.")

    missing = [column for column in requested if column not in df.columns]

    if missing:
        raise ValidationError(
            f"Unknown {label}: {missing}. "
            f"Available columns: {df.columns.tolist()}"
        )


def validate_target_and_protected(
    df: pd.DataFrame,
    target: str,
    protected_attributes: list[str],
) -> None:
    validate_dataframe(df)

    if target not in df.columns:
        raise ValidationError(f"Target column '{target}' does not exist.")

    if not protected_attributes:
        raise ValidationError(
            "At least one protected attribute must be selected."
        )

    validate_columns(
        df,
        protected_attributes,
        "protected attributes",
    )

    if target in protected_attributes:
        raise ValidationError(
            "The target column cannot also be a protected attribute."
        )

    target_values = df[target].dropna().unique()

    if len(target_values) < 2:
        raise ValidationError(
            "The target must contain at least two distinct non-null values."
        )


MULTICLASS_MAX_CARDINALITY = 12


def infer_task_type(series: pd.Series) -> str:
    """
    Infer a high-level task type from a candidate outcome column.

    BiasGuard supports several outcome shapes:
      - "binary_classification": exactly two distinct values.
      - "multiclass_classification": a handful of distinct categories
        (e.g. rating buckets, decision categories).
      - "continuous": numeric values with many distinct values
        (e.g. salary, score).
      - "identifier": looks like an ID column (almost all unique),
        not a meaningful outcome.
      - "unknown": not enough data to tell.
    """
    clean = series.dropna()

    if clean.empty:
        return "unknown"

    nunique = clean.nunique()
    is_numeric = pd.api.types.is_numeric_dtype(clean)

    if nunique == 2:
        return "binary_classification"

    if nunique <= MULTICLASS_MAX_CARDINALITY:
        return "multiclass_classification"

    if is_numeric:
        return "continuous"

    # High-cardinality, non-numeric column (free text, names, IDs) -
    # not a usable outcome or group.
    if len(clean) and nunique / len(clean) > 0.9:
        return "identifier"

    return "unsupported"


def validate_groups(
    df: pd.DataFrame,
    groups: list[str],
) -> None:
    """
    Lenient validation for the exploratory analysis flow: only
    requires that the chosen group column(s) exist. No outcome
    column, and no particular target shape, is required.
    """
    validate_dataframe(df)
    validate_columns(df, groups, "group columns")


def validate_outcome_column(
    df: pd.DataFrame,
    outcome: str,
    groups: list[str],
) -> None:
    if outcome not in df.columns:
        raise ValidationError(
            f"Outcome column '{outcome}' does not exist."
        )

    if outcome in groups:
        raise ValidationError(
            "The outcome column cannot also be a group column."
        )

    if df[outcome].dropna().empty:
        raise ValidationError(
            "The outcome column contains no non-missing values."
        )


def validate_binary_target(series: pd.Series) -> None:
    values = series.dropna().unique()

    if len(values) != 2:
        raise ValidationError(
            "This operation requires a binary target with exactly "
            f"two distinct values. Found {len(values)}."
        )


def validate_prediction_columns(
    df: pd.DataFrame,
    y_true: str,
    y_pred: str,
) -> None:
    validate_columns(df, [y_true, y_pred], "prediction columns")

    if df[y_true].dropna().empty:
        raise ValidationError("The true outcome column contains no values.")

    if df[y_pred].dropna().empty:
        raise ValidationError("The prediction column contains no values.")