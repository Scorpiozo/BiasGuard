"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { mitigateBias, type MitigationResponse } from "@/lib/api";

interface MitigationPanelProps {
  datasetId: string;
  target: string;
  protectedAttribute: string;
  onError: (error: string) => void;
  onMitigationComplete?: (response: MitigationResponse) => void;
}

const MITIGATION_METHODS = [
  {
    id: "oversampling",
    name: "Oversampling",
    description: "Increase minority class samples",
  },
  {
    id: "undersampling",
    name: "Undersampling",
    description: "Reduce majority class samples",
  },
  {
    id: "reweighting",
    name: "Reweighting",
    description: "Adjust sample weights",
  },
  {
    id: "smote",
    name: "SMOTE",
    description: "Synthetic minority oversampling",
  },
];

export default function MitigationPanel({
  datasetId,
  target,
  protectedAttribute,
  onError,
  onMitigationComplete,
}: MitigationPanelProps) {
  const [selectedMethod, setSelectedMethod] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MitigationResponse | null>(
    null
  );

  const handleMitigate = async () => {
    if (!selectedMethod) return;

    setLoading(true);

    try {
      const response = await mitigateBias({
        dataset_id: datasetId,
        target: target,
        protected_attribute: protectedAttribute,
        method: selectedMethod,
      });

      setResult(response);
      onMitigationComplete?.(response);
    } catch (error) {
      onError(
        error instanceof Error ? error.message : "Mitigation failed"
      );
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    const method = MITIGATION_METHODS.find(m => m.id === selectedMethod);

    return (
      <div className="space-y-6">
        {/* Success Header */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[var(--teal-soft)] rounded-full flex items-center justify-center text-[var(--teal)] font-bold">
            ✓
          </div>
          <div>
            <p className="font-medium text-[var(--foreground)]">
              Mitigation Applied
            </p>
            <p className="text-xs text-[var(--muted)]">
              {method?.name} applied to {protectedAttribute}
            </p>
          </div>
        </div>

        {/* Results Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="p-4 bg-[var(--surface-secondary)] rounded-lg">
            <p className="text-xs text-[var(--muted)] uppercase tracking-widest font-medium mb-2">
              New Dataset ID
            </p>
            <p className="font-mono text-xs font-medium break-all">
              {result.mitigated_dataset_id}
            </p>
          </div>
          <div className="p-4 bg-[var(--surface-secondary)] rounded-lg">
            <p className="text-xs text-[var(--muted)] uppercase tracking-widest font-medium mb-2">
              Method
            </p>
            <p className="font-medium">{method?.name}</p>
          </div>
        </div>

        {/* Comparison */}
        {result.comparison && (
          <div className="border border-[var(--border)] rounded-lg p-4">
            <p className="text-xs text-[var(--muted)] uppercase tracking-widest font-medium mb-3">
              Before / After Comparison
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md bg-[var(--surface-secondary)] p-3">
                <p className="text-[11px] uppercase tracking-widest text-[var(--muted)] mb-1">
                  Rows
                </p>
                <p className="text-sm font-medium">
                  {result.comparison.before.rows.toLocaleString()} →{" "}
                  {result.comparison.after.rows.toLocaleString()}
                </p>
              </div>
              <div className="rounded-md bg-[var(--surface-secondary)] p-3">
                <p className="text-[11px] uppercase tracking-widest text-[var(--muted)] mb-1">
                  Selection Rate Gap Δ
                </p>
                <p className="text-sm font-medium font-mono text-[var(--orange)]">
                  {result.comparison.changes.selection_rate_gap >= 0 ? "+" : ""}
                  {result.comparison.changes.selection_rate_gap.toFixed(3)}
                </p>
              </div>
              <div className="rounded-md bg-[var(--surface-secondary)] p-3">
                <p className="text-[11px] uppercase tracking-widest text-[var(--muted)] mb-1">
                  Disparate Impact Δ
                </p>
                <p className="text-sm font-medium font-mono text-[var(--orange)]">
                  {result.comparison.changes.disparate_impact >= 0 ? "+" : ""}
                  {result.comparison.changes.disparate_impact.toFixed(3)}
                </p>
              </div>
              <div className="rounded-md bg-[var(--surface-secondary)] p-3">
                <p className="text-[11px] uppercase tracking-widest text-[var(--muted)] mb-1">
                  Row Count Δ
                </p>
                <p className="text-sm font-medium font-mono text-[var(--orange)]">
                  {result.comparison.changes.row_count >= 0 ? "+" : ""}
                  {result.comparison.changes.row_count}
                </p>
              </div>
            </div>

            {result.comparison.interpretation && (
              <p className="mt-3 text-sm text-[var(--muted)] leading-relaxed">
                {result.comparison.interpretation}
              </p>
            )}
          </div>
        )}

        {/* Metadata */}
        {result.metadata && (
          <details className="border border-[var(--border)] rounded-lg p-4">
            <summary className="cursor-pointer font-medium text-sm text-[var(--foreground)]">
              View Metadata
            </summary>
            <div className="mt-3">
              <pre className="max-h-32 overflow-auto text-xs bg-[var(--surface-secondary)] p-3 rounded leading-relaxed">
                {JSON.stringify(result.metadata, null, 2)}
              </pre>
            </div>
          </details>
        )}

        {/* Action */}
        <Button
          variant="ghost"
          onClick={() => {
            setResult(null);
            setSelectedMethod("");
          }}
          className="w-full"
        >
          Try Another Method
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {MITIGATION_METHODS.map((method) => (
          <label
            key={method.id}
            className="flex items-start p-4 border border-[var(--border)] rounded-lg hover:bg-[var(--surface-secondary)] cursor-pointer transition"
          >
            <input
              type="radio"
              name="method"
              value={method.id}
              checked={selectedMethod === method.id}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="w-4 h-4 accent-[var(--teal)] mt-0.5 flex-shrink-0"
            />
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-[var(--foreground)]">
                {method.name}
              </p>
              <p className="text-xs text-[var(--muted)] mt-1">
                {method.description}
              </p>
            </div>
          </label>
        ))}
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
