"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import DatasetUploader from "./DatasetUploader";
import DatasetScan from "./DatasetScan";
import BiasDetectionPanel from "./BiasDetectionPanel";
import FairnessMetrics from "./FairnessMetrics";
import MitigationPanel from "./MitigationPanel";
import ChartPanel from "./ChartPanel";
import {
  detectBias,
  type UploadResponse,
  type BiasDetectionResponse,
} from "@/lib/api";

type DashboardPhase = "upload" | "scan" | "results";

interface DashboardState {
  datasetId: string;
  fileName: string;
  rows: number;
  columns: number;
  columnNames: string[];
  outcome: string | null;
  groups: string[];
  analysisResult: BiasDetectionResponse | null;
}

const EMPTY_STATE: DashboardState = {
  datasetId: "",
  fileName: "",
  rows: 0,
  columns: 0,
  columnNames: [],
  outcome: null,
  groups: [],
  analysisResult: null,
};

export default function BiasAnalyzerDashboard() {
  const [phase, setPhase] = useState<DashboardPhase>("upload");
  const [state, setState] = useState<DashboardState>(EMPTY_STATE);
  const [error, setError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(""), 6000);
  };

  const handleUploadComplete = (response: UploadResponse) => {
    setState((prev) => ({
      ...prev,
      datasetId: response.dataset_id,
      fileName: response.filename,
      rows: response.rows,
      columns: response.columns,
      columnNames: response.column_names,
    }));

    setPhase("scan");
    setError("");
  };

  const handleAnalyzeClick = async (
    outcome: string | null,
    groups: string[]
  ) => {
    setIsAnalyzing(true);

    try {
      const result = await detectBias({
        dataset_id: state.datasetId,
        outcome,
        groups,
      });

      setState((prev) => ({
        ...prev,
        outcome,
        groups,
        analysisResult: result,
      }));

      setPhase("results");
      setError("");
    } catch (err) {
      handleError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleChangeDataset = () => {
    setState(EMPTY_STATE);
    setPhase("upload");
    setError("");
  };

  const handleBackToScan = () => {
    setPhase("scan");
    setError("");
  };

  const isBinaryOutcome = state.analysisResult?.task_type === "binary_classification";
  const primaryGroup = state.groups[0] || "";

  const workflow = [
    {
      id: "upload",
      label: "Dataset",
      active: phase === "upload",
      complete: phase !== "upload",
    },
    {
      id: "scan",
      label: "Scan & Choose",
      active: phase === "scan",
      complete: phase === "results",
    },
    {
      id: "results",
      label: "Results",
      active: phase === "results",
      complete: phase === "results",
    },
  ];

  return (
    <div className="space-y-5">
      {/* -----------------------------------------
          ERROR
      ----------------------------------------- */}

      {error && (
        <div className="mx-4 mt-4 flex items-center gap-3 rounded-md border border-[var(--red)]/40 bg-[var(--red-soft)] px-4 py-3">
          <span
            className="status-dot"
            style={{ backgroundColor: "var(--red)" }}
          />

          <p className="font-mono-tech text-[13px] font-medium text-[var(--red)]">
            {error}
          </p>
        </div>
      )}

      {/* -----------------------------------------
          WORKFLOW
      ----------------------------------------- */}

      <div className="border-y border-[var(--border)] bg-[var(--surface-secondary)]">
        <div className="flex items-center overflow-x-auto px-4 py-3">
          {workflow.map((item, index) => (
            <div key={item.id} className="flex min-w-max items-center">
              <div
                className={`
                  flex items-center gap-2.5
                  rounded-[4px]
                  px-3 py-1.5
                  font-mono-tech text-[11px]
                  tracking-wide
                  ${
                    item.active
                      ? "bg-[var(--surface)] font-semibold text-[var(--foreground)]"
                      : item.complete
                        ? "text-[var(--teal)]"
                        : "text-[var(--muted)]"
                  }
                `}
              >
                <span
                  className={`
                    flex h-5 w-5 items-center justify-center
                    rounded-[3px]
                    border
                    text-[9px]
                    ${
                      item.active
                        ? "border-[var(--orange)] bg-[var(--orange)] text-white"
                        : item.complete
                          ? "border-[var(--teal)] bg-[var(--teal)] text-white"
                          : "border-[var(--border-strong)]"
                    }
                  `}
                >
                  {item.complete ? "✓" : index + 1}
                </span>

                {item.label.toUpperCase()}
              </div>

              {index < workflow.length - 1 && (
                <span className="px-1.5 font-mono-tech text-[var(--border-strong)]">
                  /
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* -----------------------------------------
          UPLOAD
      ----------------------------------------- */}

      {phase === "upload" && (
        <div className="grid gap-5 p-4 lg:grid-cols-[1fr_320px]">
          <Card title="dataset.csv — new upload" accent="var(--orange)">
            <div className="p-6 lg:p-8">
              <div className="mb-7 max-w-xl">
                <p className="font-mono-tech text-[10px] uppercase tracking-[0.14em] text-[var(--orange)]">
                  DATASET INPUT
                </p>

                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  Start with your dataset.
                </h2>

                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Upload a CSV — BiasGuard will scan it automatically and
                  suggest what to check for bias. No need to know which
                  column is your &ldquo;target&rdquo; ahead of time.
                </p>
              </div>

              <DatasetUploader
                onUploadComplete={handleUploadComplete}
                onError={handleError}
              />
            </div>
          </Card>

          <Card title="checks.log" accent="var(--teal)">
            <div className="p-6">
              <p className="font-mono-tech text-[10px] uppercase tracking-[0.14em] text-[var(--muted-light)]">
                BIASGUARD // PIPELINE
              </p>

              <div className="mt-6 space-y-5">
                {[
                  ["01", "Auto-scan", "Missingness & imbalance"],
                  ["02", "Recommendations", "Plain-language suggestions"],
                  ["03", "Outcomes", "Binary, multiclass, or continuous"],
                  ["04", "Fairness", "Optional, for binary outcomes"],
                ].map(([number, title, description]) => (
                  <div key={number} className="flex gap-3">
                    <span className="font-mono-tech text-[11px] text-[var(--orange)]">
                      {number}
                    </span>

                    <div>
                      <p className="text-sm font-medium">{title}</p>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">
                        {description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* -----------------------------------------
          SCAN & CHOOSE
      ----------------------------------------- */}

      {phase === "scan" && state.datasetId && (
        <div className="space-y-5 p-4">
          {/* Dataset toolbar */}
          <div className="flex flex-col gap-4 rounded-md border border-[var(--border)] bg-[var(--surface-secondary)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[4px] border border-[var(--orange)]/20 bg-[var(--orange-soft)] font-mono-tech text-[10px] font-bold text-[var(--orange)]">
                CSV
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {state.fileName}
                </p>

                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {state.rows.toLocaleString()} rows · {state.columns}{" "}
                  columns ·{" "}
                  <span className="font-mono-tech">
                    {state.datasetId.slice(0, 8)}
                  </span>
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              onClick={handleChangeDataset}
              className="shrink-0 text-xs"
            >
              Change dataset
            </Button>
          </div>

          {/* Scan + recommendations */}
          <Card title="scan.results" accent="var(--orange)">
            <div className="border-b border-[var(--border)] px-6 py-6">
              <p className="font-mono-tech text-[10px] uppercase tracking-[0.14em] text-[var(--orange)]">
                AUTOMATIC SCAN
              </p>

              <h3 className="mt-2 text-2xl font-semibold tracking-tight">
                Here&apos;s what BiasGuard noticed
              </h3>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                Pick a suggestion below, or choose your own columns. You
                don&apos;t need an outcome column to get useful results.
              </p>
            </div>

            <div className="p-6 lg:p-7">
              <DatasetScan
                datasetId={state.datasetId}
                columns={state.columnNames}
                onAnalyze={handleAnalyzeClick}
                loading={isAnalyzing}
              />
            </div>
          </Card>
        </div>
      )}

      {/* -----------------------------------------
          RESULTS
      ----------------------------------------- */}

      {phase === "results" && state.analysisResult && (
        <div className="animate-fade-in-up space-y-5 p-4">
          {/* Dataset header */}
          <div className="flex flex-col gap-4 rounded-md border border-[var(--border)] bg-[var(--surface-secondary)] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] bg-[var(--teal-soft)]">
                <span
                  className="status-dot"
                  style={{ backgroundColor: "var(--teal)" }}
                />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {state.fileName}
                </p>

                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {state.rows.toLocaleString()} rows · {state.columns} columns
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="orange">
                {state.outcome ? `Outcome: ${state.outcome}` : "No outcome"}
              </Badge>

              {state.groups.map((attr) => (
                <Badge key={attr} variant="teal">
                  {attr}
                </Badge>
              ))}

              <Button
                variant="ghost"
                onClick={handleBackToScan}
                className="ml-1 text-xs"
              >
                Adjust selection
              </Button>

              <Button
                variant="ghost"
                onClick={handleChangeDataset}
                className="text-xs"
              >
                New dataset
              </Button>
            </div>
          </div>

          {/* Results overview */}
          <Card
            title="results.overview"
            accent="var(--teal)"
            titleAccessory={<Badge variant="teal">Complete</Badge>}
          >
            <div className="border-b border-[var(--border)] px-5 py-5">
              <p className="font-mono-tech text-[10px] uppercase tracking-[0.14em] text-[var(--teal)]">
                BIAS DETECTION
              </p>

              <h3 className="mt-1.5 text-2xl font-semibold tracking-tight">
                Bias overview
              </h3>

              <p className="mt-1 text-sm text-[var(--muted)]">
                Signals identified across the selected groups.
              </p>
            </div>

            <div className="p-5 lg:p-6">
              <BiasDetectionPanel analysis={state.analysisResult} />
            </div>
          </Card>

          {/* Charts + fairness — only meaningful with a chosen outcome */}
          {state.outcome && (
            <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
              {isBinaryOutcome && (
                <Card title="charts.distribution" accent="var(--orange)">
                  <div className="border-b border-[var(--border)] px-5 py-5">
                    <p className="font-mono-tech text-[10px] uppercase tracking-[0.14em] text-[var(--orange)]">
                      DISTRIBUTION
                    </p>

                    <h3 className="mt-1.5 text-lg font-semibold">
                      Group representation &amp; outcomes
                    </h3>
                  </div>

                  <div className="p-5">
                    <ChartPanel
                      datasetId={state.datasetId}
                      target={state.outcome}
                      protectedAttribute={primaryGroup}
                      onError={handleError}
                    />
                  </div>
                </Card>
              )}

              <Card title="fairness.metrics" accent="var(--teal)">
                <div className="border-b border-[var(--border)] px-5 py-5">
                  <p className="font-mono-tech text-[10px] uppercase tracking-[0.14em] text-[var(--teal)]">
                    EVALUATION
                  </p>

                  <h3 className="mt-1.5 text-lg font-semibold">
                    Fairness metrics
                  </h3>
                </div>

                <div className="p-5">
                  {isBinaryOutcome ? (
                    <FairnessMetrics
                      datasetId={state.datasetId}
                      target={state.outcome}
                      protectedAttribute={primaryGroup}
                      onError={handleError}
                    />
                  ) : (
                    <p className="text-sm text-[var(--muted)]">
                      Formal fairness scoring (demographic parity, equal
                      opportunity) is only defined for a yes/no-style
                      outcome. &ldquo;{state.outcome}&rdquo; has{" "}
                      {state.analysisResult.task_type === "continuous"
                        ? "continuous"
                        : "multiple"}{" "}
                      values, so the distribution comparison above is the
                      right tool here.
                    </p>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Mitigation — binary-only advanced tool */}
          {state.outcome && isBinaryOutcome && (
            <Card
              title="mitigate.run"
              accent="var(--red)"
              titleAccessory={<Badge variant="orange">Before / after</Badge>}
            >
              <div className="border-b border-[var(--border)] px-5 py-5">
                <p className="font-mono-tech text-[10px] uppercase tracking-[0.14em] text-[var(--red)]">
                  MITIGATION
                </p>

                <h3 className="mt-1.5 text-lg font-semibold">
                  Reduce detected bias
                </h3>

                <p className="mt-1 text-sm text-[var(--muted)]">
                  Apply a supported strategy and compare the resulting
                  fairness metrics.
                </p>
              </div>

              <div className="p-5">
                <MitigationPanel
                  datasetId={state.datasetId}
                  target={state.outcome}
                  protectedAttribute={primaryGroup}
                  onError={handleError}
                />
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
