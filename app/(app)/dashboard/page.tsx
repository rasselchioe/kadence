import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getRecentRides, getRideCount, getStatsSince } from "@/lib/db/queries";
import { StatGrid, type StatCardProps } from "@/components/data/stat-card";
import { RidesTable } from "@/components/data/rides-table";
import { fmtDuration } from "@/lib/units";

export const metadata: Metadata = { title: "Dashboard" };

function startOfWeekUTC(): Date {
  const d = new Date();
  const monday = (d.getUTCDay() + 6) % 7; // 0 = Monday
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - monday);
  return d;
}

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

  const [week, recent] = await Promise.all([
    getStatsSince(user.id, startOfWeekUTC()),
    getRecentRides(user.id, 5),
  ]);

  const stats: StatCardProps[] = [
    {
      label: "This week",
      value: (week.distanceM / 1000).toFixed(1),
      unit: "km",
    },
    { label: "Elevation +", value: Math.round(week.elevGainM), unit: "m" },
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

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between border-b border-ink pb-2">
          <span className="label">Recent rides</span>
          <Link
            href="/rides"
            className="label transition-colors hover:text-crimson"
          >
            All →
          </Link>
        </div>
        <RidesTable rides={recent} />
      </section>
    </div>
  );
}
