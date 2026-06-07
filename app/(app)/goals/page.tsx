import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getGoalsWithProgress, getProfile } from "@/lib/db/queries";
import type { UnitSystem } from "@/lib/units";
import { GoalCard } from "@/components/data/goal-card";

export const metadata: Metadata = { title: "Goals" };

export default async function GoalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await getProfile(user.id);
  const units = (profile?.units ?? "metric") as UnitSystem;
  const goals = await getGoalsWithProgress(user.id);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-center justify-between border-b border-ink pb-5">
        <h1 className="font-sans text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Goals
        </h1>
        <Link
          href="/goals/new"
          className="rounded-md bg-ink px-4 py-2 font-sans text-sm font-medium text-paper transition-colors hover:bg-crimson"
        >
          New goal
        </Link>
      </header>

      {goals.length === 0 ? (
        <div className="flex max-w-xl flex-col gap-4 border-t border-hairline pt-6">
          <p className="serif text-lg text-muted-foreground">
            No goals yet. Set a weekly, monthly, or yearly target and watch the
            dial fill.
          </p>
          <Link
            href="/goals/new"
            className="font-sans text-lg font-semibold text-foreground transition-colors hover:text-crimson"
          >
            Set your first goal →
          </Link>
        </div>
      ) : (
        <div className="grid gap-x-10 gap-y-2 md:grid-cols-2">
          {goals.map((g) => (
            <GoalCard key={g.goal.id} progress={g} units={units} />
          ))}
        </div>
      )}
    </div>
  );
}
