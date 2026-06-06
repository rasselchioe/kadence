import type { ClimbCategory } from "@/lib/gpx/schema";
import type { PreviewRide } from "@/lib/gpx/preview";
import { climbCategoryColor } from "@/lib/tokens";
import { fmtDuration } from "@/lib/units";
import { StatGrid, type StatCardProps } from "@/components/data/stat-card";
import { SplitsTable } from "@/components/data/splits-table";
import { RouteSketch } from "@/components/viz/route-sketch";
import { ElevationProfile } from "@/components/viz/elevation-profile";

const CATEGORY_LABEL: Record<ClimbCategory, string> = {
  hc: "HC",
  cat1: "Cat 1",
  cat2: "Cat 2",
  cat3: "Cat 3",
  cat4: "Cat 4",
  uncat: "Uncat",
};

function Frame({
  ix,
  title,
  children,
}: {
  ix: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline gap-3 border-b border-ink pb-2">
        <span className="label">[ {ix} ]</span>
        <h2 className="font-sans text-lg font-semibold text-foreground">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

export function ResultsView({ ride }: { ride: PreviewRide }) {
  const m = ride.metrics;

  const started = ride.startedAt
    ? new Date(ride.startedAt).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Unknown date";

  const stats: StatCardProps[] = [
    { label: "Distance", value: (m.distanceM / 1000).toFixed(1), unit: "km" },
    { label: "Moving", value: fmtDuration(m.movingS) },
    { label: "Elevation +", value: Math.round(m.elevGainM), unit: "m" },
    {
      label: "Avg speed",
      value: (m.avgSpeedMps * 3.6).toFixed(1),
      unit: "km/h",
    },
    {
      label: "Max speed",
      value: (m.maxSpeedMps * 3.6).toFixed(1),
      unit: "km/h",
    },
  ];
  if (m.avgHr != null)
    stats.push({ label: "Avg HR", value: m.avgHr, unit: "bpm" });
  if (m.avgPowerW != null)
    stats.push({ label: "Avg power", value: m.avgPowerW, unit: "W" });
  if (m.npW != null)
    stats.push({ label: "Norm. power", value: m.npW, unit: "W" });
  if (m.avgCadenceRpm != null)
    stats.push({ label: "Avg cadence", value: m.avgCadenceRpm, unit: "rpm" });

  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col gap-3 border-b border-ink pb-5">
        <span className="label">
          Parsed · {ride.pointCount.toLocaleString()} points
        </span>
        <h1 className="font-sans text-4xl font-semibold leading-none tracking-tight text-foreground md:text-5xl">
          {ride.suggestedName}
        </h1>
        <p className="serif text-lg text-muted-foreground">
          {started} · {ride.sourceApp} · {ride.fileName}
        </p>
      </header>

      <StatGrid stats={stats} />

      <div className="grid gap-10 lg:grid-cols-[3fr_2fr]">
        <Frame ix="01" title="Elevation · climbs detected">
          <div className="aspect-[18/5] w-full">
            <ElevationProfile elevation={ride.elevation} climbs={ride.climbs} />
          </div>
        </Frame>
        <Frame ix="02" title="Route">
          <div className="aspect-[11/8] w-full rounded-card border border-hairline bg-bone/40">
            <RouteSketch route={ride.route} />
          </div>
        </Frame>
      </div>

      {ride.climbs.length > 0 && (
        <Frame ix="03" title={`Climbs · ${ride.climbs.length}`}>
          <ul className="flex flex-col">
            {ride.climbs.map((c, i) => (
              <li
                key={i}
                className="flex items-center justify-between border-t border-hairline py-3 last:border-b"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="inline-block h-3 w-3 shrink-0"
                    style={{ background: climbCategoryColor[c.category] }}
                  />
                  <span className="mono-tag text-foreground">
                    {CATEGORY_LABEL[c.category]}
                  </span>
                  <span className="serif text-muted-foreground">
                    {c.startKm.toFixed(1)}–{c.endKm.toFixed(1)} km
                  </span>
                </div>
                <div className="tabular flex gap-5 text-sm text-foreground sm:gap-8">
                  <span>{(c.lengthM / 1000).toFixed(1)} km</span>
                  <span>{c.avgGradePct.toFixed(1)}%</span>
                  <span className="hidden sm:inline">
                    {Math.round(c.peakElevM)} m
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Frame>
      )}

      <Frame ix="04" title="Splits">
        <SplitsTable splits={ride.splits} />
      </Frame>
    </div>
  );
}
