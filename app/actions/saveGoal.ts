"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db";
import { goal } from "@/lib/db/schema";
import { periodRange, type GoalPeriod } from "@/lib/date";

export type GoalKind = "distance" | "elevation" | "time" | "power20";

export interface NewGoalInput {
  kind: GoalKind;
  /** Target in base units: metres / metres / seconds / watts. */
  target: number;
  period: GoalPeriod;
}

export async function saveGoal(
  input: NewGoalInput,
): Promise<{ ok: boolean; goalId?: string; message?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Please sign in." };
  if (!(input.target > 0)) {
    return { ok: false, message: "Target must be greater than zero." };
  }

  const { start, end } = periodRange(input.period);
  const db = getDb();
  const [g] = await db
    .insert(goal)
    .values({
      profileId: user.id,
      kind: input.kind,
      target: input.target,
      period: input.period,
      periodStart: start,
      periodEnd: end,
    })
    .returning({ id: goal.id });

  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { ok: true, goalId: g.id };
}
