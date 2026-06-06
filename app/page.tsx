/**
 * Landing placeholder. The full marketing page + magic-link form lands in M1.
 * This exists so the design system (type, color, marks) is verifiable today.
 */
export default function Home() {
  return (
    <main className="min-h-screen bg-background px-6 py-16 md:px-12 md:py-24">
      <div className="mx-auto flex max-w-5xl flex-col gap-16">
        <header className="flex items-baseline justify-between border-b border-hairline pb-4">
          <span className="mono-tag text-foreground">Kadence</span>
          <span className="label">[ index ] · 00</span>
        </header>

        <section className="flex flex-col gap-8">
          <span className="label">
            Editorial cycling-analytics for one rider
          </span>
          <h1 className="display max-w-3xl text-foreground">
            An archive, <em>not</em> a network.
          </h1>
          <p className="max-w-xl font-sans text-[19px] leading-relaxed text-muted-foreground">
            Upload a <span className="mono-tag">.gpx</span>. Read your ride as a
            dashboard — map, elevation, splits, climbs, charts. Private by
            default. No feed, no followers, no leaderboards.
          </p>
        </section>

        <footer className="flex flex-wrap gap-6 border-t border-hairline pt-4">
          {["Map", "Elevation", "Splits", "Climbs", "Trends", "Goals"].map(
            (item, i) => (
              <span key={item} className="label">
                [ {String(i + 1).padStart(2, "0")} ] {item}
              </span>
            ),
          )}
        </footer>
      </div>
    </main>
  );
}
