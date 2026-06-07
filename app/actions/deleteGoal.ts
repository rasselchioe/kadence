"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db";
import { goal } from "@/lib/db/schema";

export async function deleteGoal(goalId: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  await getDb()
    .delete(goal)
    .where(and(eq(goal.id, goalId), eq(goal.profileId, user.id)));

  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { ok: true };
}
