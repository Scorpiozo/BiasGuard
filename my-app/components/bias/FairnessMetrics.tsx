"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { calculateFairness, type FairnessResponse } from "@/lib/api";

interface FairnessMetricsProps {
  datasetId: string;
  target: string;
  protectedAttribute: string;
  predictionColumn?: string;
  onError: (error: string) => void;
}

function gapBadge(gap: number | null | undefined) {
  if (gap === null || gap === undefined) return { variant: "neutral" as const, label: "N/A" };
  if (gap >= 0.3) return { variant: "red" as const, label: "High gap" };
  if (gap >= 0.15) return { variant: "orange" as const, label: "Moderate gap" };
  return { variant: "teal" as const, label: "Low gap" };
}

function fmt(value: number | null | undefined, digits = 3) {
  return value === null || value === undefined ? "—" : value.toFixed(digits);
}

export default function FairnessMetrics({
  datasetId,
  target,
  protectedAttribute,
  predictionColumn,
  onError,
}: FairnessMetricsProps) {
  const [metrics, setMetrics] = useState<FairnessResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCalculate = async () => {
    setLoading(true);

    try {
      const response = await calculateFairness({
        dataset_id: datasetId,
        target: target,
        protected_attribute: protectedAttribute,
        prediction_column: predictionColumn,
      });
      setMetrics(response);
    } catch (error) {
      onError(
        error instanceof Error ? error.message : "Failed to calculate"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!metrics) {
    return (
      <Card className="p-6 md:p-10">
        <div className="mb-6">
          <div className="eyebrow mb-2">Fairness analysis</div>
          <h3 className="text-2xl font-medium tracking-tight">
            Calculate fairness metrics
          </h3>
          <p className="mt-2 text-sm text-[var(--muted)]">
            For {protectedAttribute} across {target}
          </p>
        </div>

        <Button onClick={handleCalculate} disabled={loading}>
          {loading ? "Calculating..." : "Calculate Fairness"}
        </Button>
      </Card>
    );
  }

  const dp = metrics.demographic_parity;
  const dpBadge = gapBadge(dp.selection_rate_gap);

  return (
    <Card className="p-6 md:p-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="eyebrow mb-2">Fairness metrics</div>
          <h3 className="text-2xl font-medium tracking-tight">
            Results for {protectedAttribute}
          </h3>
        </div>
        <Badge variant={dpBadge.variant}>{dpBadge.label}</Badge>
      </div>

      {/* Demographic parity */}
      <div className="rounded-lg border border-[var(--border)] p-5 mb-6">
        <p className="text-xs font-medium uppercase tracking-widest text-[var(--muted)] mb-4">
          Demographic Parity
        </p>

        <div className="space-y-2 mb-4">
          {dp.groups.map((g) => (
            <div
              key={g.group}
              className="flex justify-between items-center p-2.5 bg-[var(--surface-secondary)] rounded-lg text-sm"
            >
              <span>{g.group}</span>
              <span className="font-medium tabular-nums">
                {(g.selection_rate * 100).toFixed(1)}% selected · n={g.count}
              </span>
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-3 text-sm">
          <div className="rounded-md bg-[var(--surface-secondary)] p-3">
            <p className="text-[11px] uppercase tracking-widest text-[var(--muted)] mb-1">
              Statistical Parity Diff.
            </p>
            <p className="font-medium font-mono">
              {fmt(dp.statistical_parity_difference)}
            </p>
          </div>
          <div className="rounded-md bg-[var(--surface-secondary)] p-3">
            <p className="text-[11px] uppercase tracking-widest text-[var(--muted)] mb-1">
              Selection Rate Gap
            </p>
            <p className="font-medium font-mono">
              {fmt(dp.selection_rate_gap)}
            </p>
          </div>
          <div className="rounded-md bg-[var(--surface-secondary)] p-3">
            <p className="text-[11px] uppercase tracking-widest text-[var(--muted)] mb-1">
              Disparate Impact
            </p>
            <p className="font-medium font-mono">{fmt(dp.disparate_impact)}</p>
          </div>
        </div>
      </div>

      {/* Equal opportunity */}
      {metrics.equal_opportunity && (
        <div className="rounded-lg border border-[var(--border)] p-5 mb-6">
          <p className="text-xs font-medium uppercase tracking-widest text-[var(--muted)] mb-4">
            Equal Opportunity
          </p>
          <div className="space-y-2 mb-3">
            {metrics.equal_opportunity.groups.map((g) => (
              <div
                key={g.group}
                className="flex justify-between items-center p-2.5 bg-[var(--surface-secondary)] rounded-lg text-sm"
              >
                <span>{g.group}</span>
                <span className="font-medium tabular-nums">
                  TPR: {fmt(g.true_positive_rate, 3)}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-[var(--muted)]">
            TPR gap:{" "}
            <span className="font-medium text-[var(--foreground)] font-mono">
              {fmt(metrics.equal_opportunity.tpr_gap)}
            </span>
          </p>
        </div>
      )}

      {/* Equalized odds */}
      {metrics.equalized_odds && (
        <div className="rounded-lg border border-[var(--border)] p-5 mb-6">
          <p className="text-xs font-medium uppercase tracking-widest text-[var(--muted)] mb-4">
            Equalized Odds
          </p>
          <div className="space-y-2 mb-3">
            {metrics.equalized_odds.groups.map((g) => (
              <div
                key={g.group}
                className="flex justify-between items-center p-2.5 bg-[var(--surface-secondary)] rounded-lg text-sm"
              >
                <span>{g.group}</span>
                <span className="font-medium tabular-nums">
                  TPR: {fmt(g.true_positive_rate, 3)} · FPR:{" "}
                  {fmt(g.false_positive_rate, 3)}
                </span>
              </div>
            ))}
          </div>
          <div className="flex gap-6 text-xs text-[var(--muted)]">
            <p>
              TPR gap:{" "}
              <span className="font-medium text-[var(--foreground)] font-mono">
                {fmt(metrics.equalized_odds.tpr_gap)}
              </span>
            </p>
            <p>
              FPR gap:{" "}
              <span className="font-medium text-[var(--foreground)] font-mono">
                {fmt(metrics.equalized_odds.fpr_gap)}
              </span>
            </p>
          </div>
        </div>
      )}

      <Button variant="secondary" onClick={() => setMetrics(null)}>
        Recalculate
      </Button>
    </Card>
  );
}
