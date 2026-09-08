from __future__ import annotations

import re
from typing import Any

import pandas as pd

from utils.validation import MULTICLASS_MAX_CARDINALITY, infer_task_type

from detector.outcome import (
    continuous_outcome_by_group,
    multiclass_outcome_by_group,
    outcome_by_group,
)


# Groups can have more distinct values than a classification target
# (e.g. "industry" or "country" columns commonly have 20-60 categories)
# - they just can't be so granular that every row is basically unique.
GROUP_MAX_CARDINALITY = 60
GROUP_MAX_UNIQUE_RATE = 0.5


# Keyword hints. These never gate a suggestion on their own - they just
# push a plausible column higher up the list, since users often can't
# tell a "group" from an "outcome" by column name alone.

GROUP_KEYWORDS = (
    "gender", "sex", "race", "ethnicity", "age", "age_group", "agegroup",
    "disability", "nationality", "citizenship", "religion", "marital",
    "region", "department", "location", "orientation", "language",
    "veteran", "pregnant", "caste", "immigration", "immigrant",
)

OUTCOME_KEYWORDS = (
    "outcome", "target", "label", "approved", "approval", "hired",
    "hire", "promoted", "promotion", "salary", "income", "wage", "score",
    "result", "status", "decision", "default", "churn", "risk", "accepted",
    "rejected", "pass", "fail", "grade", "rating", "loan_status", "granted",
    "admitted", "admission", "selected", "success", "performance",
)

ID_KEYWORDS = ("id", "uuid", "index", "identifier", "name", "email", "phone")


def _tokenize(column: str) -> str:
    """
    Normalize a column name into an underscore-padded, underscore-
    delimited token string so keyword checks only match whole words
    (e.g. the "id" keyword should match a column called "user_id",
    not the substring inside "total_laid_off").
    """
    normalized = re.sub(r"[^a-z0-9]+", "_", column.lower())
    return f"_{normalized}_"


def _name_hits(column: str, keywords: tuple[str, ...]) -> bool:
    tokens = _tokenize(column)
    for keyword in keywords:
        needle = f"_{keyword.strip('_')}_"
        if needle in tokens:
            return True
    return False


class DatasetScanner:
    """
    Inspects a freshly uploaded dataset and produces plain-language
    recommendations, without requiring the user to know what a
    "target variable" or "protected attribute" is.
    """

    def __init__(self, df: pd.DataFrame):
        self.df = df
        self.n_rows = len(df)

    # -----------------------------------------------------------
    # Public entry point
    # -----------------------------------------------------------

    def scan(self) -> dict[str, Any]:
        column_signals = self._column_signals()

        candidate_groups = self._rank_groups(column_signals)
        candidate_outcomes = self._rank_outcomes(column_signals)

        recommendations = self._build_recommendations(
            candidate_groups,
            candidate_outcomes,
        )

        quality_flags = self._quality_flags(column_signals)

        return {
            "rows": int(self.n_rows),
            "columns": int(len(self.df.columns)),
            "candidate_groups": candidate_groups,
            "candidate_outcomes": candidate_outcomes,
            "recommendations": recommendations,
            "quality_flags": quality_flags,
            "has_usable_groups": len(candidate_groups) > 0,
        }

    # -----------------------------------------------------------
    # Per-column signal extraction
    # -----------------------------------------------------------

    def _column_signals(self) -> list[dict[str, Any]]:
        signals = []

        for column in self.df.columns:
            series = self.df[column]
            non_null = series.dropna()
            n = len(series)
            missing_count = int(series.isna().sum())
            missing_rate = (missing_count / n) if n else 0.0
            unique_count = int(non_null.nunique())
            unique_rate = (unique_count / n) if n else 0.0
            is_numeric = pd.api.types.is_numeric_dtype(series)
            task_type = infer_task_type(series)

            signals.append(
                {
                    "column": column,
                    "missing_count": missing_count,
                    "missing_rate": missing_rate,
                    "unique_count": unique_count,
                    "unique_rate": unique_rate,
                    "is_numeric": is_numeric,
                    "task_type": task_type,
                    "looks_like_id": (
                        _name_hits(column, ID_KEYWORDS)
                        or (unique_rate > 0.9 and unique_count > MULTICLASS_MAX_CARDINALITY)
                    ),
                }
            )

        return signals

    # -----------------------------------------------------------
    # Ranking candidate group (protected attribute) columns
    # -----------------------------------------------------------

    def _rank_groups(
        self,
        column_signals: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        candidates = []

        for sig in column_signals:
            if sig["looks_like_id"]:
                continue

            # A usable "group" needs at least 2 distinct values, and
            # shouldn't be so granular that it's basically unique per
            # row (that's an identifier, not a group) - but unlike a
            # classification target, groups commonly have dozens of
            # categories (e.g. "industry", "country"), so this cap is
            # much looser than the multiclass-outcome cap.
            if sig["unique_count"] < 2:
                continue
            if sig["unique_count"] > GROUP_MAX_CARDINALITY:
                continue
            if sig["unique_rate"] > GROUP_MAX_UNIQUE_RATE:
                continue

            # A column that clearly reads as an outcome (e.g.
            # "loan_approved") shouldn't also be suggested as a group,
            # even though it happens to be low-cardinality.
            if _name_hits(sig["column"], OUTCOME_KEYWORDS) and not _name_hits(
                sig["column"], GROUP_KEYWORDS
            ):
                continue

            score = 0.0
            reasons = []

            if _name_hits(sig["column"], GROUP_KEYWORDS):
                score += 3.0
                reasons.append("Column name suggests a demographic or group attribute")

            if not sig["is_numeric"]:
                score += 1.0

            if 2 <= sig["unique_count"] <= 8:
                score += 1.0
                reasons.append(f"Has {sig['unique_count']} distinct groups")
            elif 9 <= sig["unique_count"] <= 20:
                score += 0.5
                reasons.append(f"Has {sig['unique_count']} distinct groups")
            else:
                # Still usable, but a lot of categories to compare -
                # nudge it lower rather than excluding it outright.
                score += 0.15
                reasons.append(
                    f"Has {sig['unique_count']} distinct values - more "
                    f"categories to compare, but still usable"
                )

            imbalance = self._group_representation_imbalance(sig["column"])
            if imbalance is not None and imbalance < 0.5:
                score += 0.5
                reasons.append("Groups are unevenly represented")

            if score <= 0:
                continue

            if not reasons:
                reasons.append(f"Has {sig['unique_count']} distinct values, a plausible grouping")

            candidates.append(
                {
                    "column": sig["column"],
                    "score": round(score, 2),
                    "distinct_groups": sig["unique_count"],
                    "missing_rate": round(sig["missing_rate"], 4),
                    "representation_imbalance_ratio": (
                        round(imbalance, 4) if imbalance is not None else None
                    ),
                    "reasons": reasons,
                }
            )

        candidates.sort(key=lambda c: c["score"], reverse=True)
        return candidates[:8]

    def _group_representation_imbalance(self, column: str) -> float | None:
        counts = self.df[column].dropna().value_counts()
        if len(counts) < 2:
            return None
        largest = float(counts.max())
        smallest = float(counts.min())
        return (smallest / largest) if largest > 0 else 1.0

    # -----------------------------------------------------------
    # Ranking candidate outcome columns
    # -----------------------------------------------------------

    def _rank_outcomes(
        self,
        column_signals: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        candidates = []

        for sig in column_signals:
            if sig["looks_like_id"]:
                continue

            if sig["task_type"] in ("unknown", "unsupported", "identifier"):
                continue

            # A column that clearly reads as a demographic group
            # (e.g. "gender") shouldn't also be suggested as the
            # outcome, even though it happens to be binary.
            if _name_hits(sig["column"], GROUP_KEYWORDS) and not _name_hits(
                sig["column"], OUTCOME_KEYWORDS
            ):
                continue

            score = 0.0
            reasons = []

            if _name_hits(sig["column"], OUTCOME_KEYWORDS):
                score += 3.0
                reasons.append("Column name suggests a decision or outcome")

            if sig["task_type"] == "binary_classification":
                score += 2.0
                reasons.append("Has exactly two values, like a yes/no decision")
            elif sig["task_type"] == "multiclass_classification":
                score += 1.0
                reasons.append(
                    f"Has {sig['unique_count']} categories, like a rating or decision type"
                )
            elif sig["task_type"] == "continuous":
                score += 0.5
                reasons.append("Numeric value that could reflect an outcome, like a score or salary")

            if score <= 0:
                continue

            candidates.append(
                {
                    "column": sig["column"],
                    "score": round(score, 2),
                    "task_type": sig["task_type"],
                    "distinct_values": sig["unique_count"],
                    "missing_rate": round(sig["missing_rate"], 4),
                    "reasons": reasons,
                }
            )

        candidates.sort(key=lambda c: c["score"], reverse=True)
        return candidates[:8]

    # -----------------------------------------------------------
    # Pairing groups + outcomes into human-readable recommendations
    # -----------------------------------------------------------

    def _build_recommendations(
        self,
        candidate_groups: list[dict[str, Any]],
        candidate_outcomes: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        recommendations = []

        top_groups = candidate_groups[:3]
        top_outcomes = candidate_outcomes[:3]

        for group in top_groups:
            for outcome in top_outcomes:
                if group["column"] == outcome["column"]:
                    continue

                signal = self._pair_signal(
                    group["column"],
                    outcome["column"],
                    outcome["task_type"],
                )

                if signal is None:
                    continue

                recommendations.append(signal)

        # If there's no usable outcome at all, still recommend
        # exploring representation for the strongest group column.
        if not top_outcomes and top_groups:
            best_group = top_groups[0]
            recommendations.append(
                {
                    "group": best_group["column"],
                    "outcome": None,
                    "task_type": None,
                    "headline": f"Possible group: {best_group['column']}",
                    "detail": (
                        f"No clear outcome column was found, but "
                        f"'{best_group['column']}' looks like a group to check "
                        f"for representation and missing-data imbalances."
                    ),
                    "severity": "info",
                    "gap": None,
                }
            )

        recommendations.sort(
            key=lambda r: {"high": 2, "moderate": 1, "info": 0, "low": 0}.get(
                r["severity"], 0
            ),
            reverse=True,
        )

        return recommendations[:6]

    def _pair_signal(
        self,
        group_col: str,
        outcome_col: str,
        task_type: str,
    ) -> dict[str, Any] | None:
        try:
            if task_type == "binary_classification":
                result = outcome_by_group(self.df, group_col, outcome_col)
                gap = result["positive_rate_gap"]
                gap_pct = round(gap * 100, 1)
                severity = self._severity(gap)
                detail = (
                    f"'{outcome_col}' outcomes differ by up to {gap_pct} "
                    f"percentage points between '{group_col}' groups."
                )
            elif task_type == "multiclass_classification":
                result = multiclass_outcome_by_group(self.df, group_col, outcome_col)
                gap = result["max_distribution_gap"]
                gap_pct = round(gap * 100, 1)
                severity = self._severity(gap)
                detail = (
                    f"The distribution of '{outcome_col}' looks different "
                    f"across '{group_col}' groups (up to {gap_pct}% divergence)."
                )
            elif task_type == "continuous":
                result = continuous_outcome_by_group(self.df, group_col, outcome_col)
                relative_gap = result["relative_mean_gap"] or 0.0
                gap = abs(relative_gap)
                gap_pct = round(gap * 100, 1)
                severity = self._severity(gap)
                detail = (
                    f"Average '{outcome_col}' differs by about {gap_pct}% "
                    f"between '{group_col}' groups."
                )
            else:
                return None
        except Exception:
            return None

        return {
            "group": group_col,
            "outcome": outcome_col,
            "task_type": task_type,
            "headline": f"Possible outcome: {outcome_col} · Possible group: {group_col}",
            "detail": detail,
            "why_it_matters": (
                f"Outcomes differ between these groups, which is worth a closer look."
            ),
            "severity": severity,
            "gap": round(float(gap), 4),
        }

    @staticmethod
    def _severity(gap: float) -> str:
        if gap >= 0.3:
            return "high"
        if gap >= 0.1:
            return "moderate"
        return "low"

    # -----------------------------------------------------------
    # Dataset-wide quality flags (missingness, duplicates, etc.)
    # -----------------------------------------------------------

    def _quality_flags(
        self,
        column_signals: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        flags = []

        duplicate_rows = int(self.df.duplicated().sum())
        if duplicate_rows > 0:
            flags.append(
                {
                    "type": "duplicate_rows",
                    "severity": "moderate" if duplicate_rows / max(self.n_rows, 1) > 0.05 else "low",
                    "message": f"{duplicate_rows} duplicate rows detected.",
                }
            )

        high_missing = [
            sig for sig in column_signals if sig["missing_rate"] > 0.2
        ]
        for sig in sorted(high_missing, key=lambda s: -s["missing_rate"])[:5]:
            flags.append(
                {
                    "type": "high_missingness",
                    "column": sig["column"],
                    "severity": "high" if sig["missing_rate"] > 0.5 else "moderate",
                    "message": (
                        f"'{sig['column']}' is missing "
                        f"{round(sig['missing_rate'] * 100, 1)}% of values."
                    ),
                }
            )

        return flags
