"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import {
  mitigateBias,
  datasetDownloadUrl,
  type MitigationResponse,
} from "@/lib/api";

interface MitigationPanelProps {
  datasetId: string;
  /** The outcome column, if one was chosen. Mitigation works without one. */
  outcome?: string | null;
  taskType?: string | null;
  protectedAttribute: string;
  /** smallest-group / largest-group ratio for protectedAttribute, 0-1 */
  imbalanceRatio?: number | null;
  rowCount?: number;
  onError: (error: string) => void;
  onMitigationComplete?: (response: MitigationResponse) => void;
}

type MethodId = "oversampling" | "undersampling" | "reweighting" | "smote";

interface MethodInfo {
  id: MethodId;
  name: string;
  summary: string;
  mechanism: string;
  pro: string;
  con: string;
  bestWhen: string;
  changesRowCount: boolean;
}

const METHODS: MethodInfo[] = [
  {
    id: "reweighting",
    name: "Reweighting",
    summary: "Keep every row, just weight them differently",
    mechanism:
      "Doesn't touch the data at all. Instead it calculates a weight per row — rarer groups get a higher weight — and adds it as a new column so a model-training step can account for the imbalance.",
    pro: "No rows added, removed, or invented. The dataset's content is untouched.",
    con: "Only works if whatever trains the model actually uses the weight column. Download the data as-is and it looks unchanged — the correction only applies if your training code reads that column.",
    bestWhen:
      "you want to preserve the dataset exactly and apply the correction later, during training.",
    changesRowCount: false,
  },
  {
    id: "oversampling",
    name: "Oversampling",
    summary: "Duplicate rows from the smaller group",
    mechanism:
      "Randomly duplicates existing rows from the underrepresented group (with replacement) until every group has as many rows as the largest one.",
    pro: "Simple, and every added row is a real, unmodified example — nothing invented.",
    con: "Because rows are exact duplicates, a model can become overconfident about those specific examples (a mild overfitting risk) rather than learning a general pattern.",
    bestWhen:
      "you can't afford to lose any real data, and the imbalance isn't extreme.",
    changesRowCount: true,
  },
  {
    id: "undersampling",
    name: "Undersampling",
    summary: "Remove rows from the larger group",
    mechanism:
      "Randomly removes rows from overrepresented groups until every group matches the size of the smallest one.",
    pro: "Every remaining row is authentic — nothing duplicated or synthetic.",
    con: "Throws away real data, which can hurt if the dataset wasn't large to begin with.",
    bestWhen:
      "you have plenty of rows to spare and want a dataset where every row is original.",
    changesRowCount: true,
  },
  {
    id: "smote",
    name: "SMOTE",
    summary: "Generate new, synthetic examples for the smaller group",
    mechanism:
      "Synthetic Minority Oversampling Technique — instead of duplicating rows, it creates new synthetic examples by interpolating between real neighboring data points in the minority group.",
    pro: "More variety than plain duplication, so it avoids some of oversampling's overfitting risk.",
    con: "The new rows are invented, not real observations. If the minority group is very small or the data is mostly categorical, the synthetic rows can end up unrealistic.",
    bestWhen:
      "the minority group has a reasonable number of rows (not just a handful) and you want more variety than duplication gives you.",
    changesRowCount: true,
  },
];

function recommend(
  imbalanceRatio: number | null | undefined,
  rowCount: number | undefined,
  smoteAvailable: boolean
): { id: MethodId; reason: string } {
  const ratio = imbalanceRatio ?? null;
  const rows = rowCount ?? 0;

  if (ratio !== null && ratio >= 0.7) {
    return {
      id: "reweighting",
      reason:
        "Groups are already fairly balanced, so reweighting is a safe, non-destructive option if you want extra insurance.",
    };
  }

  if (rows > 0 && rows < 300) {
    return {
      id: "oversampling",
      reason:
        "This dataset is small, so removing real rows (undersampling) would lose too much. Oversampling keeps every original row.",
    };
  }

  if (smoteAvailable && ratio !== null && ratio < 0.3 && rows >= 300) {
    return {
      id: "smote",
      reason:
        "The imbalance is severe and there's enough data for SMOTE to generate realistic synthetic examples instead of plain duplicates.",
    };
  }

  return {
    id: "reweighting",
    reason:
      "A safe default: it corrects for the imbalance without adding, removing, or inventing any rows.",
  };
}

function fmtDelta(value: number | null | undefined, digits = 3) {
  if (value === null || value === undefined) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}`;
}

function pct(value: number | null | undefined) {
  return value === null || value === undefined
    ? "—"
    : `${(value * 100).toFixed(1)}%`;
}

export default function MitigationPanel({
  datasetId,
  outcome,
  taskType,
  protectedAttribute,
  imbalanceRatio,
  rowCount,
  onError,
  onMitigationComplete,
}: MitigationPanelProps) {
  const [selectedMethod, setSelectedMethod] = useState<MethodId | "">("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MitigationResponse | null>(null);

  const hasBinaryOutcome = Boolean(outcome) && taskType === "binary_classification";
  const recommended = recommend(imbalanceRatio, rowCount, hasBinaryOutcome);

  const handleMitigate = async () => {
    if (!selectedMethod) return;

    setLoading(true);

    try {
      const response = await mitigateBias({
        dataset_id: datasetId,
        target: outcome ?? null,
        protected_attribute: protectedAttribute,
        method: selectedMethod,
      });

      setResult(response);
      onMitigationComplete?.(response);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Mitigation failed");
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    const method = METHODS.find((m) => m.id === selectedMethod);
    const beforeFairness = result.comparison.before.fairness;
    const afterFairness = result.comparison.after.fairness;
    const beforeDp = beforeFairness?.demographic_parity;
    const afterDp = afterFairness?.demographic_parity;
    const beforeByGroup = new Map(
      beforeDp?.groups.map((g) => [g.group, g.selection_rate]) ?? []
    );

    const beforeOutcome = result.comparison.before.outcome_comparison;
    const afterOutcome = result.comparison.after.outcome_comparison;
    const outcomeGapBefore = result.comparison.changes.outcome_gap_before;
    const outcomeGapAfter = result.comparison.changes.outcome_gap_after;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[var(--teal-soft)] rounded-full flex items-center justify-center text-[var(--teal)] font-bold">
            ✓
          </div>
          <div>
            <p className="font-medium text-[var(--foreground)]">
              {method?.name} applied
            </p>
            <p className="text-xs text-[var(--muted)]">
              {result.comparison.before.rows.toLocaleString()} →{" "}
              {result.comparison.after.rows.toLocaleString()} rows
            </p>
          </div>
        </div>

        {/* Interpretation, front and center */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3">
          <p className="text-sm leading-6">{result.comparison.interpretation}</p>
        </div>

        {/* Case A: binary outcome - selection rate by group */}
        {beforeDp && afterDp && (
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-[var(--muted)]">
              Selection rate by group, before → after
            </p>
            <div className="space-y-2">
              {afterDp.groups.map((g) => {
                const before = beforeByGroup.get(g.group);
                return (
                  <div
                    key={g.group}
                    className="flex flex-col gap-1 rounded-lg bg-[var(--surface-secondary)] p-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                  >
                    <span className="min-w-0 truncate font-medium">{g.group}</span>
                    <span className="tabular-nums text-[var(--muted)]">
                      {pct(before)}{" "}
                      <span className="text-[var(--foreground)]">→</span>{" "}
                      <span className="font-semibold text-[var(--foreground)]">
                        {pct(g.selection_rate)}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Case B: multiclass/continuous outcome - gap metric only */}
        {!beforeDp && (outcomeGapBefore !== undefined || beforeOutcome || afterOutcome) && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-widest text-[var(--muted)] mb-2">
              Outcome gap across groups, before → after
            </p>
            <p className="text-sm font-mono">
              {fmtDelta(outcomeGapBefore, 3).replace("+", "")} →{" "}
              {fmtDelta(outcomeGapAfter, 3).replace("+", "")}
            </p>
          </div>
        )}

        {/* Case C: no outcome at all - representation only, covered by the headline tiles below */}

        {/* Headline deltas */}
        <div className="grid gap-3 sm:grid-cols-3">
          {beforeDp && afterDp ? (
            <>
              <div className="rounded-md bg-[var(--surface-secondary)] p-3">
                <p className="text-[11px] uppercase tracking-widest text-[var(--muted)] mb-1">
                  Selection Rate Gap
                </p>
                <p className="text-sm font-medium font-mono">
                  {pct(beforeDp.selection_rate_gap)} →{" "}
                  {pct(afterDp.selection_rate_gap)}
                </p>
              </div>
              <div className="rounded-md bg-[var(--surface-secondary)] p-3">
                <p className="text-[11px] uppercase tracking-widest text-[var(--muted)] mb-1">
                  Disparate Impact
                </p>
                <p className="text-sm font-medium font-mono">
                  {fmtDelta(beforeDp.disparate_impact, 3).replace("+", "")} →{" "}
                  {fmtDelta(afterDp.disparate_impact, 3).replace("+", "")}
                </p>
              </div>
            </>
          ) : (
            <div className="rounded-md bg-[var(--surface-secondary)] p-3 sm:col-span-2">
              <p className="text-[11px] uppercase tracking-widest text-[var(--muted)] mb-1">
                {outcome ? "Outcome Gap" : "Group Representation"}
              </p>
              <p className="text-sm font-medium font-mono">
                {outcome
                  ? `${fmtDelta(outcomeGapBefore, 3).replace("+", "")} → ${fmtDelta(outcomeGapAfter, 3).replace("+", "")}`
                  : "Rebalanced by group only — no outcome selected"}
              </p>
            </div>
          )}
          <div className="rounded-md bg-[var(--surface-secondary)] p-3">
            <p className="text-[11px] uppercase tracking-widest text-[var(--muted)] mb-1">
              Row Count Change
            </p>
            <p className="text-sm font-medium font-mono">
              {fmtDelta(result.comparison.changes.row_count, 0)}
            </p>
          </div>
        </div>

        {/* Download */}
        <a
          href={datasetDownloadUrl(
            result.mitigated_dataset_id,
            `${selectedMethod}_mitigated.csv`
          )}
          className="inline-block"
        >
          <Button variant="secondary" className="w-full">
            Download mitigated dataset (CSV)
          </Button>
        </a>

        {/* Metadata */}
        <details className="border border-[var(--border)] rounded-lg p-4">
          <summary className="cursor-pointer font-medium text-sm text-[var(--foreground)]">
            View raw metadata
          </summary>
          <div className="mt-3">
            <pre className="max-h-32 overflow-auto text-xs bg-[var(--surface-secondary)] p-3 rounded leading-relaxed">
              {JSON.stringify(result.metadata, null, 2)}
            </pre>
          </div>
        </details>

        <Button
          variant="ghost"
          onClick={() => {
            setResult(null);
            setSelectedMethod("");
          }}
          className="w-full"
        >
          Try another method
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-[var(--muted)]">
        Each method rebalances <strong>{protectedAttribute}</strong>{" "}
        differently — some add rows, some remove them, one doesn&apos;t touch
        the data at all.
        {outcome ? (
          <>
            {" "}
            Since you chose <strong>{outcome}</strong> as the outcome, the
            results below will also show how the gap in that outcome changes.
          </>
        ) : (
          " No outcome is selected, so results will compare group representation only — that's still useful on its own."
        )}{" "}
        Pick based on what you can afford to change.
      </p>

      <div className="grid gap-3">
        {METHODS.map((method) => {
          const selected = selectedMethod === method.id;
          const isRecommended = method.id === recommended.id;
          const disabled = method.id === "smote" && !hasBinaryOutcome;

          return (
            <label
              key={method.id}
              className={`
                flex flex-col gap-2 p-4 rounded-lg border transition
                ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                ${
                  selected
                    ? "border-[var(--teal)] bg-[var(--teal-soft)]"
                    : "border-[var(--border)] " +
                      (disabled ? "" : "hover:bg-[var(--surface-secondary)]")
                }
              `}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="method"
                  value={method.id}
                  checked={selected}
                  disabled={disabled}
                  onChange={() => setSelectedMethod(method.id)}
                  className="w-4 h-4 accent-[var(--teal)] mt-0.5 flex-shrink-0"
                />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      {method.name}
                    </p>
                    {isRecommended && !disabled && (
                      <Badge variant="teal">Recommended</Badge>
                    )}
                    <Badge variant="neutral">
                      {method.changesRowCount
                        ? "Changes row count"
                        : "Keeps row count"}
                    </Badge>
                  </div>
                  <p className="text-xs text-[var(--muted)] mt-1">
                    {method.summary}
                  </p>
                  {disabled && (
                    <p className="text-xs text-[var(--orange)] mt-1">
                      Needs a binary outcome (exactly two classes) — choose
                      one as the outcome to unlock SMOTE, or use one of the
                      other methods, which work without one.
                    </p>
                  )}
                </div>
              </div>

              <div className="ml-1 space-y-1.5 text-xs leading-5 text-[var(--muted)] sm:ml-7">
                <p>
                  <span className="font-medium text-[var(--foreground)]">
                    How it works:
                  </span>{" "}
                  {method.mechanism}
                </p>
                <p>
                  <span className="font-medium text-[var(--teal)]">
                    Upside:
                  </span>{" "}
                  {method.pro}
                </p>
                <p>
                  <span className="font-medium text-[var(--orange)]">
                    Trade-off:
                  </span>{" "}
                  {method.con}
                </p>
                <p>
                  <span className="font-medium text-[var(--foreground)]">
                    Best when:
                  </span>{" "}
                  {method.bestWhen}
                </p>
              </div>
            </label>
          );
        })}
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3 text-xs leading-5 text-[var(--muted)]">
        <span className="font-medium text-[var(--foreground)]">
          Why {METHODS.find((m) => m.id === recommended.id)?.name} is
          suggested:
        </span>{" "}
        {recommended.reason} This is a starting point, not a rule — any
        method above is valid to try.
      </div>

      <Button
        onClick={handleMitigate}
        disabled={!selectedMethod || loading}
        className="w-full"
      >
        {loading ? "Processing..." : "Apply Mitigation"}
      </Button>
    </div>
  );
}
