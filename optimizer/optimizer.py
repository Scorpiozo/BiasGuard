from __future__ import annotations

from typing import Any

import pandas as pd

from optimizer.oversampling import (
    oversample_minority_groups,
)
from optimizer.reweighting import apply_reweighting
from optimizer.smote import apply_smote
from optimizer.undersampling import (
    undersample_majority_groups,
)


SUPPORTED_METHODS = {
    "oversampling",
    "undersampling",
    "reweighting",
    "smote",
}


class BiasOptimizer:
    """
    Unified mitigation interface.
    """

    def __init__(
        self,
        df: pd.DataFrame,
        protected_attribute: str,
        target: str | None = None,
    ):
        self.df = df
        self.target = target
        self.protected_attribute = protected_attribute

    def apply(
        self,
        method: str,
    ) -> tuple[pd.DataFrame, dict[str, Any]]:
        method = method.lower().strip()

        if method not in SUPPORTED_METHODS:
            raise ValueError(
                f"Unsupported mitigation method '{method}'. "
                f"Choose from {sorted(SUPPORTED_METHODS)}."
            )

        # Oversampling, undersampling, and reweighting only rebalance
        # by group (protected_attribute) - they don't need an outcome
        # at all. SMOTE is the one method that genuinely requires a
        # binary outcome, because it generates synthetic examples
        # stratified by class.
        if method == "smote" and not self.target:
            raise ValueError(
                "SMOTE requires an outcome column with exactly two "
                "classes - choose a binary outcome, or use "
                "oversampling, undersampling, or reweighting instead, "
                "which work without one."
            )

        if method == "oversampling":
            result = oversample_minority_groups(
                self.df,
                self.protected_attribute,
                self.target,
            )

        elif method == "undersampling":
            result = undersample_majority_groups(
                self.df,
                self.protected_attribute,
                self.target,
            )

        elif method == "reweighting":
            result = apply_reweighting(
                self.df,
                self.protected_attribute,
            )

        elif method == "smote":
            result = apply_smote(
                self.df,
                self.target,
            )

        else:
            raise RuntimeError(
                "Unexpected mitigation method."
            )

        metadata = {
            "method": method,
            "original_rows": int(len(self.df)),
            "result_rows": int(len(result)),
            "row_change": int(
                len(result) - len(self.df)
            ),
        }

        return result, metadata