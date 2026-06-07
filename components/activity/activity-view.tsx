"use client";

import dynamic from "next/dynamic";
import type { PreviewRide } from "@/lib/gpx/preview";
import type { ClimbCategory } from "@/lib/gpx/schema";
import { chartColors, climbCategoryColor } from "@/lib/tokens";
import {
  fmtDuration,
  metersToFeet,
  metersToKm,
  metersToMiles,
  mpsToKmh,
  mpsToMph,
} from "@/lib/units";
import { useUnits } from "@/components/units-provider";
import { StatGrid, type StatCardProps } from "@/components/data/stat-card";
import { SplitsTable } from "@/components/data/splits-table";
import { MetricChart } from "@/components/viz/metric-chart";
import {
  SelectionProvider,
  useSelection,
} from "@/components/activity/selection-context";

const RouteMap = dynamic(
  () => import("@/components/map/route-map").then((m) => m.RouteMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-bone/50">
        <span className="label">loading map…</span>
      </div>
    ),
  },
);

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

export function ActivityView({ ride }: { ride: PreviewRide }) {
  return (
    <SelectionProvider>
      <ActivityBody ride={ride} />
    </SelectionProvider>
  );
}

function ActivityBody({ ride }: { ride: PreviewRide }) {
  const { index } = useSelection();
  const { units } = useUnits();
  const imperial = units === "imperial";
  const m = ride.metrics;
  const highlightKm =
    index != null ? Math.floor(ride.samples[index].d / 1000) + 1 : null;

  const started = ride.startedAt
    ? new Date(ride.startedAt).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Unknown date";

  const stats: StatCardProps[] = [
    {
      label: "Distance",
      value: (imperial
        ? metersToMiles(m.distanceM)
        : metersToKm(m.distanceM)
      ).toFixed(1),
      unit: imperial ? "mi" : "km",
    },
    { label: "Moving", value: fmtDuration(m.movingS) },
    {
      label: "Elevation +",
      value: Math.round(imperial ? metersToFeet(m.elevGainM) : m.elevGainM),
      unit: imperial ? "ft" : "m",
    },
    {
      label: "Avg speed",
      value: (imperial
        ? mpsToMph(m.avgSpeedMps)
        : mpsToKmh(m.avgSpeedMps)
      ).toFixed(1),
      unit: imperial ? "mph" : "km/h",
    },
    {
      label: "Max speed",
      value: (imperial
        ? mpsToMph(m.maxSpeedMps)
        : mpsToKmh(m.maxSpeedMps)
      ).toFixed(1),
      unit: imperial ? "mph" : "km/h",
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

      <Frame ix="01" title="Route">
        <div className="h-[340px] w-full overflow-hidden rounded-card border border-hairline md:h-[440px]">
          <RouteMap
            route={ride.route}
            samples={ride.samples}
            bounds={ride.bounds}
          />
        </div>
        <p className="label text-muted-foreground">
          Hover the map or a chart to scrub · click to pin · esc to clear
        </p>
      </Frame>

      <Frame ix="02" title="Analysis">
        <div className="flex flex-col gap-5">
          <MetricChart
            samples={ride.samples}
            dataKey="e"
            label="Elevation · climbs shaded"
            unit="m"
            color={chartColors.elevation}
            climbs={ride.climbs}
            height={150}
          />
          <MetricChart
            samples={ride.samples}
            dataKey="speed"
            label="Speed"
            unit="km/h"
            color={chartColors.speed}
            baseline="zero"
            precision={1}
          />
          {ride.hasHr && (
            <MetricChart
              samples={ride.samples}
              dataKey="hr"
              label="Heart rate"
              unit="bpm"
              color={chartColors.hr}
            />
          )}
          {ride.hasPower && (
            <MetricChart
              samples={ride.samples}
              dataKey="power"
              label="Power"
              unit="W"
              color={chartColors.power}
              baseline="zero"
            />
          )}
          {ride.hasCad && (
            <MetricChart
              samples={ride.samples}
              dataKey="cad"
              label="Cadence"
              unit="rpm"
              color={chartColors.cadence}
              baseline="zero"
            />
          )}
          <span className="label text-right text-muted-foreground">
            distance →
          </span>
        </div>
      </Frame>

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
        <SplitsTable splits={ride.splits} highlightKm={highlightKm} />
      </Frame>
    </div>
  );
}
