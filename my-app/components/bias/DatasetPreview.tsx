"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { getDatasetPreview, type DatasetPreview } from "@/lib/api";

interface DatasetPreviewProps {
  datasetId: string;
  onContinue: () => void;
  onError: (error: string) => void;
}

export default function DatasetPreviewComponent({
  datasetId,
  onContinue,
  onError,
}: DatasetPreviewProps) {
  const [preview, setPreview] = useState<DatasetPreview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getDatasetPreview(datasetId, 10);
        setPreview(data);
      } catch (error) {
        onError(
          error instanceof Error
            ? error.message
            : "Failed to load preview"
        );
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [datasetId, onError]);

  if (loading) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <p className="text-[var(--muted)]">Loading preview...</p>
        </div>
      </Card>
    );
  }

  if (!preview || preview.preview.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <p className="text-[var(--muted)]">
            No data available in preview
          </p>
        </div>
      </Card>
    );
  }

  const columns = preview.columns;
  const rows = preview.preview;

  return (
    <Card className="p-6 md:p-10">
      <div className="mb-8">
        <div className="eyebrow mb-2">Dataset preview</div>
        <h3 className="text-2xl font-medium tracking-tight">
          {preview.rows} rows × {columns.length} columns
        </h3>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Showing first 10 rows of your dataset
        </p>
      </div>

      <div className="mb-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left font-medium text-[var(--muted)]"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={idx}
                className="border-b border-[var(--border)] hover:bg-[var(--surface-secondary)]"
              >
                {columns.map((col) => (
                  <td
                    key={`${idx}-${col}`}
                    className="px-4 py-3 text-[var(--foreground)]"
                  >
                    {row[col] === null || row[col] === undefined
                      ? "—"
                      : String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button onClick={onContinue}>Continue</Button>
    </Card>
  );
}
