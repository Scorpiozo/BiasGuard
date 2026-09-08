import { ButtonHTMLAttributes } from "react";

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

export default function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const variants = {
    primary: `
      border-[var(--orange)]
      bg-[var(--orange)]
      text-white
      shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,0_4px_14px_-6px_var(--glow-orange)]
      hover:brightness-105
      hover:shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,0_6px_20px_-6px_var(--glow-orange)]
      active:scale-[0.98]
    `,

    secondary: `
      border-[var(--border-strong)]
      bg-[var(--surface)]
      text-[var(--foreground)]
      hover:border-[var(--foreground)]
      hover:bg-[var(--surface-secondary)]
      active:scale-[0.98]
    `,

    ghost: `
      border-transparent
      bg-transparent
      text-[var(--muted)]
      hover:bg-[var(--surface-secondary)]
      hover:text-[var(--foreground)]
      active:scale-[0.98]
    `,
  };

  return (
    <button
      className={`
        inline-flex
        min-h-10
        items-center
        justify-center
        gap-2
        rounded-[4px]
        border
        px-4 py-2
        text-sm
        font-semibold
        tracking-[-0.01em]
        transition-all
        duration-150
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-[var(--orange)]
        focus-visible:ring-offset-2
        focus-visible:ring-offset-[var(--background)]
        disabled:pointer-events-none
        disabled:opacity-50
        ${variants[variant]}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
