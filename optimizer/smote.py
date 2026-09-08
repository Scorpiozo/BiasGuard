from __future__ import annotations

import pandas as pd
from imblearn.over_sampling import SMOTENC

from utils.preprocessing import encode_binary_target


def apply_smote(
    df: pd.DataFrame,
    target: str,
    random_state: int = 42,
) -> pd.DataFrame:
    """
    Apply SMOTENC to a binary classification dataset.

    Categorical features are handled explicitly.

    Missing values are filled temporarily for the synthetic
    sampling process and restored as far as possible afterward.
    """
    if df.empty:
        return df.copy()

    working = df.copy()

    target_encoded, mapping = encode_binary_target(
        working[target]
    )

    valid_mask = target_encoded.notna()

    working = working.loc[valid_mask].copy()
    target_encoded = target_encoded.loc[
        valid_mask
    ]

    feature_columns = [
        column
        for column in working.columns
        if column != target
    ]

    if not feature_columns:
        raise ValueError(
            "SMOTE requires at least one feature column."
        )

    X = working[feature_columns].copy()

    categorical_indices = []

    for index, column in enumerate(feature_columns):
        if not pd.api.types.is_numeric_dtype(
            X[column]
        ):
            categorical_indices.append(index)

    for column in feature_columns:
        if pd.api.types.is_numeric_dtype(
            X[column]
        ):
            X[column] = pd.to_numeric(
                X[column],
                errors="coerce",
            ).fillna(
                X[column].median()
            )
        else:
            X[column] = (
                X[column]
                .astype("string")
                .fillna("__MISSING__")
            )

    if target_encoded.value_counts().min() < 2:
        raise ValueError(
            "SMOTE requires at least two observations "
            "in each class."
        )

    try:
        sampler = SMOTENC(
            categorical_features=categorical_indices,
            random_state=random_state,
        )

        X_resampled, y_resampled = sampler.fit_resample(
            X,
            target_encoded,
        )
    except Exception as exc:
        raise ValueError(
            f"SMOTE could not be applied: {exc}"
        ) from exc

    result = pd.DataFrame(
        X_resampled,
        columns=feature_columns,
    )

    inverse_mapping = {
        value: key
        for key, value in mapping.items()
    }

    result[target] = [
        inverse_mapping[int(value)]
        for value in y_resampled
    ]

    return result