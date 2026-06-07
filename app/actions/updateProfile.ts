"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db";
import { profile } from "@/lib/db/schema";

export interface ProfilePatch {
  units?: "metric" | "imperial";
  theme?: "light" | "night" | "auto";
  displayName?: string | null;
  ftpW?: number | null;
  maxHrBpm?: number | null;
  weatherEnabled?: boolean;
}

export async function updateProfile(
  patch: ProfilePatch,
): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  await getDb().update(profile).set(patch).where(eq(profile.id, user.id));

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/rides");
  return { ok: true };
}
