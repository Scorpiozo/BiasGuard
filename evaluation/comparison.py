from __future__ import annotations

from typing import Any

import pandas as pd

from detector.outcome import (
    continuous_outcome_by_group,
    multiclass_outcome_by_group,
)
from detector.representation import representation_by_group
from evaluation.fairness import fairness_report


def compare_datasets(
    before: pd.DataFrame,
    after: pd.DataFrame,
    protected_attribute: str,
    outcome: str | None = None,
    task_type: str | None = None,
) -> dict[str, Any]:
    """
    Compare group representation - and, if an outcome was chosen,
    outcome disparity - before and after mitigation.

    An outcome is optional and, when present, can be binary,
    multiclass, or continuous: the comparison method is chosen to
    match, the same way /api/detect already does. Mitigation methods
    like oversampling, undersampling, and reweighting only rebalance
    group representation and don't need an outcome at all; SMOTE is
    the one method that needs a binary outcome specifically.
    """
    before_representation = representation_by_group(before, protected_attribute)
    after_representation = representation_by_group(after, protected_attribute)

    result: dict[str, Any] = {
        "before": {
            "rows": int(len(before)),
            "representation": before_representation,
        },
        "after": {
            "rows": int(len(after)),
            "representation": after_representation,
        },
        "changes": {
            "row_count": int(len(after) - len(before)),
        },
        "task_type": task_type,
    }

    if not outcome:
        result["interpretation"] = (
            "No outcome was selected, so this compares group "
            "representation only - how many rows each group has "
            "before and after mitigation."
        )
        return result

    if task_type == "binary_classification":
        _apply_binary_comparison(result, before, after, protected_attribute, outcome)
    elif task_type == "multiclass_classification":
        _apply_multiclass_comparison(
            result, before, after, protected_attribute, outcome
        )
    elif task_type == "continuous":
        _apply_continuous_comparison(
            result, before, after, protected_attribute, outcome
        )
    else:
        result["interpretation"] = (
            f"'{outcome}' isn't a comparable outcome type, so only "
            f"group representation is shown."
        )

    return result


def _difference(after_value, before_value) -> float | None:
    if after_value is None or before_value is None:
        return None
    return round(float(after_value - before_value), 4)


def _apply_binary_comparison(
    result: dict[str, Any],
    before: pd.DataFrame,
    after: pd.DataFrame,
    protected_attribute: str,
    outcome: str,
) -> None:
    before_fairness = fairness_report(before, protected_attribute, outcome)
    after_fairness = fairness_report(after, protected_attribute, outcome)

    result["before"]["fairness"] = before_fairness
    result["after"]["fairness"] = after_fairness

    before_dp = before_fairness["demographic_parity"]
    after_dp = after_fairness["demographic_parity"]

    before_gap = before_dp.get("selection_rate_gap")
    after_gap = after_dp.get("selection_rate_gap")
    before_di = before_dp.get("disparate_impact")
    after_di = after_dp.get("disparate_impact")

    result["changes"].update(
        {
            "selection_rate_gap": _difference(after_gap, before_gap),
            "disparate_impact": _difference(after_di, before_di),
            "outcome_gap_before": before_gap,
            "outcome_gap_after": after_gap,
        }
    )

    result["interpretation"] = _interpret_binary(
        before_gap, after_gap, before_di, after_di
    )


def _apply_multiclass_comparison(
    result: dict[str, Any],
    before: pd.DataFrame,
    after: pd.DataFrame,
    protected_attribute: str,
    outcome: str,
) -> None:
    try:
        before_outcome = multiclass_outcome_by_group(before, protected_attribute, outcome)
        after_outcome = multiclass_outcome_by_group(after, protected_attribute, outcome)
    except Exception:
        result["interpretation"] = (
            f"Couldn't compare '{outcome}' across groups after "
            f"mitigation - showing group representation only."
        )
        return

    result["before"]["outcome_comparison"] = before_outcome
    result["after"]["outcome_comparison"] = after_outcome

    before_gap = before_outcome.get("max_distribution_gap")
    after_gap = after_outcome.get("max_distribution_gap")

    result["changes"].update(
        {
            "outcome_gap_before": before_gap,
            "outcome_gap_after": after_gap,
            "outcome_gap_change": _difference(after_gap, before_gap),
        }
    )

    result["interpretation"] = _interpret_gap(
        before_gap,
        after_gap,
        metric_name=f"how differently '{outcome}' is distributed across groups",
    )


def _apply_continuous_comparison(
    result: dict[str, Any],
    before: pd.DataFrame,
    after: pd.DataFrame,
    protected_attribute: str,
    outcome: str,
) -> None:
    try:
        before_outcome = continuous_outcome_by_group(before, protected_attribute, outcome)
        after_outcome = continuous_outcome_by_group(after, protected_attribute, outcome)
    except Exception:
        result["interpretation"] = (
            f"Couldn't compare '{outcome}' across groups after "
            f"mitigation - showing group representation only."
        )
        return

    result["before"]["outcome_comparison"] = before_outcome
    result["after"]["outcome_comparison"] = after_outcome

    before_gap = before_outcome.get("relative_mean_gap")
    after_gap = after_outcome.get("relative_mean_gap")

    result["changes"].update(
        {
            "outcome_gap_before": before_gap,
            "outcome_gap_after": after_gap,
            "outcome_gap_change": _difference(after_gap, before_gap),
        }
    )

    result["interpretation"] = _interpret_gap(
        before_gap,
        after_gap,
        metric_name=f"the gap in average '{outcome}' between groups",
        as_percentage=True,
    )


def _interpret_gap(
    before_gap: float | None,
    after_gap: float | None,
    metric_name: str,
    as_percentage: bool = False,
) -> str:
    if before_gap is None or after_gap is None:
        return f"Insufficient information to compare {metric_name}."

    before_gap = abs(before_gap)
    after_gap = abs(after_gap)

    def fmt(v: float) -> str:
        return f"{v * 100:.1f}%" if as_percentage else f"{v:.3f}"

    if after_gap < before_gap:
        return (
            f"{metric_name.capitalize()} decreased from {fmt(before_gap)} "
            f"to {fmt(after_gap)} after mitigation."
        )
    if after_gap > before_gap:
        return (
            f"{metric_name.capitalize()} increased from {fmt(before_gap)} "
            f"to {fmt(after_gap)} after mitigation."
        )
    return f"{metric_name.capitalize()} did not change after mitigation."


def _interpret_binary(
    before_gap,
    after_gap,
    before_di,
    after_di,
) -> str:
    if before_gap is None or after_gap is None:
        return "Insufficient information to compare selection-rate disparity."

    if after_gap < before_gap:
        message = "Observed group outcome disparity decreased after mitigation."
    elif after_gap > before_gap:
        message = "Observed group outcome disparity increased after mitigation."
    else:
        message = "Observed group outcome disparity did not change."

    if before_di is not None and after_di is not None:
        if after_di > before_di:
            message += (
                " The disparate-impact ratio also moved closer to parity."
            )
        elif after_di < before_di:
            message += (
                " The disparate-impact ratio moved farther from parity."
            )

    return message
