from __future__ import annotations

from typing import Any

import pandas as pd


def multiclass_outcome_by_group(
    df: pd.DataFrame,
    protected_attribute: str,
    outcome: str,
) -> dict[str, Any]:
    """
    Compare the distribution of a multiclass (or low-cardinality
    categorical) outcome across groups, without requiring the
    outcome to be binary.
    """
    work = df[[protected_attribute, outcome]].dropna()

    classes = sorted(str(v) for v in work[outcome].unique())

    groups = []
    distributions: dict[str, dict[str, float]] = {}

    for group, subset in work.groupby(protected_attribute, dropna=False):
        counts = subset[outcome].astype(str).value_counts()
        total = len(subset)

        class_breakdown = [
            {
                "class": cls,
                "count": int(counts.get(cls, 0)),
                "percentage": round(
                    float(counts.get(cls, 0) / total * 100), 2
                ) if total else 0.0,
            }
            for cls in classes
        ]

        distributions[str(group)] = {
            cls: (counts.get(cls, 0) / total) if total else 0.0
            for cls in classes
        }

        groups.append(
            {
                "group": str(group),
                "count": int(total),
                "classes": class_breakdown,
            }
        )

    # Total variation distance between the two most different groups,
    # used as a single "how different are these groups" headline number.
    max_tvd = 0.0
    group_names = list(distributions.keys())

    for i in range(len(group_names)):
        for j in range(i + 1, len(group_names)):
            a = distributions[group_names[i]]
            b = distributions[group_names[j]]
            tvd = 0.5 * sum(
                abs(a.get(cls, 0.0) - b.get(cls, 0.0)) for cls in classes
            )
            max_tvd = max(max_tvd, tvd)

    return {
        "attribute": protected_attribute,
        "outcome": outcome,
        "task_type": "multiclass_classification",
        "classes": classes,
        "groups": groups,
        "max_distribution_gap": round(float(max_tvd), 4),
    }


def continuous_outcome_by_group(
    df: pd.DataFrame,
    protected_attribute: str,
    outcome: str,
) -> dict[str, Any]:
    """
    Compare a continuous (numeric) outcome's mean/median across
    groups. Useful for outcomes like salary, score, or duration
    where "positive rate" doesn't make sense.
    """
    work = df[[protected_attribute, outcome]].copy()
    work[outcome] = pd.to_numeric(work[outcome], errors="coerce")
    work = work.dropna()

    groups = []

    for group, subset in work.groupby(protected_attribute, dropna=False):
        series = subset[outcome]

        groups.append(
            {
                "group": str(group),
                "count": int(len(series)),
                "mean": round(float(series.mean()), 4) if len(series) else None,
                "median": round(float(series.median()), 4) if len(series) else None,
                "std": round(float(series.std()), 4) if len(series) > 1 else None,
            }
        )

    means = [g["mean"] for g in groups if g["mean"] is not None]

    if means:
        max_mean = max(means)
        min_mean = min(means)
        gap = max_mean - min_mean
        relative_gap = (
            gap / abs(max_mean) if max_mean not in (0, None) else None
        )
    else:
        gap = 0.0
        relative_gap = None

    return {
        "attribute": protected_attribute,
        "outcome": outcome,
        "task_type": "continuous",
        "groups": groups,
        "mean_gap": round(float(gap), 4),
        "relative_mean_gap": (
            round(float(relative_gap), 4)
            if relative_gap is not None
            else None
        ),
    }


def outcome_by_group(
    df: pd.DataFrame,
    protected_attribute: str,
    target: str,
) -> dict[str, Any]:
    """
    Calculate observed positive/outcome rates by protected group.

    The second target class is treated as the positive outcome.
    """
    work = df[
        [protected_attribute, target]
    ].dropna()

    target_values = list(
        work[target].unique()
    )

    if len(target_values) != 2:
        raise ValueError(
            "Outcome analysis currently requires a binary target."
        )

    positive_class = target_values[1]

    groups = []

    for group, subset in work.groupby(
        protected_attribute,
        dropna=False,
    ):
        count = len(subset)
        positive_count = int(
            (subset[target] == positive_class).sum()
        )

        rate = (
            positive_count / count
            if count
            else 0.0
        )

        groups.append(
            {
                "group": str(group),
                "count": int(count),
                "positive_count": positive_count,
                "positive_rate": round(
                    float(rate),
                    4,
                ),
            }
        )

    rates = [
        item["positive_rate"]
        for item in groups
        if item["count"] > 0
    ]

    if rates:
        max_rate = max(rates)
        min_rate = min(rates)

        rate_gap = max_rate - min_rate

        disparate_impact = (
            min_rate / max_rate
            if max_rate > 0
            else None
        )
    else:
        rate_gap = 0.0
        disparate_impact = None

    return {
        "attribute": protected_attribute,
        "target": target,
        "positive_class": str(positive_class),
        "groups": groups,
        "positive_rate_gap": round(
            float(rate_gap),
            4,
        ),
        "disparate_impact_ratio": (
            round(float(disparate_impact), 4)
            if disparate_impact is not None
            else None
        ),
    }