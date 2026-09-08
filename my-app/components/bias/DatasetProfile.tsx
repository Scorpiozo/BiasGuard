"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import { getDatasetProfile, type DatasetProfile } from "@/lib/api";

interface DatasetProfileComponentProps {
  datasetId: string;
  onError: (error: string) => void;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function DatasetProfileComponent({
  datasetId,
  onError,
}: DatasetProfileComponentProps) {
  const [profile, setProfile] = useState<DatasetProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        const data = await getDatasetProfile(datasetId);
        if (!cancelled) setProfile(data);
      } catch (error) {
        if (!cancelled) {
          onError(
            error instanceof Error ? error.message : "Failed to load profile"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [datasetId, onError]);

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center gap-3 py-6">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--teal)]" />
          <p className="text-sm text-[var(--muted)]">Analyzing dataset...</p>
        </div>
      </Card>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <Card className="p-6 md:p-10">
      <div className="mb-8">
        <div className="eyebrow mb-2">Dataset statistics</div>
        <h3 className="text-2xl font-medium tracking-tight">
          Profiling analysis
        </h3>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-[var(--surface-secondary)] p-4">
          <p className="text-[11px] uppercase tracking-widest text-[var(--muted)] mb-1">
            Rows
          </p>
          <p className="text-xl font-semibold tabular-nums">
            {profile.rows.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg bg-[var(--surface-secondary)] p-4">
          <p className="text-[11px] uppercase tracking-widest text-[var(--muted)] mb-1">
            Columns
          </p>
          <p className="text-xl font-semibold tabular-nums">
            {profile.columns}
          </p>
        </div>
        <div className="rounded-lg bg-[var(--surface-secondary)] p-4">
          <p className="text-[11px] uppercase tracking-widest text-[var(--muted)] mb-1">
            Duplicate rows
          </p>
          <p className="text-xl font-semibold tabular-nums">
            {profile.duplicate_rows.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg bg-[var(--surface-secondary)] p-4">
          <p className="text-[11px] uppercase tracking-widest text-[var(--muted)] mb-1">
            Memory
          </p>
          <p className="text-xl font-semibold tabular-nums">
            {formatBytes(profile.memory_usage_bytes)}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left">
              <th className="py-2 px-3 font-medium text-[var(--foreground)]">
                Column
              </th>
              <th className="py-2 px-3 font-medium text-[var(--foreground)]">
                Type
              </th>
              <th className="py-2 px-3 font-medium text-[var(--foreground)]">
                Missing
              </th>
              <th className="py-2 px-3 font-medium text-[var(--foreground)]">
                Unique
              </th>
              <th className="py-2 px-3 font-medium text-[var(--foreground)]">
                Summary
              </th>
            </tr>
          </thead>
          <tbody>
            {profile.columns_detail.map((col) => (
              <tr
                key={col.name}
                className="border-b border-[var(--border)] hover:bg-[var(--surface-secondary)] transition-colors align-top"
              >
                <td className="py-3 px-3 font-medium">{col.name}</td>
                <td className="py-3 px-3 text-[var(--muted)] font-mono text-xs">
                  {col.dtype}
                </td>
                <td className="py-3 px-3 tabular-nums">
                  <span
                    className={
                      col.missing_percentage > 0
                        ? "text-[var(--red)]"
                        : "text-[var(--muted)]"
                    }
                  >
                    {col.missing_percentage.toFixed(1)}%
                  </span>
                </td>
                <td className="py-3 px-3 tabular-nums text-[var(--muted)]">
                  {col.unique_count.toLocaleString()} (
                  {col.unique_percentage.toFixed(1)}%)
                </td>
                <td className="py-3 px-3 text-xs text-[var(--muted)]">
                  {col.statistics ? (
                    <span>
                      mean {col.statistics.mean.toFixed(2)} · min{" "}
                      {col.statistics.min} · max {col.statistics.max}
                    </span>
                  ) : col.top_values ? (
                    <span>
                      {col.top_values
                        .slice(0, 3)
                        .map((v) => `${v.value} (${v.percentage.toFixed(0)}%)`)
                        .join(", ")}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
