from __future__ import annotations

from typing import Any

import pandas as pd

from utils.preprocessing import json_safe


class DatasetProfiler:
    """
    Produces a structural and statistical profile of a dataset.
    """

    def __init__(self, df: pd.DataFrame):
        self.df = df

    def profile(self) -> dict[str, Any]:
        return {
            "rows": int(len(self.df)),
            "columns": int(len(self.df.columns)),
            "memory_usage_bytes": int(
                self.df.memory_usage(deep=True).sum()
            ),
            "duplicate_rows": int(
                self.df.duplicated().sum()
            ),
            "columns_detail": self._column_details(),
        }

    def _column_details(self) -> list[dict[str, Any]]:
        details = []

        for column in self.df.columns:
            series = self.df[column]

            non_null = series.dropna()
            unique_count = int(series.nunique(dropna=True))

            item: dict[str, Any] = {
                "name": column,
                "dtype": str(series.dtype),
                "missing_count": int(series.isna().sum()),
                "missing_percentage": round(
                    float(series.isna().mean() * 100),
                    2,
                ),
                "unique_count": unique_count,
                "unique_percentage": round(
                    float(
                        unique_count / len(series) * 100
                    ),
                    2,
                ) if len(series) else 0.0,
            }

            if pd.api.types.is_numeric_dtype(series):
                if not non_null.empty:
                    item["statistics"] = {
                        "mean": json_safe(non_null.mean()),
                        "median": json_safe(non_null.median()),
                        "std": json_safe(non_null.std()),
                        "min": json_safe(non_null.min()),
                        "max": json_safe(non_null.max()),
                    }
                else:
                    item["statistics"] = {}
            else:
                top_values = (
                    series.value_counts(
                        dropna=False
                    )
                    .head(10)
                )

                item["top_values"] = [
                    {
                        "value": json_safe(index),
                        "count": int(count),
                        "percentage": round(
                            float(count / len(series) * 100),
                            2,
                        ),
                    }
                    for index, count in top_values.items()
                ]

            details.append(item)

        return details