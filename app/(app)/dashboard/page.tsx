import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  bestEfforts,
  getProfile,
  getRecentRides,
  getRideCount,
  getStatsSince,
  weeklyVolume,
} from "@/lib/db/queries";
import { startOfWeekUTC } from "@/lib/date";
import {
  fmtDuration,
  metersToFeet,
  metersToKm,
  metersToMiles,
  type UnitSystem,
} from "@/lib/units";
import { StatGrid, type StatCardProps } from "@/components/data/stat-card";
import { Section } from "@/components/data/section";
import { RidesTable } from "@/components/data/rides-table";
import { BestEffortCard } from "@/components/data/best-effort-card";
import { VolumeBars } from "@/components/viz/volume-bars";

export const metadata: Metadata = { title: "Dashboard" };

function EmptyState() {
  return (
    <div className="flex max-w-xl flex-col gap-5 border-t border-ink pt-6">
      <span className="label">No rides yet</span>
      <h1 className="display text-foreground">
        Drop your <em>first</em> GPX.
      </h1>
      <p className="serif text-lg text-muted-foreground">
        Your archive is empty. Import a ride and it lands here — map, elevation,
        splits, climbs, the lot.
      </p>
      <Link
        href="/upload"
        className="group inline-flex w-fit items-baseline gap-2 border-b border-ink pb-1 font-sans text-lg font-semibold text-foreground transition-colors hover:border-crimson hover:text-crimson"
      >
        Import a ride
        <span className="transition-transform group-hover:translate-x-1">
          →
        </span>
      </Link>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const count = await getRideCount(user.id);
  if (count === 0) return <EmptyState />;

  const profile = await getProfile(user.id);
  const units = (profile?.units ?? "metric") as UnitSystem;
  const imperial = units === "imperial";

  const [week, recent, weeks, best] = await Promise.all([
    getStatsSince(user.id, startOfWeekUTC()),
    getRecentRides(user.id, 5),
    weeklyVolume(user.id, 12),
    bestEfforts(user.id),
  ]);

  const stats: StatCardProps[] = [
    {
      label: "This week",
      value: (imperial
        ? metersToMiles(week.distanceM)
        : metersToKm(week.distanceM)
      ).toFixed(1),
      unit: imperial ? "mi" : "km",
    },
    {
      label: "Elevation +",
      value: Math.round(
        imperial ? metersToFeet(week.elevGainM) : week.elevGainM,
      ),
      unit: imperial ? "ft" : "m",
    },
    { label: "Moving", value: fmtDuration(week.movingS) },
    { label: "Rides", value: week.rides },
  ];

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-2 border-b border-ink pb-5">
        <span className="label">This week</span>
        <h1 className="font-sans text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Dashboard
        </h1>
      </header>

      <StatGrid stats={stats} />

      <Section ix="01" title="Volume · 12 weeks">
        <VolumeBars weeks={weeks} units={units} height={140} />
      </Section>

      <Section
        ix="02"
        title="Recent rides"
        action={
          <Link
            href="/rides"
            className="label transition-colors hover:text-crimson"
          >
            All →
          </Link>
        }
      >
        <RidesTable rides={recent} />
      </Section>

      {best.length > 0 && (
        <Section ix="03" title="Best efforts">
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-3 lg:grid-cols-5">
            {best.map((e) => (
              <BestEffortCard key={e.metric} effort={e} units={units} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
