/**
 * BiasGuard API Client
 * 
 * Typed functions for all FastAPI endpoints.
 * Base URL configured via NEXT_PUBLIC_API_URL (default: http://127.0.0.1:8000)
 */

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

// ─────────────────────────────────────────────────────────────
// Type definitions
// ─────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: string;
  service: string;
}

export interface UploadResponse {
  dataset_id: string;
  filename: string;
  rows: number;
  columns: number;
  column_names: string[];
  preview: Record<string, unknown>[];
}

export interface DatasetPreview {
  rows: number;
  columns: string[];
  preview: Record<string, unknown>[];
}

export interface NumericStatistics {
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
}

export interface TopValue {
  value: string;
  count: number;
  percentage: number;
}

export interface ColumnDetail {
  name: string;
  dtype: string;
  missing_count: number;
  missing_percentage: number;
  unique_count: number;
  unique_percentage: number;
  statistics?: NumericStatistics;
  top_values?: TopValue[];
}

export interface DatasetProfile {
  rows: number;
  columns: number;
  memory_usage_bytes: number;
  duplicate_rows: number;
  columns_detail: ColumnDetail[];
}

// ─────────────────────────────────────────────────────────────
// Automatic scan (recommendations)
// ─────────────────────────────────────────────────────────────

export type TaskType =
  | "binary_classification"
  | "multiclass_classification"
  | "continuous"
  | "identifier"
  | "unsupported"
  | "unknown";

export interface CandidateGroup {
  column: string;
  score: number;
  distinct_groups: number;
  missing_rate: number;
  representation_imbalance_ratio: number | null;
  reasons: string[];
}

export interface CandidateOutcome {
  column: string;
  score: number;
  task_type: TaskType;
  distinct_values: number;
  missing_rate: number;
  reasons: string[];
}

export interface ScanRecommendation {
  group: string | null;
  outcome: string | null;
  task_type: TaskType | null;
  headline: string;
  detail: string;
  why_it_matters?: string;
  severity: "high" | "moderate" | "low" | "info";
  gap: number | null;
}

export interface QualityFlag {
  type: string;
  column?: string;
  severity: "high" | "moderate" | "low";
  message: string;
}

export interface ScanResponse {
  rows: number;
  columns: number;
  candidate_groups: CandidateGroup[];
  candidate_outcomes: CandidateOutcome[];
  recommendations: ScanRecommendation[];
  quality_flags: QualityFlag[];
  has_usable_groups: boolean;
}

export interface BiasDetectionRequest {
  dataset_id: string;
  outcome?: string | null;
  groups: string[];
}

export interface TargetImbalanceClass {
  class: string;
  count: number;
  percentage: number;
}

export interface TargetImbalance {
  target: string;
  classes: TargetImbalanceClass[];
  imbalance_ratio: number;
  severity: "low" | "moderate" | "high" | string;
}

export interface RepresentationGroup {
  group: string;
  count: number;
  percentage: number;
  is_missing: boolean;
}

export interface Representation {
  attribute: string;
  groups: RepresentationGroup[];
  number_of_groups: number;
  imbalance_ratio: number;
}

export interface OutcomeGroup {
  group: string;
  count: number;
  positive_count: number;
  positive_rate: number;
}

export interface Outcome {
  attribute: string;
  target: string;
  positive_class: string;
  groups: OutcomeGroup[];
  positive_rate_gap: number;
  disparate_impact_ratio: number;
}

export interface MissingnessDetail {
  group: string;
  column: string;
  missing_count: number;
  missing_rate: number;
}

export interface Missingness {
  attribute: string;
  details: MissingnessDetail[];
}

export interface GroupTargetImbalance {
  group: string;
  classes: TargetImbalanceClass[];
}

export interface AttributeTargetImbalance {
  attribute: string;
  target: string;
  groups: GroupTargetImbalance[];
}

export interface MulticlassOutcomeClass {
  class: string;
  count: number;
  percentage: number;
}

export interface MulticlassOutcomeGroup {
  group: string;
  count: number;
  classes: MulticlassOutcomeClass[];
}

export interface MulticlassOutcome {
  attribute: string;
  outcome: string;
  task_type: "multiclass_classification";
  classes: string[];
  groups: MulticlassOutcomeGroup[];
  max_distribution_gap: number;
}

export interface ContinuousOutcomeGroup {
  group: string;
  count: number;
  mean: number | null;
  median: number | null;
  std: number | null;
}

export interface ContinuousOutcome {
  attribute: string;
  outcome: string;
  task_type: "continuous";
  groups: ContinuousOutcomeGroup[];
  mean_gap: number;
  relative_mean_gap: number | null;
}

export interface RecommendationItem {
  severity: "high" | "moderate" | "low";
  category: "representation" | "missing_data" | "outcome_gap" | "data_quality";
  title: string;
  why: string;
  action: string;
}

export interface GroupAnalysisEntry {
  representation: Representation;
  missingness: Missingness;
  outcome?: Outcome;
  outcome_multiclass?: MulticlassOutcome;
  outcome_continuous?: ContinuousOutcome;
  target_imbalance?: AttributeTargetImbalance;
}

export interface BiasDetectionResponse {
  dataset_id: string;
  outcome: string | null;
  task_type: TaskType | null;
  groups: string[];
  outcome_summary: TargetImbalance | null;
  group_analysis: {
    [attribute: string]: GroupAnalysisEntry;
  };
  recommendations: RecommendationItem[];
}

export interface FairnessRequest {
  dataset_id: string;
  target: string;
  protected_attribute: string;
  prediction_column?: string;
}

export interface DemographicParityGroup {
  group: string;
  selection_rate: number;
  count: number;
}

export interface DemographicParity {
  metric: "demographic_parity";
  positive_class: string;
  groups: DemographicParityGroup[];
  statistical_parity_difference: number | null;
  selection_rate_gap: number | null;
  disparate_impact: number | null;
}

export interface RateGroup {
  group: string;
  true_positive_rate?: number | null;
  false_positive_rate?: number | null;
}

export interface EqualOpportunity {
  metric: "equal_opportunity";
  groups: RateGroup[];
  tpr_gap: number | null;
}

export interface EqualizedOdds {
  metric: "equalized_odds";
  groups: RateGroup[];
  tpr_gap: number | null;
  fpr_gap: number | null;
}

export interface FairnessResponse {
  demographic_parity: DemographicParity;
  equal_opportunity?: EqualOpportunity;
  equalized_odds?: EqualizedOdds;
}

export interface PerformanceRequest {
  dataset_id: string;
  y_true: string;
  y_pred: string;
}

export interface PerformanceResponse {
  [key: string]: unknown;
}

export interface MitigationRequest {
  dataset_id: string;
  target: string;
  protected_attribute: string;
  method: string;
}

export interface MitigationMetadata {
  method: string;
  original_rows: number;
  result_rows: number;
  row_change: number;
  [key: string]: unknown;
}

export interface ComparisonSide {
  rows: number;
  fairness: Record<string, unknown>;
}

export interface MitigationComparison {
  before: ComparisonSide;
  after: ComparisonSide;
  changes: {
    selection_rate_gap: number;
    disparate_impact: number;
    row_count: number;
    [key: string]: unknown;
  };
  interpretation: string;
}

export interface MitigationResponse {
  dataset_id: string;
  mitigated_dataset_id: string;
  metadata: MitigationMetadata;
  comparison: MitigationComparison;
  charts: {
    fairness: Record<string, unknown>;
  };
}

export interface BarChartDatum {
  group: string;
  count?: number;
  positive_rate?: number;
  [key: string]: unknown;
}

export interface BarChart {
  type: string;
  title: string;
  x_label: string;
  y_label: string;
  data: BarChartDatum[];
}

export interface ChartDataResponse {
  representation: BarChart;
  outcome_rates: BarChart;
}

// ─────────────────────────────────────────────────────────────
// Helper functions
// ─────────────────────────────────────────────────────────────

async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
  } catch {
    throw new Error(
      `Could not reach the BiasGuard API at ${API_URL}. Confirm the backend is running (uvicorn api:app --reload) and that NEXT_PUBLIC_API_URL points to it.`
    );
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      detail: response.statusText,
    }));
    throw new Error(error.detail || `API Error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function fetchFormData<T>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new Error(
      `Could not reach the BiasGuard API at ${API_URL}. Confirm the backend is running (uvicorn api:app --reload) and that NEXT_PUBLIC_API_URL points to it.`
    );
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      detail: response.statusText,
    }));
    throw new Error(error.detail || `API Error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// ─────────────────────────────────────────────────────────────
// API Client Functions
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/health
 * Check API health status
 */
export async function health(): Promise<HealthResponse> {
  return fetchAPI<HealthResponse>("/api/health");
}

/**
 * POST /api/upload
 * Upload a CSV file and get a dataset_id
 */
export async function uploadDataset(
  file: File
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  return fetchFormData<UploadResponse>("/api/upload", formData);
}

/**
 * GET /api/datasets/{dataset_id}/preview
 * Get preview of dataset rows
 */
export async function getDatasetPreview(
  datasetId: string,
  limit: number = 20
): Promise<DatasetPreview> {
  const params = new URLSearchParams({
    limit: String(limit),
  });
  return fetchAPI<DatasetPreview>(
    `/api/datasets/${datasetId}/preview?${params}`
  );
}

/**
 * GET /api/datasets/{dataset_id}/profile
 * Get statistical profile of dataset
 */
export async function getDatasetProfile(
  datasetId: string
): Promise<DatasetProfile> {
  return fetchAPI<DatasetProfile>(
    `/api/datasets/${datasetId}/profile`
  );
}

/**
 * GET /api/datasets/{dataset_id}/scan
 * Automatically scan a dataset and get plain-language recommendations
 */
export async function scanDataset(
  datasetId: string
): Promise<ScanResponse> {
  return fetchAPI<ScanResponse>(`/api/datasets/${datasetId}/scan`);
}

/**
 * POST /api/detect
 * Compare groups, optionally against a chosen outcome
 */
export async function detectBias(
  request: BiasDetectionRequest
): Promise<BiasDetectionResponse> {
  return fetchAPI<BiasDetectionResponse>("/api/detect", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

/**
 * POST /api/fairness
 * Calculate fairness metrics for a protected attribute
 */
export async function calculateFairness(
  request: FairnessRequest
): Promise<FairnessResponse> {
  return fetchAPI<FairnessResponse>("/api/fairness", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

/**
 * POST /api/performance
 * Calculate performance metrics (accuracy, precision, recall, etc.)
 */
export async function calculatePerformance(
  request: PerformanceRequest
): Promise<PerformanceResponse> {
  return fetchAPI<PerformanceResponse>("/api/performance", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

/**
 * POST /api/mitigate
 * Apply bias mitigation strategy to dataset
 */
export async function mitigateBias(
  request: MitigationRequest
): Promise<MitigationResponse> {
  return fetchAPI<MitigationResponse>("/api/mitigate", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

/**
 * GET /api/datasets/{dataset_id}/chart-data
 * Get chart data for visualization
 */
export async function getChartData(
  datasetId: string,
  protectedAttribute: string,
  target: string
): Promise<ChartDataResponse> {
  const params = new URLSearchParams({
    protected_attribute: protectedAttribute,
    target: target,
  });
  return fetchAPI<ChartDataResponse>(
    `/api/datasets/${datasetId}/chart-data?${params}`
  );
}
