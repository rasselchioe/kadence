import {
  and,
  count,
  desc,
  eq,
  gte,
  lt,
  sql,
  type AnyColumn,
} from "drizzle-orm";
import { addWeeks, startOfWeekUTC } from "@/lib/date";
import { rollingTimeAverage } from "@/lib/gpx/smoothing";
import type { TrackPoint } from "@/lib/gpx/schema";
import { getDb } from "./index";
import {
  climb,
  goal,
  profile,
  ride,
  rideMetric,
  rideTrack,
  split,
} from "./schema";

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

export async function getProfile(profileId: string) {
  const db = getDb();
  const [p] = await db
    .select()
    .from(profile)
    .where(eq(profile.id, profileId))
    .limit(1);
  return p ?? null;
}

export interface WeekVolume {
  weekStart: string;
  distanceM: number;
  elevGainM: number;
  rides: number;
}

/** Distance + elevation per ISO week for the last `weeks` weeks (gaps filled). */
export async function weeklyVolume(
  profileId: string,
  weeks = 52,
): Promise<WeekVolume[]> {
  const db = getDb();
  const base = startOfWeekUTC(new Date());
  const since = addWeeks(base, -(weeks - 1));

  const rows = await db
    .select({
      startedAt: ride.startedAt,
      distanceM: rideMetric.distanceM,
      elevGainM: rideMetric.elevGainM,
    })
    .from(ride)
    .innerJoin(rideMetric, eq(rideMetric.rideId, ride.id))
    .where(and(eq(ride.profileId, profileId), gte(ride.startedAt, since)));

  const byWeek = new Map<number, { d: number; e: number; n: number }>();
  for (const r of rows) {
    const key = startOfWeekUTC(new Date(r.startedAt)).getTime();
    const cur = byWeek.get(key) ?? { d: 0, e: 0, n: 0 };
    cur.d += r.distanceM;
    cur.e += r.elevGainM;
    cur.n += 1;
    byWeek.set(key, cur);
  }

  const out: WeekVolume[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const ws = addWeeks(base, -i);
    const hit = byWeek.get(ws.getTime());
    out.push({
      weekStart: ws.toISOString(),
      distanceM: hit?.d ?? 0,
      elevGainM: hit?.e ?? 0,
      rides: hit?.n ?? 0,
    });
  }
  return out;
}

export interface EffortZone {
  zone: number;
  label: string;
  timeS: number;
  share: number;
}

/** Moving-time share across 5 intensity zones (HR%max → power%FTP → speed). */
export async function effortDistribution(
  profileId: string,
  maxHr: number | null,
  ftp: number | null,
): Promise<EffortZone[]> {
  const db = getDb();
  const rows = await db
    .select({
      movingS: rideMetric.movingS,
      avgHr: rideMetric.avgHr,
      avgPowerW: rideMetric.avgPowerW,
      avgSpeedMps: rideMetric.avgSpeedMps,
    })
    .from(ride)
    .innerJoin(rideMetric, eq(rideMetric.rideId, ride.id))
    .where(eq(ride.profileId, profileId));

  const buckets = [0, 0, 0, 0, 0];
  for (const r of rows) {
    let z: number;
    if (maxHr && r.avgHr) {
      const pct = r.avgHr / maxHr;
      z = pct < 0.6 ? 0 : pct < 0.7 ? 1 : pct < 0.8 ? 2 : pct < 0.9 ? 3 : 4;
    } else if (ftp && r.avgPowerW) {
      const pct = r.avgPowerW / ftp;
      z = pct < 0.55 ? 0 : pct < 0.75 ? 1 : pct < 0.9 ? 2 : pct < 1.05 ? 3 : 4;
    } else {
      const kmh = r.avgSpeedMps * 3.6;
      z = kmh < 18 ? 0 : kmh < 24 ? 1 : kmh < 30 ? 2 : kmh < 36 ? 3 : 4;
    }
    buckets[z] += r.movingS;
  }
  const total = buckets.reduce((a, b) => a + b, 0) || 1;
  const labels = ["Recovery", "Endurance", "Tempo", "Threshold", "VO2"];
  return buckets.map((t, i) => ({
    zone: i + 1,
    label: labels[i],
    timeS: t,
    share: t / total,
  }));
}

export interface BestEffort {
  kind: string;
  metric: "distance" | "elevation" | "time" | "speed" | "power";
  value: number;
  rideId: string;
  rideName: string;
}

/** Personal records across the archive. */
export async function bestEfforts(profileId: string): Promise<BestEffort[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: ride.id,
      name: ride.name,
      distanceM: rideMetric.distanceM,
      elevGainM: rideMetric.elevGainM,
      movingS: rideMetric.movingS,
      avgSpeedMps: rideMetric.avgSpeedMps,
      npW: rideMetric.npW,
      avgPowerW: rideMetric.avgPowerW,
    })
    .from(ride)
    .innerJoin(rideMetric, eq(rideMetric.rideId, ride.id))
    .where(eq(ride.profileId, profileId));
  if (rows.length === 0) return [];

  type Row = (typeof rows)[number];
  const out: BestEffort[] = [];
  const add = (
    kind: string,
    metric: BestEffort["metric"],
    val: (r: Row) => number | null,
  ) => {
    let best: Row | null = null;
    let bestV = -Infinity;
    for (const r of rows) {
      const v = val(r);
      if (v != null && v > bestV) {
        best = r;
        bestV = v;
      }
    }
    if (best)
      out.push({
        kind,
        metric,
        value: bestV,
        rideId: best.id,
        rideName: best.name,
      });
  };

  add("Longest ride", "distance", (r) => r.distanceM);
  add("Most climbing", "elevation", (r) => r.elevGainM);
  add("Longest time", "time", (r) => r.movingS);
  add("Fastest average", "speed", (r) => r.avgSpeedMps);
  add("Best power", "power", (r) => r.npW ?? r.avgPowerW);
  return out;
}

export interface GoalProgress {
  goal: typeof goal.$inferSelect;
  current: number;
  pct: number;
}

/** Best rolling-20-minute power (W) across the user's rides in [start, end). */
async function bestTwentyMinPower(
  profileId: string,
  start: Date,
  end: Date,
): Promise<number> {
  const db = getDb();
  const tracks = await db
    .select({ points: rideTrack.points })
    .from(rideTrack)
    .innerJoin(ride, eq(ride.id, rideTrack.rideId))
    .where(
      and(
        eq(ride.profileId, profileId),
        gte(ride.startedAt, start),
        lt(ride.startedAt, end),
      ),
    );

  let best = 0;
  for (const t of tracks) {
    const pts = t.points as TrackPoint[];
    if (!pts.some((p) => p.power != null)) continue;
    const rolled = rollingTimeAverage(
      pts.map((p) => p.power),
      pts.map((p) => p.time),
      1200,
    );
    for (const v of rolled) if (v != null && v > best) best = v;
  }
  return Math.round(best);
}

/** Goals with their progress over the goal's period. */
export async function getGoalsWithProgress(
  profileId: string,
): Promise<GoalProgress[]> {
  const db = getDb();
  const goals = await db
    .select()
    .from(goal)
    .where(eq(goal.profileId, profileId))
    .orderBy(desc(goal.createdAt));

  const out: GoalProgress[] = [];
  for (const g of goals) {
    let current = 0;
    if (g.kind === "power20") {
      current = await bestTwentyMinPower(profileId, g.periodStart, g.periodEnd);
    } else {
      const col =
        g.kind === "distance"
          ? rideMetric.distanceM
          : g.kind === "elevation"
            ? rideMetric.elevGainM
            : rideMetric.movingS;
      const [row] = await db
        .select({ s: sumReal(col) })
        .from(ride)
        .innerJoin(rideMetric, eq(rideMetric.rideId, ride.id))
        .where(
          and(
            eq(ride.profileId, profileId),
            gte(ride.startedAt, g.periodStart),
            lt(ride.startedAt, g.periodEnd),
          ),
        );
      current = Number(row?.s ?? 0);
    }
    out.push({
      goal: g,
      current,
      pct: g.target > 0 ? Math.min(current / g.target, 1.5) : 0,
    });
  }
  return out;
}

// Sum helpers (drizzle returns numeric as string; call sites coerce with Number).
function sumReal(col: AnyColumn) {
  return sql<number>`coalesce(sum(${col}), 0)`;
}
function sumInt(col: AnyColumn) {
  return sql<number>`coalesce(sum(${col}), 0)`;
}
