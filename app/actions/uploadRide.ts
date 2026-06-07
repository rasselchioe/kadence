"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db";
import { climb, ride, rideMetric, rideTrack, split } from "@/lib/db/schema";
import { MAX_GPX_BYTES, parseGpx } from "@/lib/gpx/parse";
import { GPX_ERROR_COPY, GpxError } from "@/lib/gpx/schema";

export type UploadResult =
  | { ok: true; rideId: string }
  | { ok: false; code: string; message: string };

/**
 * Parse an uploaded GPX and persist it as a ride for the signed-in user:
 * storage blob at gpx/<userId>/<rideId>.gpx + ride/metric/track/splits/climbs
 * in one transaction. Build spec § 6.
 */
export async function uploadRide(formData: FormData): Promise<UploadResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, code: "UNAUTHENTICATED", message: "Please sign in." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return {
      ok: false,
      code: "UNSUPPORTED_MIME",
      message: GPX_ERROR_COPY.UNSUPPORTED_MIME,
    };
  }
  if (!/\.gpx$/i.test(file.name)) {
    return {
      ok: false,
      code: "UNSUPPORTED_MIME",
      message: GPX_ERROR_COPY.UNSUPPORTED_MIME,
    };
  }
  if (file.size > MAX_GPX_BYTES) {
    return { ok: false, code: "TOO_LARGE", message: GPX_ERROR_COPY.TOO_LARGE };
  }

  const buf = Buffer.from(await file.arrayBuffer());

  let parsed;
  try {
    parsed = await parseGpx(buf);
  } catch (e) {
    if (e instanceof GpxError) {
      return { ok: false, code: e.code, message: e.message };
    }
    return {
      ok: false,
      code: "INVALID_XML",
      message: GPX_ERROR_COPY.INVALID_XML,
    };
  }

  const rideId = randomUUID();
  const storagePath = `${user.id}/${rideId}.gpx`;

  const { error: uploadError } = await supabase.storage
    .from("gpx")
    .upload(storagePath, file, {
      contentType: "application/gpx+xml",
      upsert: false,
    });
  if (uploadError) {
    return {
      ok: false,
      code: "STORAGE",
      message: `Couldn't store the file: ${uploadError.message}`,
    };
  }

  try {
    const db = getDb();
    await db.transaction(async (tx) => {
      await tx.insert(ride).values({
        id: rideId,
        profileId: user.id,
        name: parsed.suggestedName,
        sportType: "cycling",
        startedAt: parsed.startedAt ? new Date(parsed.startedAt) : new Date(),
        sourceApp: parsed.sourceApp,
        gpxStoragePath: storagePath,
        routeGeojson: parsed.geojson,
      });

      await tx.insert(rideMetric).values({ rideId, ...parsed.metrics });

      await tx.insert(rideTrack).values({
        rideId,
        points: parsed.points,
        pointCount: parsed.points.length,
      });

      if (parsed.splits.length > 0) {
        await tx.insert(split).values(
          parsed.splits.map((s) => ({
            rideId,
            km: s.km,
            timeS: s.timeS,
            paceKmh: s.paceKmh,
            elevGainM: s.elevGainM,
            avgPowerW: s.avgPowerW,
            avgHr: s.avgHr,
          })),
        );
      }

      if (parsed.climbs.length > 0) {
        await tx.insert(climb).values(
          parsed.climbs.map((c) => ({
            rideId,
            startKm: c.startKm,
            endKm: c.endKm,
            lengthM: c.lengthM,
            avgGradePct: c.avgGradePct,
            category: c.category,
            peakElevM: c.peakElevM,
          })),
        );
      }
    });
  } catch (e) {
    // Roll back the orphaned blob if the DB write failed.
    await supabase.storage.from("gpx").remove([storagePath]);
    const message = e instanceof Error ? e.message : "Database write failed.";
    return { ok: false, code: "DB", message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/rides");
  return { ok: true, rideId };
}
