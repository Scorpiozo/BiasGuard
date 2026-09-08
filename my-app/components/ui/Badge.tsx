import { ReactNode } from "react";

type BadgeVariant = "orange" | "teal" | "red" | "neutral";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
}

export default function Badge({
  children,
  variant = "neutral",
}: BadgeProps) {
  const styles = {
    orange: {
      container:
        "border-[var(--orange-soft)] bg-[var(--orange-soft)]/35 text-[var(--orange)]",
      dot: "bg-[var(--orange)]",
    },
    teal: {
      container:
        "border-[var(--teal-soft)] bg-[var(--teal-soft)]/35 text-[var(--teal)]",
      dot: "bg-[var(--teal)]",
    },
    red: {
      container:
        "border-[var(--red-soft)] bg-[var(--red-soft)]/35 text-[var(--red)]",
      dot: "bg-[var(--red)]",
    },
    neutral: {
      container:
        "border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--muted)]",
      dot: "bg-current opacity-50",
    },
  };

  const style = styles[variant];

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        rounded-[3px]
        border
        px-2.5 py-1
        text-[11px]
        font-semibold
        font-mono-tech
        tracking-[0.02em]
        leading-none
        whitespace-nowrap
        ${style.container}
      `}
    >
      <span
        className={`
          h-1.5 w-1.5
          shrink-0
          rounded-full
          ${style.dot}
        `}
      />
      {children}
    </span>
  );
}
