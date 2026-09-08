import Button from "../ui/Button";
import Card from "../ui/Card";

const signals = [
  {
    label: "Representation",
    value: "Group distribution",
    color: "var(--orange)",
  },
  {
    label: "Outcomes",
    value: "Outcome disparities",
    color: "var(--teal)",
  },
  {
    label: "Fairness",
    value: "Group-level metrics",
    color: "var(--red)",
  },
];

export default function Hero() {
  return (
    <section id="top" className="border-b border-[var(--border)]">
      <div className="mx-auto grid max-w-7xl lg:grid-cols-[1.05fr_0.95fr]">
        {/* Left: Hero copy */}
        <div className="px-6 py-6 lg:border-r lg:border-[var(--border)] lg:px-10 lg:py-8">
          <div className="eyebrow mb-4">
            <span
              className="status-dot"
              style={{ backgroundColor: "var(--orange)" }}
            />
            Dataset fairness analysis
          </div>

          <h1 className="max-w-3xl text-[clamp(3rem,5vw,4.75rem)] font-semibold leading-[0.95] tracking-[-0.045em]">
            Find the signals
            <br />
            hidden in your{" "}
            <span className="text-[var(--orange)]">dataset.</span>
          </h1>

          <p className="mt-6 max-w-lg text-[15px] leading-7 text-[var(--muted)] md:text-base">
            BiasGuard turns fairness questions into measurable evidence —
            revealing representation gaps, outcome disparities, missingness,
            and imbalance across protected groups.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a href="#analyze">
              <Button>
                Analyze dataset
                <span>→</span>
              </Button>
            </a>

            <a href="#how-it-works">
              <Button variant="secondary">
                How it works
              </Button>
            </a>
          </div>

          {/* Capability readout */}
          <div className="mt-8 grid max-w-lg grid-cols-2 border-y border-[var(--border)]">
            <div className="border-r border-[var(--border)] py-3 pr-5">
              <p className="font-mono-tech text-[10px] uppercase tracking-wider text-[var(--muted)]">
                Input
              </p>

              <p className="mt-1 text-xs font-medium">
                CSV datasets
              </p>
            </div>

            <div className="py-3 pl-5">
              <p className="font-mono-tech text-[10px] uppercase tracking-wider text-[var(--muted)]">
                Analysis
              </p>

              <p className="mt-1 text-xs font-medium">
                Group fairness
              </p>
            </div>
          </div>
        </div>

        {/* Right: Analysis preview */}
        <div className="analysis-grid px-6 py-6 lg:px-10 lg:py-8">
          <div className="mb-3 flex items-center justify-between">
            <p className="eyebrow">
              <span
                className="status-dot"
                style={{ backgroundColor: "var(--teal)" }}
              />
              Analysis preview
            </p>

            <span className="font-mono-tech text-[11px] tracking-wide text-[var(--teal)]">
              READY
            </span>
          </div>

          <Card
            accent="var(--teal)"
            title="employee_data.csv"
            titleAccessory={
              <span className="rounded-[3px] bg-[var(--teal-soft)] px-2 py-0.5 font-mono-tech text-[10px] font-semibold tracking-wide text-[var(--teal)]">
                ANALYZED
              </span>
            }
            className="p-0"
          >
            {/* Dataset information */}
            <div className="border-b border-[var(--border)] px-5 py-3.5">
              <div className="flex items-center justify-between">
                <p className="font-mono-tech text-[10px] uppercase tracking-wide text-[var(--muted)]">
                  Dataset
                </p>

                <span className="font-mono-tech text-[10px] text-[var(--muted-light)]">
                  CSV
                </span>
              </div>

              <p className="mt-1.5 text-xs text-[var(--muted)]">
                24,820 rows · 14 columns
              </p>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 divide-x divide-[var(--border)]">
              <div className="p-4">
                <p className="font-mono-tech text-[10px] tracking-wide text-[var(--muted)]">
                  GROUPS
                </p>

                <p className="mt-1.5 text-2xl font-semibold tabular-nums">
                  4
                </p>
              </div>

              <div className="p-4">
                <p className="font-mono-tech text-[10px] tracking-wide text-[var(--muted)]">
                  SIGNALS
                </p>

                <p className="mt-1.5 text-2xl font-semibold tabular-nums text-[var(--red)]">
                  3
                </p>
              </div>

              <div className="p-4">
                <p className="font-mono-tech text-[10px] tracking-wide text-[var(--muted)]">
                  STATUS
                </p>

                <p className="mt-2 text-sm font-semibold text-[var(--orange)]">
                  Review
                </p>
              </div>
            </div>

            {/* Detected signals */}
            <div className="border-t border-[var(--border)]">
              {signals.map((signal) => (
                <div
                  key={signal.label}
                  className="
                    group/signal
                    flex items-center gap-4
                    border-b border-[var(--border)]
                    px-5 py-3.5
                    last:border-b-0
                    transition-colors duration-200
                    hover:bg-[var(--surface-secondary)]
                  "
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-[2px]"
                    style={{ backgroundColor: signal.color }}
                  />

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {signal.label}
                    </p>

                    <p className="mt-0.5 text-xs text-[var(--muted)]">
                      {signal.value}
                    </p>
                  </div>

                  <span
                    className="
                      font-mono-tech
                      text-xs
                      text-[var(--muted)]
                      transition-transform
                      duration-200
                      group-hover/signal:translate-x-1
                    "
                  >
                    →
                  </span>
                </div>
              ))}
            </div>

            {/* Analysis status */}
            <div className="border-t border-[var(--border)] bg-[var(--surface-inset)] px-5 py-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono-tech text-[9px] uppercase tracking-[0.12em] text-[var(--muted-light)]">
                  Analysis complete
                </span>

                <span className="status-dot bg-[var(--teal)]" />
              </div>
            </div>
          </Card>

          <p className="mt-3 max-w-sm text-xs leading-5 text-[var(--muted)]">
            A preview of the analytical workspace. Upload your own dataset
            to generate actual results.
          </p>
        </div>
      </div>
    </section>
  );
}
