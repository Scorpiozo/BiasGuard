"use client";

import { useRef, useState } from "react";
import type { DragEvent } from "react";
import Button from "@/components/ui/Button";
import { uploadDataset, type UploadResponse } from "@/lib/api";

interface DatasetUploaderProps {
  onUploadComplete: (response: UploadResponse) => void;
  onError: (error: string) => void;
}

const MAX_SIZE_BYTES = 100 * 1024 * 1024;

export default function DatasetUploader({
  onUploadComplete,
  onError,
}: DatasetUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      onError("Only .csv files are supported.");
      return;
    }

    if (file.size === 0) {
      onError("That file is empty.");
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      onError("File exceeds the 100MB limit.");
      return;
    }

    setSelectedName(file.name);
    setLoading(true);

    try {
      const response = await uploadDataset(file);
      onUploadComplete(response);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files?.[0]) {
      handleUpload(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files?.[0]) {
      handleUpload(files[0]);
    }
    // allow re-selecting the same file name after an error
    e.currentTarget.value = "";
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`
        analysis-grid
        relative overflow-hidden
        rounded-md border-2 border-dashed
        transition-colors duration-150
        ${
          dragActive
            ? "border-[var(--teal)] bg-[var(--teal-soft)]"
            : "border-[var(--border-strong)] hover:border-[var(--orange)]"
        }
      `}
    >
      <div className="flex flex-col items-center justify-center gap-5 px-8 py-16 text-center">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-[6px] border transition-colors ${
            loading
              ? "border-[var(--orange)] text-[var(--orange)]"
              : "border-[var(--border-strong)] text-[var(--muted)]"
          }`}
        >
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--orange)]" />
          ) : (
            <span className="font-mono-tech text-lg">↑</span>
          )}
        </div>

        <div>
          <p className="eyebrow justify-center mb-2">
            Upload dataset · .csv
          </p>
          <h3 className="text-xl font-semibold tracking-tight">
            {loading
              ? `Uploading ${selectedName ?? "file"}...`
              : "Drag and drop your CSV file"}
          </h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {loading ? "Parsing and profiling on the server" : "or click to browse"}
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          onChange={handleFileInput}
          disabled={loading}
          className="hidden"
        />

        <Button disabled={loading} onClick={() => inputRef.current?.click()}>
          {loading ? "Uploading..." : "Select CSV"}
        </Button>

        <p className="font-mono-tech text-[11px] tracking-wide text-[var(--muted-light)]">
          MAX 100MB · UTF-8 · COMMA-DELIMITED
        </p>
      </div>
    </div>
  );
}
