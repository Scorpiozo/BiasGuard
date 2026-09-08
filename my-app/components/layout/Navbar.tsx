"use client";

import ThemeToggle from "../ui/ThemeToggle";
import ApiStatus from "../ui/ApiStatus";

export default function Navbar() {
  return (
    <nav
      className="
        sticky top-0 z-50
        overflow-hidden
        border-b border-[var(--border)]
        bg-[color-mix(in_srgb,var(--background)_82%,transparent)]
        backdrop-blur-xl
        shadow-[0_8px_24px_-20px_var(--shadow)]
      "
    >
      {/* Subtle teal glass reflection */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute inset-x-0 bottom-0
          h-2
          opacity-80
        "
        style={{
          background:
            "linear-gradient(to top, color-mix(in srgb, var(--teal) 20%, transparent), transparent)",
        }}
      />

      {/* Soft glass highlight */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute inset-x-0 top-0
          h-px
          bg-white/70
          dark:bg-white/5
        "
      />

      <div className="relative mx-auto flex h-14 max-w-7xl items-center justify-between px-6 lg:px-10">
        {/* Brand */}
        <a
          href="#top"
          aria-label="BiasGuard home"
          className="group flex items-center gap-3"
        >
          <div
            className="
              relative flex h-8 w-8 items-center justify-center
              overflow-hidden rounded-[4px]
              bg-[var(--foreground)]
              transition-all duration-200
              group-hover:-translate-y-px
              group-hover:shadow-[0_6px_18px_-10px_var(--shadow)]
            "
          >
            {/* Tiny orange reflection */}
            <div
              aria-hidden="true"
              className="
                pointer-events-none
                absolute inset-x-0 bottom-0
                h-2
                opacity-30
              "
              style={{
                background:
                  "linear-gradient(to top, var(--orange), transparent)",
              }}
            />

            <span className="relative font-mono-tech text-xs font-bold text-[var(--background)]">
              B
            </span>
          </div>

          <span className="text-[15px] font-semibold tracking-tight">
            BiasGuard
          </span>
        </a>

        {/* Desktop navigation */}
        <div className="hidden items-center gap-1 md:flex">
          <a
            href="#about"
            className="
              group relative
              rounded-[4px]
              px-3 py-2
              text-sm
              text-[var(--muted)]
              transition-all duration-200
              hover:bg-[var(--surface-secondary)]
              hover:text-[var(--foreground)]
            "
          >
            Overview

            <span
              aria-hidden="true"
              className="
                absolute bottom-1 left-1/2
                h-px w-0
                -translate-x-1/2
                bg-[var(--teal)]
                transition-all duration-200
                group-hover:w-4
              "
            />
          </a>

          <a
            href="#how-it-works"
            className="
              group relative
              rounded-[4px]
              px-3 py-2
              text-sm
              text-[var(--muted)]
              transition-all duration-200
              hover:bg-[var(--surface-secondary)]
              hover:text-[var(--foreground)]
            "
          >
            How it works

            <span
              aria-hidden="true"
              className="
                absolute bottom-1 left-1/2
                h-px w-0
                -translate-x-1/2
                bg-[var(--teal)]
                transition-all duration-200
                group-hover:w-4
              "
            />
          </a>

          {/* Primary action */}
          <a
            href="#analyze"
            className="
              ml-3
              flex items-center gap-2
              rounded-[4px]
              bg-[var(--foreground)]
              px-4 py-2
              text-sm
              font-medium
              text-[var(--background)]
              transition-all duration-200
              hover:-translate-y-px
              hover:opacity-90
              hover:shadow-[0_8px_20px_-12px_var(--shadow)]
            "
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: "var(--teal)" }}
            />

            Analyze dataset

            <span className="font-mono-tech text-[11px] opacity-50">
              →
            </span>
          </a>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <ApiStatus />
          </div>

          {/* Mobile analyze */}
          <a
            href="#analyze"
            className="
              rounded-[4px]
              border border-[var(--border)]
              bg-[var(--surface)]/70
              px-3 py-2
              text-xs
              font-medium
              text-[var(--foreground)]
              backdrop-blur-sm
              transition-all duration-200
              hover:border-[var(--border-strong)]
              hover:bg-[var(--surface-secondary)]
              md:hidden
            "
          >
            Analyze
          </a>

          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
