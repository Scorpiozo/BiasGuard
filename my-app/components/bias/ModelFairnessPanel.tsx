"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import {
  evaluateModel,
  type ModelEvaluationResponse,
} from "@/lib/api";

interface ModelFairnessPanelProps {
  datasetId: string;
  outcome: string;
  protectedAttribute: string;
  onError: (error: string) => void;
}

function gapBadge(gap: number | null | undefined) {
  if (gap === null || gap === undefined)
    return { variant: "neutral" as const, label: "N/A" };
  if (gap >= 0.3) return { variant: "red" as const, label: "High gap" };
  if (gap >= 0.15) return { variant: "orange" as const, label: "Moderate gap" };
  return { variant: "teal" as const, label: "Low gap" };
}

function fmt(value: number | null | undefined, digits = 3) {
  return value === null || value === undefined ? "—" : value.toFixed(digits);
}

function pct(value: number | null | undefined) {
  return value === null || value === undefined
    ? "—"
    : `${(value * 100).toFixed(1)}%`;
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[var(--surface-secondary)] p-3">
      <p className="text-[11px] uppercase tracking-widest text-[var(--muted)] mb-1">
        {label}
      </p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export default function ModelFairnessPanel({
  datasetId,
  outcome,
  protectedAttribute,
  onError,
}: ModelFairnessPanelProps) {
  const [result, setResult] = useState<ModelEvaluationResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTrain = async () => {
    setLoading(true);

    try {
      const response = await evaluateModel({
        dataset_id: datasetId,
        outcome,
        protected_attribute: protectedAttribute,
      });
      setResult(response);
    } catch (error) {
      onError(
        error instanceof Error ? error.message : "Model training failed"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!result) {
    return (
      <Card className="p-6 md:p-10">
        <div className="mb-5">
          <div className="eyebrow mb-2">AI / Machine Learning</div>
          <h3 className="text-2xl font-medium tracking-tight">
            Does a trained model inherit this bias?
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Everything above looks at the <em>raw data</em>. This step goes
            one further: it trains a small, interpretable model (a logistic
            regression) to actually predict{" "}
            <span className="font-medium text-[var(--foreground)]">
              {outcome}
            </span>
            , then checks whether the model&apos;s own predictions treat{" "}
            <span className="font-medium text-[var(--foreground)]">
              {protectedAttribute}
            </span>{" "}
            groups fairly — the same way a real ML system trained on this
            data would behave.
          </p>
          <p className="mt-2 max-w-2xl text-xs text-[var(--muted)]">
            The dataset is split 75/25 — the model only ever sees the 75%
            training portion, and is scored on the other 25% it hasn&apos;t
            seen, the standard way to check a model isn&apos;t just
            memorizing.
          </p>
        </div>

        <Button onClick={handleTrain} disabled={loading}>
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Training model...
            </>
          ) : (
            "Train & evaluate model"
          )}
        </Button>
      </Card>
    );
  }

  const dp = result.fairness.demographic_parity;
  const dpBadge = gapBadge(dp.selection_rate_gap);
  const eo = result.fairness.equal_opportunity;
  const eoBadge = eo ? gapBadge(eo.tpr_gap) : null;

  return (
    <Card className="p-6 md:p-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="eyebrow mb-2">AI / Machine Learning</div>
          <h3 className="text-2xl font-medium tracking-tight">
            Logistic regression — trained &amp; tested
          </h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Predicting <strong>{outcome}</strong> · evaluated on{" "}
            {result.test_rows.toLocaleString()} rows it never trained on
          </p>
        </div>
      </div>

      {/* How well it predicts */}
      <div className="mb-6">
        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-[var(--muted)]">
          How well it predicts
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatTile label="Accuracy" value={pct(result.performance.accuracy)} />
          <StatTile label="Precision" value={pct(result.performance.precision)} />
          <StatTile label="Recall" value={pct(result.performance.recall)} />
          <StatTile label="F1" value={pct(result.performance.f1)} />
          <StatTile
            label="ROC-AUC"
            value={
              result.performance.roc_auc !== null
                ? result.performance.roc_auc.toFixed(3)
                : "—"
            }
          />
        </div>
        <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
          Trained on {result.feature_columns.join(", ")}.
          {result.skipped_columns.length > 0 && (
            <>
              {" "}
              Skipped {result.skipped_columns.join(", ")} — these look like
              free text or identifiers rather than usable features.
            </>
          )}
        </p>
      </div>

      {/* Is it fair */}
      <div className="border-t border-[var(--border)] pt-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-widest text-[var(--muted)]">
            Is the model&apos;s decision fair across {protectedAttribute}?
          </p>
          <Badge variant={dpBadge.variant}>{dpBadge.label}</Badge>
        </div>

        <div className="space-y-2 mb-4">
          {dp.groups.map((g) => (
            <div
              key={g.group}
              className="flex justify-between items-center p-2.5 bg-[var(--surface-secondary)] rounded-lg text-sm"
            >
              <span>{g.group}</span>
              <span className="font-medium tabular-nums">
                predicted positive {pct(g.selection_rate)} of the time ·
                n={g.count}
              </span>
            </div>
          ))}
        </div>

        <p className="text-sm leading-6 text-[var(--muted)]">
          The model predicts a positive outcome for{" "}
          <span className="font-medium text-[var(--foreground)]">
            {pct(dp.selection_rate_gap)}
          </span>{" "}
          more people in one group than the other — in other words, the
          model&apos;s own decisions carry roughly the same disparity found
          in the raw data. Training on biased data, with no correction,
          reproduces that bias in the model.
        </p>

        {eo && eoBadge && (
          <div className="mt-4 rounded-lg border border-[var(--border)] p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-widest text-[var(--muted)]">
                Equal opportunity (among people who actually qualify)
              </p>
              <Badge variant={eoBadge.variant}>{eoBadge.label}</Badge>
            </div>
            <div className="space-y-2">
              {eo.groups.map((g) => (
                <div
                  key={g.group}
                  className="flex justify-between items-center p-2 bg-[var(--surface-secondary)] rounded-md text-sm"
                >
                  <span>{g.group}</span>
                  <span className="font-medium tabular-nums">
                    correctly identified {pct(g.true_positive_rate)} of the
                    time
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">
              Gap: <span className="font-mono">{fmt(eo.tpr_gap)}</span> — among
              people who truly deserve a positive outcome, this is how much
              more often one group actually gets it from the model.
            </p>
          </div>
        )}
      </div>

      <Button
        variant="secondary"
        onClick={() => setResult(null)}
        className="mt-6"
      >
        Train again
      </Button>
    </Card>
  );
}
