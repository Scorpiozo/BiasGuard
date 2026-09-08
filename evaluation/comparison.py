from __future__ import annotations

from typing import Any

import pandas as pd

from detector.detector import (
    target_imbalance,
    target_imbalance_by_group,
)
from evaluation.fairness import fairness_report


def compare_datasets(
    before: pd.DataFrame,
    after: pd.DataFrame,
    target: str,
    protected_attribute: str,
) -> dict[str, Any]:
    """
    Compare fairness-relevant statistics before and after mitigation.
    """
    before_fairness = fairness_report(
        before,
        protected_attribute,
        target,
    )

    after_fairness = fairness_report(
        after,
        protected_attribute,
        target,
    )

    before_dp = before_fairness[
        "demographic_parity"
    ]

    after_dp = after_fairness[
        "demographic_parity"
    ]

    def difference(
        after_value,
        before_value,
    ):
        if (
            after_value is None
            or before_value is None
        ):
            return None

        return round(
            float(after_value - before_value),
            4,
        )

    before_gap = before_dp.get(
        "selection_rate_gap"
    )

    after_gap = after_dp.get(
        "selection_rate_gap"
    )

    before_di = before_dp.get(
        "disparate_impact"
    )

    after_di = after_dp.get(
        "disparate_impact"
    )

    return {
        "before": {
            "rows": int(len(before)),
            "fairness": before_fairness,
        },
        "after": {
            "rows": int(len(after)),
            "fairness": after_fairness,
        },
        "changes": {
            "selection_rate_gap": difference(
                after_gap,
                before_gap,
            ),
            "disparate_impact": difference(
                after_di,
                before_di,
            ),
            "row_count": int(
                len(after) - len(before)
            ),
        },
        "interpretation": _interpret(
            before_gap,
            after_gap,
            before_di,
            after_di,
        ),
    }


def _interpret(
    before_gap,
    after_gap,
    before_di,
    after_di,
) -> str:
    if (
        before_gap is None
        or after_gap is None
    ):
        return (
            "Insufficient information to compare "
            "selection-rate disparity."
        )

    if after_gap < before_gap:
        message = (
            "Observed group outcome disparity decreased "
            "after mitigation."
        )
    elif after_gap > before_gap:
        message = (
            "Observed group outcome disparity increased "
            "after mitigation."
        )
    else:
        message = (
            "Observed group outcome disparity did not change."
        )

    if (
        before_di is not None
        and after_di is not None
    ):
        if after_di > before_di:
            message += (
                " The disparate-impact ratio also moved "
                "closer to parity."
            )
        elif after_di < before_di:
            message += (
                " The disparate-impact ratio moved farther "
                "from parity."
            )

    return message