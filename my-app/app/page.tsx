import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/landing/Hero";
import FeatureGrid from "@/components/landing/FeatureGrid";
import HowItWorks from "@/components/landing/HowItWorks";
import Footer from "@/components/layout/Footer";
import BiasAnalyzerDashboard from "@/components/bias/BiasAnalyzerDashboard";

export default function Home() {
  return (
    <main className="site-shell">
      <Navbar />

      <Hero />

      {/* Capabilities */}
      <section className="mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-28">
        <FeatureGrid />
      </section>

      {/* Workflow */}
      <section className="border-y border-[var(--border)] bg-[var(--surface-secondary)]">
        <div className="mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-28">
          <HowItWorks />
        </div>
      </section>

      {/* Analysis workspace */}
      <section
        id="analyze"
        className="border-b border-[var(--border)]"
      >
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-24">
          <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="eyebrow mb-4">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--orange)]" />
                Analysis workspace
              </div>

              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Explore fairness in your data.
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)] md:text-base">
                Upload a dataset, define the analysis, and inspect the
                signals that matter.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
              <span className="h-2 w-2 rounded-full bg-[var(--teal)]" />
              Local dataset analysis
            </div>
          </div>

          <div className="console-panel rounded-md p-3 md:p-4">
            <BiasAnalyzerDashboard />
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
