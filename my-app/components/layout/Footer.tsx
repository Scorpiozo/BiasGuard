export default function Footer() {
  return (
    <footer
      className="
        relative
        overflow-hidden
        border-t border-white/10
        bg-[var(--black)]
        px-6 py-8
        text-white
        lg:px-10
      "
    >
      {/* Very subtle teal glass reflection */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute inset-x-0 bottom-0
          h-10
          opacity-30
        "
        style={{
          background:
            "linear-gradient(to top, color-mix(in srgb, var(--teal) 18%, transparent), transparent)",
        }}
      />

      <div className="relative mx-auto max-w-7xl">
        <div className="grid gap-8 sm:grid-cols-[1fr_auto] sm:items-end">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5">
              <span
                className="
                  flex h-8 w-8
                  items-center justify-center
                  rounded-md
                  bg-white
                  font-mono-tech
                  text-xs font-bold
                  text-[var(--black)]
                "
              >
                B
              </span>

              <span className="text-base font-semibold tracking-tight">
                BiasGuard
              </span>
            </div>

            <p className="mt-3 max-w-sm text-xs leading-5 text-white/55">
              Dataset fairness analysis for turning hidden patterns
              into measurable evidence.
            </p>
          </div>

          {/* Workflow */}
          <div className="sm:text-right">
            <div className="mb-2 font-mono-tech text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
              Analysis workflow
            </div>

            <div className="font-mono-tech text-xs text-white/80">
              <span className="text-[var(--orange)]">01</span>
              <span className="ml-2">Detect</span>

              <span className="mx-3 text-white/20">→</span>

              <span className="text-[var(--teal)]">02</span>
              <span className="ml-2">Evaluate</span>

              <span className="mx-3 text-white/20">→</span>

              <span className="text-[var(--red)]">03</span>
              <span className="ml-2">Mitigate</span>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div
          className="
            mt-8
            flex flex-col gap-2
            border-t border-white/10
            pt-4
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <span className="font-mono-tech text-[10px] uppercase tracking-[0.12em] text-white/35">
            Fairness is measurable.
          </span>

          <span className="font-mono-tech text-[10px] text-white/35">
            BiasGuard
          </span>
        </div>
      </div>
    </footer>
  );
}
