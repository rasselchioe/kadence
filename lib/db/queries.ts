import { and, count, desc, eq, gte, sql, type AnyColumn } from "drizzle-orm";
import { getDb } from "./index";
import { climb, ride, rideMetric, rideTrack, split } from "./schema";

/**
 * Typed read helpers. Drizzle connects over the pooler as a privileged role and
 * BYPASSES RLS, so every query here MUST filter by the caller's `profileId`.
 * RLS stays the backstop for the supabase-js/anon path.
 */

export async function getRideCount(profileId: string): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ n: count() })
    .from(ride)
    .where(eq(ride.profileId, profileId));
  return row?.n ?? 0;
}

/** Ride row + its 1:1 metrics, for lists. */
export async function getRidesForProfile(
  profileId: string,
  limit = 50,
  offset = 0,
) {
  const db = getDb();
  return db
    .select({
      id: ride.id,
      name: ride.name,
      startedAt: ride.startedAt,
      sourceApp: ride.sourceApp,
      distanceM: rideMetric.distanceM,
      elevGainM: rideMetric.elevGainM,
      movingS: rideMetric.movingS,
      avgSpeedMps: rideMetric.avgSpeedMps,
    })
    .from(ride)
    .innerJoin(rideMetric, eq(rideMetric.rideId, ride.id))
    .where(eq(ride.profileId, profileId))
    .orderBy(desc(ride.startedAt))
    .limit(limit)
    .offset(offset);
}

export async function getRecentRides(profileId: string, n = 5) {
  return getRidesForProfile(profileId, n, 0);
}

/** Aggregate stats for rides started on/after `since` (e.g. start of week). */
export async function getStatsSince(profileId: string, since: Date) {
  const db = getDb();
  const [row] = await db
    .select({
      rides: count(),
      distanceM: sumReal(rideMetric.distanceM),
      elevGainM: sumReal(rideMetric.elevGainM),
      movingS: sumInt(rideMetric.movingS),
    })
    .from(ride)
    .innerJoin(rideMetric, eq(rideMetric.rideId, ride.id))
    .where(and(eq(ride.profileId, profileId), gte(ride.startedAt, since)));
  return {
    rides: row?.rides ?? 0,
    distanceM: Number(row?.distanceM ?? 0),
    elevGainM: Number(row?.elevGainM ?? 0),
    movingS: Number(row?.movingS ?? 0),
  };
}

/** Full ride for the detail page (authorized by profileId). Null if not owned. */
export async function getRideDetail(profileId: string, rideId: string) {
  const db = getDb();
  const [r] = await db
    .select()
    .from(ride)
    .where(and(eq(ride.id, rideId), eq(ride.profileId, profileId)))
    .limit(1);
  if (!r) return null;

  const [metric] = await db
    .select()
    .from(rideMetric)
    .where(eq(rideMetric.rideId, rideId))
    .limit(1);
  const [track] = await db
    .select()
    .from(rideTrack)
    .where(eq(rideTrack.rideId, rideId))
    .limit(1);
  const splits = await db
    .select()
    .from(split)
    .where(eq(split.rideId, rideId))
    .orderBy(split.km);
  const climbs = await db
    .select()
    .from(climb)
    .where(eq(climb.rideId, rideId))
    .orderBy(climb.startKm);

  return { ride: r, metric, track, splits, climbs };
}

// Sum helpers (drizzle returns numeric as string; call sites coerce with Number).
function sumReal(col: AnyColumn) {
  return sql<number>`coalesce(sum(${col}), 0)`;
}
function sumInt(col: AnyColumn) {
  return sql<number>`coalesce(sum(${col}), 0)`;
}
