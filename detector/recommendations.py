from __future__ import annotations

from typing import Any

import pandas as pd

from detector.scan import GROUP_KEYWORDS, ID_KEYWORDS, _name_hits


IMBALANCE_HIGH = 0.2   # smallest group < 20% the size of the largest
IMBALANCE_MODERATE = 0.5

MISSING_HIGH = 0.5
MISSING_MODERATE = 0.2

GAP_HIGH = 0.3
GAP_MODERATE = 0.15


def _severity_rank(severity: str) -> int:
    return {"high": 3, "moderate": 2, "low": 1}.get(severity, 0)


def build_recommendations(
    df: pd.DataFrame,
    outcome: str | None,
    task_type: str | None,
    groups: list[str],
    group_analysis: dict[str, Any],
) -> list[dict[str, Any]]:
    """
    Translate the numbers from /api/detect into concrete, plain-language
    actions a non-technical person can take to make the dataset better
    for training a model - not just a report of what's wrong.

    Distinguishes between:
      - imbalance in a column that reads as a protected/demographic
        attribute (framed as a bias risk with a mitigation action), and
      - imbalance in an incidental column (framed as "this is probably
        just your population" so people don't over-correct things that
        don't matter for fairness).
    """
    items: list[dict[str, Any]] = []

    for attribute in groups:
        entry = group_analysis.get(attribute, {})
        is_sensitive = _name_hits(attribute, GROUP_KEYWORDS)

        items.extend(_representation_items(attribute, entry, is_sensitive))
        items.extend(_missingness_items(attribute, entry))

        if outcome:
            items.extend(
                _outcome_gap_items(attribute, outcome, entry, is_sensitive)
            )

    items.extend(_dataset_wide_items(df, set(groups) | {outcome or ""}))

    items = _dedupe(items)
    items.sort(key=lambda i: _severity_rank(i["severity"]), reverse=True)
    return items


def _dedupe(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Drop repeat items with the same title (e.g. a missing-data
    flag for a column that shows up once per group attribute) so the
    same finding isn't listed multiple times."""
    seen: set[str] = set()
    deduped = []
    for item in items:
        key = item["title"]
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)
    return deduped


def _representation_items(
    attribute: str,
    entry: dict[str, Any],
    is_sensitive: bool,
) -> list[dict[str, Any]]:
    groups_data = entry.get("representation", {}).get("groups", [])
    counts = [g["count"] for g in groups_data if not g.get("is_missing")]

    if len(counts) < 2:
        return []

    largest, smallest = max(counts), min(counts)
    ratio = (smallest / largest) if largest else 1.0

    if ratio >= IMBALANCE_MODERATE:
        return []

    severity = "high" if ratio < IMBALANCE_HIGH else "moderate"

    if is_sensitive:
        return [
            {
                "severity": severity,
                "category": "representation",
                "title": f"'{attribute}' groups are imbalanced",
                "why": (
                    f"The smallest '{attribute}' group has only about "
                    f"{ratio * 100:.0f}% as many rows as the largest. A "
                    f"model trained on this data will likely perform "
                    f"worse for the underrepresented group."
                ),
                "action": (
                    f"Collect more data for the underrepresented "
                    f"'{attribute}' group(s), or apply class reweighting "
                    f"/ stratified sampling when you train."
                ),
            }
        ]

    # Not a demographic-sounding column — likely just population shape,
    # so keep this low-severity and don't call it "bias".
    return [
        {
            "severity": "low",
            "category": "representation",
            "title": f"'{attribute}' isn't evenly distributed",
            "why": (
                f"This probably reflects your actual population rather "
                f"than a bias problem. Still, a model may generalize "
                f"less well to the smaller '{attribute}' groups."
            ),
            "action": (
                f"Only worth addressing if '{attribute}' matters for "
                f"your use case — if so, consider gathering more data "
                f"for the smaller groups."
            ),
        }
    ]


def _missingness_items(
    attribute: str,
    entry: dict[str, Any],
) -> list[dict[str, Any]]:
    details = entry.get("missingness", {}).get("details", [])

    # Exclude the grouping column's own missingness: within the
    # "Missing" bucket it is tautologically 100% missing (that's the
    # definition of that bucket), which is circular, not informative.
    details = [d for d in details if d.get("column") != attribute]

    flagged = [d for d in details if d.get("missing_rate", 0) > MISSING_MODERATE]

    if not flagged:
        return []

    # One item per offending column (deduped), not per group x column.
    seen_columns: dict[str, float] = {}
    for d in flagged:
        col = d["column"]
        seen_columns[col] = max(seen_columns.get(col, 0), d["missing_rate"])

    items = []
    for col, rate in sorted(seen_columns.items(), key=lambda kv: -kv[1])[:3]:
        severity = "high" if rate > MISSING_HIGH else "moderate"
        items.append(
            {
                "severity": severity,
                "category": "missing_data",
                "title": f"'{col}' has a lot of missing values",
                "why": (
                    f"Up to {rate * 100:.0f}% missing for some "
                    f"'{attribute}' groups means the model gets little "
                    f"signal from this column, and results tied to it "
                    f"may be unreliable."
                ),
                "action": (
                    f"Fill in '{col}' with a reasonable default or "
                    f"imputed value, or drop the column if it isn't "
                    f"essential before training."
                ),
            }
        )
    return items


def _outcome_gap_items(
    attribute: str,
    outcome: str,
    entry: dict[str, Any],
    is_sensitive: bool,
) -> list[dict[str, Any]]:
    gap = None
    detail = ""

    if entry.get("outcome"):
        gap = entry["outcome"]["positive_rate_gap"]
        detail = (
            f"'{outcome}' outcomes differ by {gap * 100:.0f} percentage "
            f"points across '{attribute}' groups."
        )
    elif entry.get("outcome_multiclass"):
        gap = entry["outcome_multiclass"]["max_distribution_gap"]
        detail = (
            f"The mix of '{outcome}' categories differs by up to "
            f"{gap * 100:.0f}% between '{attribute}' groups."
        )
    elif entry.get("outcome_continuous"):
        relative = entry["outcome_continuous"].get("relative_mean_gap")
        gap = abs(relative) if relative is not None else None
        if gap is not None:
            detail = (
                f"Average '{outcome}' differs by about {gap * 100:.0f}% "
                f"between '{attribute}' groups."
            )

    if gap is None or gap < GAP_MODERATE:
        return []

    severity = "high" if gap >= GAP_HIGH else "moderate"

    if is_sensitive:
        action = (
            f"This is worth addressing before using '{outcome}' to train "
            f"a model. Consider reweighting training examples, adjusting "
            f"decision thresholds per group, or reviewing why "
            f"'{outcome}' differs by '{attribute}' in the first place — "
            f"a real-world cause is different from a data artifact."
        )
    else:
        action = (
            f"Since '{attribute}' isn't typically a protected "
            f"characteristic, this may just be a real pattern in the "
            f"data. Still worth a sanity check before training on "
            f"'{outcome}'."
        )

    return [
        {
            "severity": severity,
            "category": "outcome_gap",
            "title": f"'{outcome}' differs across '{attribute}'",
            "why": detail,
            "action": action,
        }
    ]


def _dataset_wide_items(
    df: pd.DataFrame,
    exclude: set[str],
) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    n = len(df)

    duplicate_rows = int(df.duplicated().sum())
    if duplicate_rows > 0:
        rate = duplicate_rows / n if n else 0
        items.append(
            {
                "severity": "high" if rate > 0.05 else "low",
                "category": "data_quality",
                "title": f"{duplicate_rows} duplicate rows",
                "why": (
                    "Duplicate rows can silently over-weight certain "
                    "examples during training."
                ),
                "action": "Remove exact duplicate rows before training.",
            }
        )

    for column in df.columns:
        if column in exclude:
            continue

        series = df[column]
        non_null = series.dropna()
        nunique = non_null.nunique()

        if nunique <= 1:
            items.append(
                {
                    "severity": "low",
                    "category": "data_quality",
                    "title": f"'{column}' has only one distinct value",
                    "why": "Constant columns add no information to a model.",
                    "action": f"Drop '{column}' before training.",
                }
            )
            continue

        looks_like_id = _name_hits(column, ID_KEYWORDS) or (
            len(non_null)
            and nunique / len(non_null) > 0.9
            and nunique > 20
            and not pd.api.types.is_numeric_dtype(series)
        )

        if looks_like_id:
            items.append(
                {
                    "severity": "low",
                    "category": "data_quality",
                    "title": f"'{column}' looks like an identifier",
                    "why": (
                        "High-cardinality columns like IDs, names, or "
                        "emails don't generalize and can let a model "
                        "memorize individuals instead of learning "
                        "patterns."
                    ),
                    "action": (
                        f"Drop '{column}' before training unless you "
                        f"specifically need it for row tracking."
                    ),
                }
            )

    return items[:6]
