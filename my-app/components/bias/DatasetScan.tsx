"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import {
  scanDataset,
  type ScanResponse,
  type ScanRecommendation,
} from "@/lib/api";

interface DatasetScanProps {
  datasetId: string;
  columns: string[];
  onAnalyze: (outcome: string | null, groups: string[]) => void;
  loading?: boolean;
}

function severityBadge(
  severity: "high" | "moderate" | "low" | "info"
): "red" | "orange" | "teal" | "neutral" {
  if (severity === "high") return "red";
  if (severity === "moderate") return "orange";
  if (severity === "low") return "teal";
  return "neutral";
}

function severityLabel(
  severity: "high" | "moderate" | "low" | "info"
): string {
  if (severity === "high") return "Worth investigating";
  if (severity === "moderate") return "Noticeable difference";
  if (severity === "low") return "Small difference";
  return "Suggestion";
}

export default function DatasetScan({
  datasetId,
  columns,
  onAnalyze,
  loading = false,
}: DatasetScanProps) {
  const [scan, setScan] = useState<ScanResponse | null>(null);
  const [scanError, setScanError] = useState("");
  const [scanning, setScanning] = useState(true);

  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(
    new Set()
  );
  const [noOutcome, setNoOutcome] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [appliedRecommendation, setAppliedRecommendation] = useState<
    number | null
  >(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setScanning(true);
      setScanError("");

      try {
        const result = await scanDataset(datasetId);
        if (cancelled) return;

        setScan(result);

        // Pre-select the top recommendation, if any, so the
        // happy path is a single click.
        const top = result.recommendations[0];
        if (top) {
          setSelectedOutcome(top.outcome ?? null);
          setSelectedGroups(new Set(top.group ? [top.group] : []));
          setNoOutcome(!top.outcome);
          setAppliedRecommendation(0);
        } else if (result.candidate_groups[0]) {
          setSelectedGroups(new Set([result.candidate_groups[0].column]));
          setNoOutcome(true);
        }
      } catch (error) {
        if (!cancelled) {
          setScanError(
            error instanceof Error
              ? error.message
              : "Could not scan this dataset."
          );
        }
      } finally {
        if (!cancelled) setScanning(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [datasetId]);

  const applyRecommendation = (rec: ScanRecommendation, index: number) => {
    setSelectedOutcome(rec.outcome ?? null);
    setSelectedGroups(new Set(rec.group ? [rec.group] : []));
    setNoOutcome(!rec.outcome);
    setAppliedRecommendation(index);
    setManualMode(false);
  };

  const toggleGroup = (column: string) => {
    setAppliedRecommendation(null);
    setSelectedGroups((current) => {
      const next = new Set(current);
      if (next.has(column)) next.delete(column);
      else next.add(column);
      return next;
    });
  };

  const chooseOutcome = (column: string | null) => {
    setAppliedRecommendation(null);
    setSelectedOutcome(column);
    setNoOutcome(column === null);
  };

  const canAnalyze = selectedGroups.size > 0 && !loading;

  if (scanning) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent text-[var(--orange)]" />
        <p className="font-mono-tech text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
          Scanning dataset for bias signals…
        </p>
        <p className="max-w-sm text-xs text-[var(--muted)]">
          Checking for missing data, imbalanced groups, and outcomes worth a
          closer look.
        </p>
      </div>
    );
  }

  if (scanError || !scan) {
    return (
      <div className="space-y-4 py-6">
        <p className="text-sm text-[var(--red)]">
          {scanError || "Something went wrong scanning this dataset."}
        </p>
        <Button
          variant="secondary"
          onClick={() => setManualMode(true)}
        >
          Choose columns manually instead
        </Button>
        {manualMode && (
          <ManualPicker
            columns={columns}
            selectedOutcome={selectedOutcome}
            noOutcome={noOutcome}
            selectedGroups={selectedGroups}
            onChooseOutcome={chooseOutcome}
            onToggleGroup={toggleGroup}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* Quality flags */}
      {scan.quality_flags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {scan.quality_flags.map((flag, i) => (
            <Badge
              key={`${flag.type}-${i}`}
              variant={
                flag.severity === "high"
                  ? "red"
                  : flag.severity === "moderate"
                    ? "orange"
                    : "neutral"
              }
            >
              {flag.message}
            </Badge>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {scan.recommendations.length > 0 ? (
        <section>
          <p className="font-mono-tech text-[10px] uppercase tracking-[0.14em] text-[var(--orange)]">
            WHAT WE FOUND
          </p>
          <h3 className="mt-1.5 text-lg font-semibold tracking-tight">
            A few things worth checking
          </h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            BiasGuard scanned your columns automatically. Pick one to
            investigate, or choose your own below.
          </p>

          <div className="mt-4 space-y-3">
            {scan.recommendations.map((rec, index) => {
              const isApplied = appliedRecommendation === index;

              return (
                <button
                  key={`${rec.group}-${rec.outcome}-${index}`}
                  type="button"
                  onClick={() => applyRecommendation(rec, index)}
                  className={`
                    w-full rounded-lg border px-4 py-3.5 text-left transition-all
                    ${
                      isApplied
                        ? "border-[var(--orange)] bg-[var(--orange-soft)]/40"
                        : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-secondary)]"
                    }
                  `}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{rec.headline}</p>
                    <Badge variant={severityBadge(rec.severity)}>
                      {severityLabel(rec.severity)}
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-[var(--muted)]">
                    {rec.detail}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      ) : (
        <section>
          <p className="text-sm text-[var(--muted)]">
            BiasGuard couldn&apos;t find an obvious outcome or group column by
            name — that&apos;s okay, you can still pick columns manually
            below.
          </p>
        </section>
      )}

      {/* Manual override */}
      <section className="border-t border-[var(--border)] pt-5">
        <button
          type="button"
          onClick={() => setManualMode((m) => !m)}
          className="font-mono-tech text-[11px] uppercase tracking-[0.14em] text-[var(--teal)] hover:underline"
        >
          {manualMode
            ? "Hide manual selection"
            : "Choose columns myself instead →"}
        </button>

        {manualMode && (
          <div className="mt-4">
            <ManualPicker
              columns={columns}
              selectedOutcome={selectedOutcome}
              noOutcome={noOutcome}
              selectedGroups={selectedGroups}
              onChooseOutcome={chooseOutcome}
              onToggleGroup={toggleGroup}
            />
          </div>
        )}
      </section>

      {/* Current selection summary */}
      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-4">
        <p className="text-xs font-medium uppercase tracking-widest text-[var(--muted)]">
          Ready to analyze
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-[var(--muted)]">Outcome:</span>
          <span className="font-medium">
            {noOutcome || !selectedOutcome
              ? "None — just check representation & missing data"
              : selectedOutcome}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-[var(--muted)]">Groups:</span>
          {selectedGroups.size > 0 ? (
            Array.from(selectedGroups).map((g) => (
              <Badge key={g} variant="teal">
                {g}
              </Badge>
            ))
          ) : (
            <span className="text-[var(--red)]">None selected yet</span>
          )}
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[var(--muted)]">
          {canAnalyze
            ? "You can change this later without re-uploading."
            : "Select at least one group to compare."}
        </p>

        <Button
          onClick={() =>
            onAnalyze(
              noOutcome ? null : selectedOutcome,
              Array.from(selectedGroups)
            )
          }
          disabled={!canAnalyze}
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Running analysis...
            </>
          ) : (
            <>
              Run bias analysis
              <span>→</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Manual picker (for people who want full control, or advanced users)
// ───────────────────────────────────────────────────────────────

interface ManualPickerProps {
  columns: string[];
  selectedOutcome: string | null;
  noOutcome: boolean;
  selectedGroups: Set<string>;
  onChooseOutcome: (column: string | null) => void;
  onToggleGroup: (column: string) => void;
}

function ManualPicker({
  columns,
  selectedOutcome,
  noOutcome,
  selectedGroups,
  onChooseOutcome,
  onToggleGroup,
}: ManualPickerProps) {
  const groupColumns = columns.filter((c) => c !== selectedOutcome);

  return (
    <div className="space-y-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <div>
        <label
          htmlFor="manual-outcome"
          className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]"
        >
          Outcome to check (optional)
        </label>
        <p className="mt-1 text-xs text-[var(--muted)]">
          The thing being decided or measured — e.g. approval, promotion,
          score. Leave blank to just check representation and missing data.
        </p>
        <select
          id="manual-outcome"
          value={noOutcome ? "" : (selectedOutcome ?? "")}
          onChange={(e) =>
            onChooseOutcome(e.target.value === "" ? null : e.target.value)
          }
          className="
            mt-2 w-full rounded-lg border border-[var(--border)]
            bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)]
            outline-none transition
            hover:border-[var(--border-strong)]
            focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal-soft)]
          "
        >
          <option value="">No outcome — just check the data itself</option>
          {columns.map((column) => (
            <option key={column} value={column}>
              {column}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
          Group(s) to compare
        </label>
        <p className="mt-1 text-xs text-[var(--muted)]">
          The attribute(s) whose groups you want to compare — e.g. gender,
          department, age group.
        </p>

        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {groupColumns.map((column) => {
            const selected = selectedGroups.has(column);
            return (
              <label
                key={column}
                className={`
                  flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-3 transition-all
                  ${
                    selected
                      ? "border-[var(--teal)] bg-[var(--teal-soft)]"
                      : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-secondary)]"
                  }
                `}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => onToggleGroup(column)}
                  className="sr-only"
                />
                <span
                  className={`
                    flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold transition
                    ${
                      selected
                        ? "border-[var(--teal)] bg-[var(--teal)] text-white"
                        : "border-[var(--border-strong)] bg-[var(--surface)] text-transparent"
                    }
                  `}
                >
                  ✓
                </span>
                <span className="min-w-0 truncate text-sm font-medium">
                  {column}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
