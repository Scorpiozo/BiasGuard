import Card from "../ui/Card";

const features = [
  {
    title: "Representation",
    description:
      "Measure how protected groups are distributed throughout the dataset.",
    accent: "var(--orange)",
  },
  {
    title: "Outcomes",
    description:
      "Compare target outcomes between groups and surface meaningful disparities.",
    accent: "var(--teal)",
  },
  {
    title: "Fairness",
    description:
      "Evaluate group-level fairness metrics and identify areas requiring review.",
    accent: "var(--red)",
  },
];

export default function FeatureGrid() {
  return (
    <section id="about">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <div className="eyebrow mb-4">
            What BiasGuard examines
          </div>

          <h2 className="max-w-md text-3xl font-semibold tracking-tight md:text-4xl">
            Turn raw data into evidence you can inspect.
          </h2>

          <p className="mt-4 max-w-md text-sm leading-6 text-[var(--muted)]">
            Bias isn't always visible in a dataset. BiasGuard breaks
            the analysis into measurable signals so you can investigate
            them individually.
          </p>
        </div>

        <div className="space-y-3">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="p-0"
              accent={feature.accent}
            >
              <div className="grid gap-4 p-5 sm:grid-cols-[180px_1fr] sm:items-start">
                <div className="flex items-start gap-2">
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-[2px]"
                    style={{
                      backgroundColor: feature.accent,
                    }}
                  />

                  <h3 className="text-sm font-semibold">
                    {feature.title}
                  </h3>
                </div>

                <p className="text-sm leading-6 text-[var(--muted)]">
                  {feature.description}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
