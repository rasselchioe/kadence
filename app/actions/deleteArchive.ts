"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db";
import { ride } from "@/lib/db/schema";

/** Danger zone: delete every ride (cascades to children) + storage blobs. */
export async function deleteArchive(): Promise<{
  ok: boolean;
  deleted: number;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, deleted: 0 };

  const { data: files } = await supabase.storage.from("gpx").list(user.id);
  if (files && files.length > 0) {
    await supabase.storage
      .from("gpx")
      .remove(files.map((f) => `${user.id}/${f.name}`));
  }

  const rows = await getDb()
    .delete(ride)
    .where(eq(ride.profileId, user.id))
    .returning({ id: ride.id });

  revalidatePath("/dashboard");
  revalidatePath("/rides");
  revalidatePath("/trends");
  return { ok: true, deleted: rows.length };
}
