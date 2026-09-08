"use client";

import { useEffect, useState } from "react";
import { health } from "@/lib/api";

type Status = "checking" | "online" | "offline";

export default function ApiStatus() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        await health();
        if (!cancelled) setStatus("online");
      } catch {
        if (!cancelled) setStatus("offline");
      }
    };

    check();
    const interval = setInterval(check, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const color =
    status === "online"
      ? "var(--teal)"
      : status === "offline"
        ? "var(--red)"
        : "var(--muted-light)";

  const label =
    status === "online"
      ? "API online"
      : status === "offline"
        ? "API unreachable"
        : "Checking...";

  return (
    <div
      className="flex items-center gap-2 rounded-[3px] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5"
      title={label}
    >
      <span
        className="status-dot"
        style={{ backgroundColor: color }}
      />
      <span className="font-mono-tech text-[11px] tracking-wide text-[var(--muted)]">
        {label}
      </span>
    </div>
  );
}
