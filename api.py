# FILE: api.ts

from __future__ import annotations

import io
import os
import uuid
from typing import Any

import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from detector.detector import (
    target_imbalance,
    target_imbalance_by_group,
)
from detector.missingness import missingness_by_group
from detector.outcome import (
    continuous_outcome_by_group,
    multiclass_outcome_by_group,
    outcome_by_group,
)
from detector.profiler import DatasetProfiler
from detector.recommendations import build_recommendations
from detector.representation import representation_by_group
from detector.scan import DatasetScanner

from evaluation.comparison import compare_datasets
from evaluation.fairness import fairness_report
from evaluation.performance import performance_report

from optimizer.optimizer import (
    BiasOptimizer,
    SUPPORTED_METHODS,
)

from utils.preprocessing import clean_dataframe
from utils.validation import (
    ValidationError,
    infer_task_type,
    validate_groups,
    validate_outcome_column,
    validate_target_and_protected,
)

from visualization.charts import (
    fairness_comparison_chart,
    group_distribution_chart,
    outcome_rate_chart,
)


app = FastAPI(
    title="BiasGuard API",
    description=(
        "Machine-learning fairness, bias detection, "
        "and mitigation backend."
    ),
    version="1.0.0",
)


# ---------------------------------------------------------
# CORS
# ---------------------------------------------------------

# ---------------------------------------------------------
# CORS
#
# The frontend authenticates with nothing but a dataset_id in
# the request body, so no cookies/credentials ever cross this
# boundary. That means we can safely allow any origin to reach
# the API without weakening anything - this matters because the
# frontend may be served from localhost, 127.0.0.1, a LAN IP, or
# a remote preview/tunnel URL depending on how it's hosted, and
# a mismatch here is the most common reason "upload silently
# fails" in the browser (the request succeeds but the browser
# blocks the response).
#
# Set ALLOWED_ORIGINS to a comma-separated list to restrict this
# in production, e.g.:
#   ALLOWED_ORIGINS=https://app.example.com,https://staging.example.com
# ---------------------------------------------------------

_env_origins = os.environ.get("ALLOWED_ORIGINS", "").strip()

if _env_origins:
    _allow_origins = [
        origin.strip()
        for origin in _env_origins.split(",")
        if origin.strip()
    ]
    _allow_origin_regex = None
else:
    # Development default: any localhost/127.0.0.1 port, plus
    # common LAN-IP dev hosts. Falls back to explicit list too.
    _allow_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    _allow_origin_regex = r"https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?"

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_origin_regex=_allow_origin_regex,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# In-memory dataset storage
# ---------------------------------------------------------

DATASETS: dict[str, pd.DataFrame] = {}


# ---------------------------------------------------------
# Request models
# ---------------------------------------------------------

class AnalysisRequest(BaseModel):
    dataset_id: str
    # The outcome to evaluate is optional: BiasGuard can still surface
    # useful representation/missingness signals with no outcome at all.
    outcome: str | None = None
    groups: list[str] = Field(min_length=1)


class MitigationRequest(BaseModel):
    dataset_id: str
    target: str
    protected_attribute: str
    method: str


class FairnessRequest(BaseModel):
    dataset_id: str
    target: str
    protected_attribute: str
    prediction_column: str | None = None


class PerformanceRequest(BaseModel):
    dataset_id: str
    y_true: str
    y_pred: str


# ---------------------------------------------------------
# Helper
# ---------------------------------------------------------

def get_dataset(dataset_id: str) -> pd.DataFrame:
    """
    Retrieve a dataset from in-memory storage.
    """
    if dataset_id not in DATASETS:
        raise HTTPException(
            status_code=404,
            detail="Dataset not found.",
        )

    return DATASETS[dataset_id]


# ---------------------------------------------------------
# Health
# ---------------------------------------------------------

@app.get("/api/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "BiasGuard API",
    }


# ---------------------------------------------------------
# Upload CSV
# ---------------------------------------------------------

@app.post("/api/upload")
async def upload_dataset(
    file: UploadFile = File(...),
) -> dict[str, Any]:

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="A CSV file is required.",
        )

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="BiasGuard currently accepts CSV files only.",
        )

    try:
        content = await file.read()

        if not content:
            raise ValueError(
                "Uploaded file is empty."
            )

        df = pd.read_csv(
            io.BytesIO(content)
        )

        df = clean_dataframe(df)

        if df.empty:
            raise ValueError(
                "The uploaded dataset contains no rows."
            )

        if len(df.columns) == 0:
            raise ValueError(
                "The uploaded dataset contains no columns."
            )

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to process CSV: {exc}",
        ) from exc

    dataset_id = str(uuid.uuid4())

    DATASETS[dataset_id] = df

    preview = (
        df.head(10)
        .where(
            pd.notna(df.head(10)),
            None,
        )
        .to_dict(orient="records")
    )

    return {
        "dataset_id": dataset_id,
        "filename": file.filename,
        "rows": int(len(df)),
        "columns": int(len(df.columns)),
        "column_names": df.columns.tolist(),
        "preview": preview,
    }


# ---------------------------------------------------------
# Dataset profile
# ---------------------------------------------------------

@app.get("/api/datasets/{dataset_id}/profile")
def dataset_profile(
    dataset_id: str,
) -> dict[str, Any]:

    df = get_dataset(dataset_id)

    try:
        profiler = DatasetProfiler(df)

        return profiler.profile()

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc


# ---------------------------------------------------------
# Automatic dataset scan (recommendations)
# ---------------------------------------------------------

@app.get("/api/datasets/{dataset_id}/scan")
def dataset_scan(
    dataset_id: str,
) -> dict[str, Any]:
    """
    Automatically scan a dataset right after upload and return
    plain-language recommendations: which columns look like
    outcomes, which look like groups worth comparing, and why.

    This runs with zero configuration from the user - it's what
    replaces the old "pick a target and protected attributes
    before you know what's in your data" flow.
    """
    df = get_dataset(dataset_id)

    try:
        scanner = DatasetScanner(df)
        return scanner.scan()

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc


# ---------------------------------------------------------
# Dataset preview
# ---------------------------------------------------------

@app.get("/api/datasets/{dataset_id}/preview")
def dataset_preview(
    dataset_id: str,
    limit: int = 20,
) -> dict[str, Any]:

    df = get_dataset(dataset_id)

    limit = max(
        1,
        min(limit, 100),
    )

    preview_df = df.head(limit)

    preview = (
        preview_df
        .where(
            pd.notna(preview_df),
            None,
        )
        .to_dict(
            orient="records"
        )
    )

    return {
        "rows": int(len(df)),
        "columns": df.columns.tolist(),
        "preview": preview,
    }


# ---------------------------------------------------------
# Bias detection
# ---------------------------------------------------------

@app.post("/api/detect")
def detect_bias(
    request: AnalysisRequest,
) -> dict[str, Any]:
    """
    Group-comparison analysis. An outcome column is optional:
    with no outcome, BiasGuard still reports representation and
    missingness across the chosen group column(s). When an
    outcome is supplied, the comparison method (binary rate gap,
    multiclass distribution gap, or continuous mean gap) is
    chosen automatically based on the outcome's shape - a binary
    target is one supported case, not a requirement.
    """
    df = get_dataset(request.dataset_id)

    try:
        validate_groups(df, request.groups)

        task_type: str | None = None
        overall_outcome_summary: dict[str, Any] | None = None

        if request.outcome:
            validate_outcome_column(df, request.outcome, request.groups)
            task_type = infer_task_type(df[request.outcome])

            if task_type == "binary_classification":
                overall_outcome_summary = target_imbalance(df, request.outcome)
            elif task_type in ("multiclass_classification",):
                overall_outcome_summary = target_imbalance(df, request.outcome)
            elif task_type == "continuous":
                overall_outcome_summary = None
            else:
                raise ValidationError(
                    f"'{request.outcome}' doesn't look like a usable outcome "
                    "column (too many unique values, or looks like an ID)."
                )

        group_results: dict[str, Any] = {}

        for attribute in request.groups:
            entry: dict[str, Any] = {
                "representation": representation_by_group(df, attribute),
                "missingness": missingness_by_group(df, attribute),
            }

            if request.outcome and task_type == "binary_classification":
                entry["outcome"] = outcome_by_group(
                    df, attribute, request.outcome
                )
                entry["target_imbalance"] = target_imbalance_by_group(
                    df, attribute, request.outcome
                )
            elif request.outcome and task_type == "multiclass_classification":
                entry["outcome_multiclass"] = multiclass_outcome_by_group(
                    df, attribute, request.outcome
                )
                entry["target_imbalance"] = target_imbalance_by_group(
                    df, attribute, request.outcome
                )
            elif request.outcome and task_type == "continuous":
                entry["outcome_continuous"] = continuous_outcome_by_group(
                    df, attribute, request.outcome
                )

            group_results[attribute] = entry

        recommendations = build_recommendations(
            df,
            request.outcome,
            task_type,
            request.groups,
            group_results,
        )

        return {
            "dataset_id": request.dataset_id,
            "outcome": request.outcome,
            "task_type": task_type,
            "groups": request.groups,
            "outcome_summary": overall_outcome_summary,
            "group_analysis": group_results,
            "recommendations": recommendations,
        }

    except ValidationError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except KeyError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Column not found: {exc}",
        ) from exc


# ---------------------------------------------------------
# Fairness metrics
# ---------------------------------------------------------

@app.post("/api/fairness")
def calculate_fairness(
    request: FairnessRequest,
) -> dict[str, Any]:

    df = get_dataset(request.dataset_id)

    try:
        validate_target_and_protected(
            df,
            request.target,
            [request.protected_attribute],
        )

        return fairness_report(
            df,
            request.protected_attribute,
            request.target,
            request.prediction_column,
        )

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc


# ---------------------------------------------------------
# Performance metrics
# ---------------------------------------------------------

@app.post("/api/performance")
def calculate_performance(
    request: PerformanceRequest,
) -> dict[str, Any]:

    df = get_dataset(request.dataset_id)

    try:
        return performance_report(
            df,
            request.y_true,
            request.y_pred,
        )

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc


# ---------------------------------------------------------
# Bias mitigation
# ---------------------------------------------------------

@app.post("/api/mitigate")
def mitigate(
    request: MitigationRequest,
) -> dict[str, Any]:

    df = get_dataset(request.dataset_id)

    method = request.method.lower().strip()

    if method not in SUPPORTED_METHODS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unknown mitigation method '{method}'. "
                f"Supported methods: "
                f"{sorted(SUPPORTED_METHODS)}"
            ),
        )

    try:
        validate_target_and_protected(
            df,
            request.target,
            [request.protected_attribute],
        )

        optimizer = BiasOptimizer(
            df,
            request.target,
            request.protected_attribute,
        )

        mitigated_df, metadata = optimizer.apply(
            method
        )

        comparison = compare_datasets(
            df,
            mitigated_df,
            request.target,
            request.protected_attribute,
        )

        before_dp = comparison["before"][
            "fairness"
        ]["demographic_parity"]

        after_dp = comparison["after"][
            "fairness"
        ]["demographic_parity"]

        charts = {
            "fairness": fairness_comparison_chart(
                before_dp,
                after_dp,
            )
        }

        mitigated_id = str(uuid.uuid4())

        DATASETS[mitigated_id] = mitigated_df

        return {
            "dataset_id": request.dataset_id,
            "mitigated_dataset_id": mitigated_id,
            "metadata": metadata,
            "comparison": comparison,
            "charts": charts,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc


# ---------------------------------------------------------
# Chart data
# ---------------------------------------------------------

@app.get("/api/datasets/{dataset_id}/chart-data")
def chart_data(
    dataset_id: str,
    protected_attribute: str,
    target: str,
) -> dict[str, Any]:

    df = get_dataset(dataset_id)

    try:
        validate_target_and_protected(
            df,
            target,
            [protected_attribute],
        )

        return {
            "representation": group_distribution_chart(
                df,
                protected_attribute,
            ),

            "outcome_rates": outcome_rate_chart(
                df,
                protected_attribute,
                target,
            ),
        }

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc