"use server";

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db";
import { ride } from "@/lib/db/schema";
import { parseGpx } from "@/lib/gpx/parse";
import { persistRide } from "@/lib/db/persist";

const FIXTURES = ["short.gpx", "hilly.gpx", "long.gpx"];

/**
 * Settings-only: wipe the user's rides and reseed a small demo set from the
 * bundled fixtures, spread over recent weeks.
 */
export async function resetDemo(): Promise<{ ok: boolean; created: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, created: 0 };

  const { data: files } = await supabase.storage.from("gpx").list(user.id);
  if (files && files.length > 0) {
    await supabase.storage
      .from("gpx")
      .remove(files.map((f) => `${user.id}/${f.name}`));
  }
  await getDb().delete(ride).where(eq(ride.profileId, user.id));

  let created = 0;
  for (let w = 0; w < 9; w++) {
    const buf = readFileSync(
      join(process.cwd(), "fixtures", FIXTURES[w % FIXTURES.length]),
    );
    const parsed = await parseGpx(buf);
    const started = new Date();
    started.setUTCDate(started.getUTCDate() - w * 7 - 2);
    parsed.startedAt = started.toISOString();

    const rideId = randomUUID();
    await persistRide({
      rideId,
      profileId: user.id,
      parsed,
      storagePath: `${user.id}/${rideId}.gpx`,
    });
    created += 1;
  }

  revalidatePath("/dashboard");
  revalidatePath("/rides");
  revalidatePath("/trends");
  return { ok: true, created };
}
