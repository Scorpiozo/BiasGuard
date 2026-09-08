from __future__ import annotations

import pandas as pd


def undersample_majority_groups(
    df: pd.DataFrame,
    protected_attribute: str,
    target: str,
    random_state: int = 42,
) -> pd.DataFrame:
    """
    Undersample overrepresented protected groups so all groups
    have the same number of observations as the smallest group.
    """
    if df.empty:
        return df.copy()

    group_sizes = (
        df[protected_attribute]
        .value_counts(dropna=False)
    )

    if len(group_sizes) < 2:
        return df.copy()

    target_size = int(group_sizes.min())

    pieces = []

    for group in group_sizes.index:
        mask = (
            df[protected_attribute].isna()
            if pd.isna(group)
            else df[protected_attribute] == group
        )

        group_df = df.loc[mask]

        if len(group_df) > target_size:
            group_df = group_df.sample(
                n=target_size,
                random_state=random_state,
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