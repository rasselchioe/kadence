import type { ParsedRide } from "@/lib/gpx/schema";
import { getDb } from "./index";
import { climb, ride, rideMetric, rideTrack, split } from "./schema";

/**
 * Persist a parsed ride + its children in one transaction. Auth-agnostic so it
 * can be exercised directly in tests; the caller supplies the owner + storage
 * path. Build spec § 6.
 */
export async function persistRide(opts: {
  rideId: string;
  profileId: string;
  parsed: ParsedRide;
  storagePath: string;
}): Promise<void> {
  const { rideId, profileId, parsed, storagePath } = opts;
  const db = getDb();

  await db.transaction(async (tx) => {
    await tx.insert(ride).values({
      id: rideId,
      profileId,
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
}
