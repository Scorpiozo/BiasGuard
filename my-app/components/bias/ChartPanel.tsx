"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import { getChartData, type ChartDataResponse } from "@/lib/api";

interface ChartPanelProps {
  datasetId: string;
  target: string;
  protectedAttribute: string;
  onError: (error: string) => void;
}

export default function ChartPanel({
  datasetId,
  target,
  protectedAttribute,
  onError,
}: ChartPanelProps) {
  const [chartData, setChartData] = useState<ChartDataResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        const data = await getChartData(datasetId, protectedAttribute, target);
        if (!cancelled) setChartData(data);
      } catch (error) {
        if (!cancelled) {
          onError(
            error instanceof Error ? error.message : "Failed to load charts"
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
  }, [datasetId, target, protectedAttribute, onError]);

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center gap-3 py-6">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--teal)]" />
          <p className="text-sm text-[var(--muted)]">
            Loading visualization data...
          </p>
        </div>
      </Card>
    );
  }

  if (!chartData) {
    return null;
  }

  const rep = chartData.representation;
  const outcomes = chartData.outcome_rates;
  const maxRepCount = Math.max(...rep.data.map((d) => d.count ?? 0), 1);

  return (
    <div className="space-y-6">
      {/* Group Representation */}
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-[var(--muted)] mb-3">
          {rep.title || "Group Representation"}
        </p>
        <div className="grid gap-3">
          {rep.data.map((d) => {
            const count = d.count ?? 0;
            const percentage = (count / maxRepCount) * 100;
            return (
              <div key={d.group}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">{d.group}</span>
                  <span className="text-xs text-[var(--muted)] tabular-nums">
                    {count.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
                  <div
                    className="transition-[width] duration-500 ease-out"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: "var(--orange)",
                      height: "100%",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Outcome Rates */}
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-[var(--muted)] mb-3">
          {outcomes.title || "Outcome Rates by Group"}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-2 px-3 font-medium text-[var(--foreground)]">
                  Group
                </th>
                <th className="text-right py-2 px-3 font-medium text-[var(--foreground)]">
                  Outcome Rate
                </th>
              </tr>
            </thead>
            <tbody>
              {outcomes.data.map((d) => {
                const rate = d.positive_rate ?? 0;
                return (
                  <tr
                    key={d.group}
                    className="border-b border-[var(--border)] hover:bg-[var(--surface-secondary)] transition-colors"
                  >
                    <td className="py-3 px-3 text-[var(--foreground)]">
                      {d.group}
                    </td>
                    <td className="py-3 px-3 text-right font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <span className="tabular-nums">
                          {(rate * 100).toFixed(1)}%
                        </span>
                        <div className="w-20 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                          <div
                            className="transition-[width] duration-500 ease-out"
                            style={{
                              width: `${rate * 100}%`,
                              backgroundColor:
                                rate > 0.5 ? "var(--teal)" : "var(--orange)",
                              height: "100%",
                            }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
