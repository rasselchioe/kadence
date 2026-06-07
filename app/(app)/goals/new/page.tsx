import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/db/queries";
import type { UnitSystem } from "@/lib/units";
import { GoalForm } from "@/components/goals/goal-form";

export const metadata: Metadata = { title: "New goal" };

export default async function NewGoalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await getProfile(user.id);
  const units = (profile?.units ?? "metric") as UnitSystem;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2 border-b border-ink pb-5">
        <Link
          href="/goals"
          className="label transition-colors hover:text-crimson"
        >
          ← Goals
        </Link>
        <h1 className="font-sans text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          New goal
        </h1>
      </header>

      <GoalForm units={units} />
    </div>
  );
}
