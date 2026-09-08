import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  titleAccessory?: ReactNode;
  accent?: string;
}

export default function Card({
  children,
  className = "",
  title,
  titleAccessory,
  accent,
}: CardProps) {
  return (
    <div
      className={`
        group
        relative
        overflow-hidden
        rounded-md
        console-panel

        transition-[transform,box-shadow,border-color]
        duration-300
        ease-out

        hover:-translate-y-[1px]
        hover:border-[var(--border-strong)]
        hover:shadow-[0_12px_30px_-18px_var(--shadow)]

        ${className}
      `}
    >
      {/* Accent glass */}
      {accent && (
        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            inset-x-0
            bottom-0
            z-[1]
            h-10
          "
          style={{
            background: `linear-gradient(
              to top,
              color-mix(in srgb, ${accent} 18%, transparent),
              color-mix(in srgb, ${accent} 6%, transparent) 55%,
              transparent
            )`,
          }}
        />
      )}

      {/* Bottom accent edge */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-x-0
          bottom-0
          z-[2]
          h-px
        "
        style={{
          backgroundColor: accent ?? "var(--border)",
          opacity: accent ? 0.4 : 0.7,
        }}
      />

      {/* Subtle top highlight */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-x-0
          top-0
          z-[2]
          h-px
          bg-white/60
          dark:bg-white/5
        "
      />

      {/* Terminal header */}
      {title && (
        <div className="console-titlebar relative z-10">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="console-dots" aria-hidden="true">
              <span className="console-dot" />
              <span className="console-dot" />
              <span className="console-dot" />
            </span>

            <span className="console-titlebar-label truncate">
              {title}
            </span>
          </div>

          {titleAccessory && (
            <div className="shrink-0">
              {titleAccessory}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
