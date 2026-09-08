import Card from "../ui/Card";

const steps = [
  {
    number: "01",
    title: "Upload",
    text: "Add a CSV dataset and inspect its structure.",
    accent: "var(--orange)",
  },
  {
    number: "02",
    title: "Configure",
    text: "Choose the target and protected attributes.",
    accent: "var(--teal)",
  },
  {
    number: "03",
    title: "Detect",
    text: "Find representation, outcome, missingness, and imbalance signals.",
    accent: "var(--red)",
  },
  {
    number: "04",
    title: "Evaluate",
    text: "Measure fairness across protected groups.",
    accent: "var(--orange)",
  },
  {
    number: "05",
    title: "Mitigate",
    text: "Apply supported strategies and compare the results.",
    accent: "var(--teal)",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works">
      <div className="mb-10 max-w-xl">
        <div className="eyebrow mb-4">
          Analysis workflow
        </div>

        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
          From dataset to decision.
        </h2>

        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
          A structured workflow keeps every fairness decision tied to
          something measurable in the underlying data.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-5">
        {steps.map((step, index) => (
          <div key={step.number} className="relative">
            <Card
              accent={step.accent}
              className="h-full p-0"
            >
              <div className="flex h-full min-h-[230px] flex-col p-5">
                {/* Step header */}
                <div className="flex items-center justify-between">
                  <span
                    className="font-mono-tech text-[10px] font-semibold tracking-wider"
                    style={{ color: step.accent }}
                  >
                    STEP {step.number}
                  </span>

                  <span
                    className="h-2 w-2 rounded-[2px]"
                    style={{ backgroundColor: step.accent }}
                  />
                </div>

                {/* Content */}
                <div className="mt-auto">
                  <h3 className="text-lg font-semibold tracking-tight">
                    {step.title}
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                    {step.text}
                  </p>
                </div>

                {/* Progress line */}
                <div className="mt-6 h-px bg-[var(--border)]">
                  <div
                    className="h-px w-1/3"
                    style={{ backgroundColor: step.accent }}
                  />
                </div>
              </div>
            </Card>

            {/* Connector */}
            {index < steps.length - 1 && (
              <div
                aria-hidden="true"
                className="
                  absolute
                  -right-2.5
                  top-1/2
                  z-20
                  hidden
                  h-5
                  w-5
                  -translate-y-1/2
                  items-center
                  justify-center
                  rounded-full
                  border
                  border-[var(--border)]
                  bg-[var(--background)]
                  font-mono-tech
                  text-[10px]
                  text-[var(--muted)]
                  lg:flex
                "
              >
                →
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
