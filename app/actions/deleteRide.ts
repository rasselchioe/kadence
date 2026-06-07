"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db";
import { ride } from "@/lib/db/schema";

export async function deleteRide(
  rideId: string,
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Please sign in." };

  const db = getDb();
  const [owned] = await db
    .select({ path: ride.gpxStoragePath })
    .from(ride)
    .where(and(eq(ride.id, rideId), eq(ride.profileId, user.id)))
    .limit(1);
  if (!owned) return { ok: false, message: "Ride not found." };

  // Children cascade on the ride delete; remove the storage blob too.
  await supabase.storage.from("gpx").remove([owned.path]);
  await db
    .delete(ride)
    .where(and(eq(ride.id, rideId), eq(ride.profileId, user.id)));

  revalidatePath("/dashboard");
  revalidatePath("/rides");
  return { ok: true };
}
