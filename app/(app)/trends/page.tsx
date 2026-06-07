import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  bestEfforts,
  effortDistribution,
  getProfile,
  getRideCount,
  weeklyVolume,
} from "@/lib/db/queries";
import type { UnitSystem } from "@/lib/units";
import { Section } from "@/components/data/section";
import { BestEffortCard } from "@/components/data/best-effort-card";
import { VolumeBars } from "@/components/viz/volume-bars";
import { EffortDistribution } from "@/components/viz/effort-distribution";

export const metadata: Metadata = { title: "Trends" };

export default async function TrendsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const count = await getRideCount(user.id);
  if (count === 0) {
    return (
      <div className="flex max-w-xl flex-col gap-4 border-t border-ink pt-6">
        <span className="label">No trends yet</span>
        <p className="serif text-lg text-muted-foreground">
          Trends appear once you&rsquo;ve saved a few rides.
        </p>
        <Link
          href="/upload"
          className="font-sans text-lg font-semibold text-foreground transition-colors hover:text-crimson"
        >
          Import a ride →
        </Link>
      </div>
    );
  }

  const profile = await getProfile(user.id);
  const units = (profile?.units ?? "metric") as UnitSystem;
  const [weeks, zones, best] = await Promise.all([
    weeklyVolume(user.id, 52),
    effortDistribution(
      user.id,
      profile?.maxHrBpm ?? null,
      profile?.ftpW ?? null,
    ),
    bestEfforts(user.id),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-2 border-b border-ink pb-5">
        <span className="label">Last 52 weeks</span>
        <h1 className="font-sans text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Trends
        </h1>
      </header>

      <Section ix="05" title="Distance · 52 weeks">
        <VolumeBars weeks={weeks} units={units} height={200} />
      </Section>

      <Section ix="06" title="Effort distribution">
        <EffortDistribution zones={zones} />
      </Section>

      <Section ix="07" title="Best efforts">
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-3 lg:grid-cols-5">
          {best.map((e) => (
            <BestEffortCard key={e.metric} effort={e} units={units} />
          ))}
        </div>
      </Section>
    </div>
  );
}
