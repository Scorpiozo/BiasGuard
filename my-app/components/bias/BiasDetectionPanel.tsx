"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import type {
  BiasDetectionResponse,
  GroupAnalysisEntry,
  RecommendationItem,
} from "@/lib/api";

interface BiasDetectionPanelProps {
  analysis: BiasDetectionResponse;
}

type Severity = "high" | "moderate" | "low";

function severityFromGap(gap: number): Severity {
  if (gap >= 0.3) return "high";
  if (gap >= 0.15) return "moderate";
  return "low";
}

function badgeVariant(severity: Severity): "red" | "orange" | "teal" {
  if (severity === "high") return "red";
  if (severity === "moderate") return "orange";
  return "teal";
}

function severityColor(severity: Severity): string {
  if (severity === "high") return "var(--red)";
  if (severity === "moderate") return "var(--orange)";
  return "var(--teal)";
}

function severityLabel(severity: Severity): string {
  if (severity === "high") return "High risk";
  if (severity === "moderate") return "Moderate risk";
  return "Low risk";
}

// A single labeled horizontal bar — the workhorse visual for every
// section below, so results read as bars, not just numbers in rows.
function Bar({
  label,
  value,
  displayValue,
  maxValue = 100,
  color = "var(--orange)",
  sublabel,
}: {
  label: React.ReactNode;
  value: number;
  displayValue: string;
  maxValue?: number;
  color?: string;
  sublabel?: string;
}) {
  const pct = maxValue > 0 ? Math.max(0, Math.min(100, (value / maxValue) * 100)) : 0;

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-sm font-medium">{label}</span>
        <span className="shrink-0 text-xs font-medium tabular-nums text-[var(--muted)]">
          {displayValue}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[var(--border)]">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      {sublabel && (
        <p className="mt-0.5 text-[11px] text-[var(--muted)]">{sublabel}</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Recommendations: concrete, actionable items from the backend,
// distinguishing bias risk (protected-looking attributes) from
// incidental imbalance (probably just your population).
// ─────────────────────────────────────────────────────────────

const CATEGORY_LABEL: Record<RecommendationItem["category"], string> = {
  representation: "Representation",
  missing_data: "Missing data",
  outcome_gap: "Outcome gap",
  data_quality: "Data quality",
};

function RecommendationCard({ item }: { item: RecommendationItem }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: severityColor(item.severity) }}
          />
          <p className="text-sm font-semibold">{item.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="neutral">{CATEGORY_LABEL[item.category]}</Badge>
          <Badge variant={badgeVariant(item.severity)}>
            {severityLabel(item.severity)}
          </Badge>
        </div>
      </div>

      <p className="mt-2.5 text-sm leading-6 text-[var(--muted)]">
        {item.why}
      </p>

      <div className="mt-3 flex items-start gap-2 rounded-md bg-[var(--surface-secondary)] px-3 py-2.5">
        <span className="mt-0.5 shrink-0 text-xs font-semibold text-[var(--teal)]">
          DO THIS
        </span>
        <p className="text-sm leading-6">{item.action}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Outcome visualization per group attribute
// ─────────────────────────────────────────────────────────────

function OutcomeBars({ data }: { data: GroupAnalysisEntry }) {
  if (data.outcome) {
    const outcome = data.outcome;
    return (
      <div className="space-y-3">
        {outcome.groups.map((g) => (
          <Bar
            key={g.group}
            label={g.group}
            value={g.positive_rate * 100}
            displayValue={`${(g.positive_rate * 100).toFixed(1)}%`}
            color="var(--orange)"
          />
        ))}
      </div>
    );
  }

  if (data.outcome_multiclass) {
    const outcome = data.outcome_multiclass;
    return (
      <div className="space-y-4">
        {outcome.groups.map((g) => {
          const dominant = [...g.classes].sort(
            (a, b) => b.percentage - a.percentage
          )[0];
          return (
            <Bar
              key={g.group}
              label={g.group}
              value={dominant?.percentage ?? 0}
              displayValue={
                dominant ? `${dominant.class} · ${dominant.percentage.toFixed(1)}%` : "—"
              }
              color="var(--orange)"
              sublabel={g.classes
                .slice(0, 4)
                .map((c) => `${c.class} ${c.percentage.toFixed(0)}%`)
                .join("  ·  ")}
            />
          );
        })}
      </div>
    );
  }

  if (data.outcome_continuous) {
    const outcome = data.outcome_continuous;
    const means = outcome.groups.map((g) => g.mean ?? 0);
    const maxMean = Math.max(...means, 1);
    return (
      <div className="space-y-3">
        {outcome.groups.map((g) => (
          <Bar
            key={g.group}
            label={g.group}
            value={g.mean ?? 0}
            maxValue={maxMean}
            displayValue={
              g.mean !== null
                ? g.mean.toLocaleString(undefined, { maximumFractionDigits: 1 })
                : "—"
            }
            color="var(--orange)"
          />
        ))}
      </div>
    );
  }

  return (
    <p className="rounded-lg bg-[var(--surface-secondary)] p-3 text-sm text-[var(--muted)]">
      No outcome selected — showing representation and data-quality signals
      only.
    </p>
  );
}

function outcomeSeverity(data: GroupAnalysisEntry): Severity | null {
  if (data.outcome) return severityFromGap(data.outcome.positive_rate_gap);
  if (data.outcome_multiclass)
    return severityFromGap(data.outcome_multiclass.max_distribution_gap);
  if (data.outcome_continuous)
    return severityFromGap(Math.abs(data.outcome_continuous.relative_mean_gap ?? 0));
  return null;
}

// ─────────────────────────────────────────────────────────────
// Per-group collapsible section
// ─────────────────────────────────────────────────────────────

function GroupSection({
  attribute,
  data,
  defaultOpen,
}: {
  attribute: string;
  data: GroupAnalysisEntry;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const severity = outcomeSeverity(data);
  const missingIssues = data.missingness.details.filter(
    (d) => d.missing_count > 0 && d.column !== attribute
  );

  const maxRepCount = Math.max(
    ...data.representation.groups.map((g) => g.count),
    1
  );

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left"
      >
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold tracking-tight">
            {attribute}
          </h3>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {data.representation.groups.length} groups
            {missingIssues.length > 0 &&
              ` · ${missingIssues.length} missing-data flag${
                missingIssues.length > 1 ? "s" : ""
              }`}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {severity && (
            <Badge variant={badgeVariant(severity)}>
              {severityLabel(severity)}
            </Badge>
          )}
          <span
            className={`text-[var(--muted)] transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          >
            ▾
          </span>
        </div>
      </button>

      {open && (
        <div className="border-t border-[var(--border)] p-6 pt-5">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-widest text-[var(--muted)]">
                Representation
              </p>
              <div className="space-y-3">
                {data.representation.groups.map((g) => (
                  <Bar
                    key={g.group}
                    label={
                      g.is_missing ? `${g.group} (missing)` : g.group
                    }
                    value={g.count}
                    maxValue={maxRepCount}
                    displayValue={`${g.count.toLocaleString()} · ${g.percentage.toFixed(1)}%`}
                    color="var(--teal)"
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-widest text-[var(--muted)]">
                Outcome
              </p>
              <OutcomeBars data={data} />
            </div>
          </div>

          {missingIssues.length > 0 && (
            <div className="mt-6 border-t border-[var(--border)] pt-5">
              <p className="mb-3 text-xs font-medium uppercase tracking-widest text-[var(--muted)]">
                Missing data
              </p>
              <div className="flex flex-wrap gap-2">
                {missingIssues.slice(0, 6).map((d, i) => (
                  <Badge
                    key={`${d.group}-${d.column}-${i}`}
                    variant={d.missing_rate > 0.2 ? "red" : "neutral"}
                  >
                    {d.group} · {d.column}: {(d.missing_rate * 100).toFixed(0)}%
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Top-level panel
// ─────────────────────────────────────────────────────────────

export default function BiasDetectionPanel({
  analysis,
}: BiasDetectionPanelProps) {
  const recommendations = analysis.recommendations ?? [];
  const attributes = Object.entries(analysis.group_analysis);

  return (
    <div className="space-y-5">
      {/* Actionable recommendations, front and center */}
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-widest text-[var(--muted)]">
          How to improve this dataset
        </p>
        <p className="mb-3 text-xs text-[var(--muted)]">
          Concrete changes worth making before training a model — not just
          what was found, but what to do about it.
        </p>

        {recommendations.length > 0 ? (
          <div className="space-y-2.5">
            {recommendations.map((item, i) => (
              <RecommendationCard key={i} item={item} />
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3 text-sm text-[var(--muted)]">
            Nothing stood out enough to flag for the groups you chose — this
            data looks reasonably balanced.
          </p>
        )}
      </div>

      {/* Per-group detail, collapsed after the first so the page
          doesn't turn into an endless scroll */}
      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-[var(--muted)]">
          Group-by-group detail
        </p>
        <div className="space-y-3">
          {attributes.map(([attribute, data], index) => (
            <GroupSection
              key={attribute}
              attribute={attribute}
              data={data}
              defaultOpen={index === 0}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
