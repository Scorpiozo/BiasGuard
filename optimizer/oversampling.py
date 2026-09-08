from __future__ import annotations

import pandas as pd


def oversample_minority_groups(
    df: pd.DataFrame,
    protected_attribute: str,
    target: str,
    random_state: int = 42,
) -> pd.DataFrame:
    """
    Oversample rows belonging to underrepresented
    protected groups.

    Rows are sampled with replacement until every
    protected group reaches the size of the largest group.
    """
    if df.empty:
        return df.copy()

    group_sizes = (
        df[protected_attribute]
        .value_counts(dropna=False)
    )

    if len(group_sizes) < 2:
        return df.copy()

    target_size = int(group_sizes.max())

    pieces = []

    for group, group_size in group_sizes.items():
        mask = (
            df[protected_attribute].isna()
            if pd.isna(group)
            else df[protected_attribute] == group
        )

        group_df = df.loc[mask]

        if len(group_df) < target_size:
            extra = group_df.sample(
                n=target_size - len(group_df),
                replace=True,
                random_state=random_state,
            )

            group_df = pd.concat(
                [group_df, extra],
                ignore_index=True,
            )

        pieces.append(group_df)

    result = pd.concat(
        pieces,
        ignore_index=True,
    )

    return result.sample(
        frac=1,
        random_state=random_state,
    ).reset_index(drop=True)