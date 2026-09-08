from __future__ import annotations

from io import BytesIO
from typing import Any

import numpy as np
import pandas as pd


MISSING_TOKENS = {
    "",
    " ",
    "na",
    "n/a",
    "nan",
    "null",
    "none",
    "?",
    "missing",
}


def read_csv_bytes(content: bytes) -> pd.DataFrame:
    """
    Read a CSV uploaded through the API.
    """
    if not content:
        raise ValueError("Uploaded CSV is empty.")

    try:
        df = pd.read_csv(BytesIO(content))
    except Exception as exc:
        raise ValueError(f"Unable to read CSV: {exc}") from exc

    return clean_dataframe(df)


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Perform conservative cleaning.

    We intentionally do not silently delete rows or impute values.
    BiasGuard needs to inspect missingness before deciding whether
    treatment is appropriate.
    """
    result = df.copy()

    result.columns = [
        str(column).strip()
        for column in result.columns
    ]

    for column in result.select_dtypes(include=["object"]).columns:
        result[column] = (
            result[column]
            .astype("string")
            .str.strip()
            .replace(
                list(MISSING_TOKENS),
                pd.NA,
            )
        )

    return result


def infer_feature_types(df: pd.DataFrame) -> dict[str, list[str]]:
    numeric = df.select_dtypes(
        include=["number", "bool"]
    ).columns.tolist()

    categorical = [
        column
        for column in df.columns
        if column not in numeric
    ]

    return {
        "numeric": numeric,
        "categorical": categorical,
    }


def encode_binary_target(
    series: pd.Series,
) -> tuple[pd.Series, dict[Any, int]]:
    """
    Convert a two-class target into 0/1.

    The mapping is returned so callers can reconstruct the
    original labels.
    """
    values = list(series.dropna().unique())

    if len(values) != 2:
        raise ValueError(
            "Binary target encoding requires exactly two classes."
        )

    mapping = {
        values[0]: 0,
        values[1]: 1,
    }

    encoded = series.map(mapping)

    return encoded, mapping


def safe_numeric(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce")


def json_safe(value: Any) -> Any:
    """
    Convert NumPy/Pandas values into JSON-compatible values.
    """
    if pd.isna(value):
        return None

    if isinstance(value, (np.integer,)):
        return int(value)

    if isinstance(value, (np.floating,)):
        return float(value)

    if isinstance(value, (np.bool_,)):
        return bool(value)

    if isinstance(value, (pd.Timestamp,)):
        return value.isoformat()

    return value