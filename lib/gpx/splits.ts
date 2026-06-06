import { ELEV_SPIKE_M } from "./metrics";
import type { Split, TrackPoint } from "./schema";

/** Linearly interpolate the timestamp (epoch ms) at a cumulative distance. */
function timeAtDistance(points: TrackPoint[], target: number): number | null {
  if (target <= 0) return points[0].time;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (b.distanceM >= target) {
      if (a.time == null || b.time == null) return b.time ?? a.time;
      const span = b.distanceM - a.distanceM;
      if (span <= 0) return a.time;
      const frac = (target - a.distanceM) / span;
      return a.time + frac * (b.time - a.time);
    }
  }
  return points[points.length - 1].time;
}

function meanInt(values: (number | null)[]): number | null {
  let sum = 0;
  let count = 0;
  for (const v of values) {
    if (v == null) continue;
    sum += v;
    count += 1;
  }
  return count > 0 ? Math.round(sum / count) : null;
}

/**
 * Per-kilometre splits. Split `km` covers cumulative distance
 * [(km-1)·1000, km·1000); the final split may be a partial kilometre.
 * Build spec § 8.4.
 */
export function computeSplits(points: TrackPoint[]): Split[] {
  const total = points[points.length - 1]?.distanceM ?? 0;
  if (total <= 0) return [];

  const splitCount = Math.ceil(total / 1000);
  const splits: Split[] = [];

  for (let b = 0; b < splitCount; b++) {
    const startD = b * 1000;
    const endD = Math.min((b + 1) * 1000, total);
    const isLast = b === splitCount - 1;

    const tStart = timeAtDistance(points, startD);
    const tEnd = timeAtDistance(points, endD);
    const timeS = tStart != null && tEnd != null ? (tEnd - tStart) / 1000 : 0;

    const distanceM = endD - startD;
    const paceKmh = timeS > 0 ? distanceM / 1000 / (timeS / 3600) : 0;

    const inBand = points.filter((p) =>
      isLast
        ? p.distanceM >= startD && p.distanceM <= endD
        : p.distanceM >= startD && p.distanceM < endD,
    );

    let elevGainM = 0;
    let prev: number | null = null;
    for (const p of inBand) {
      const e = p.eleSmoothed;
      if (e == null) continue;
      if (prev != null) {
        const d = e - prev;
        if (Math.abs(d) <= ELEV_SPIKE_M && d > 0) elevGainM += d;
      }
      prev = e;
    }

    splits.push({
      km: b + 1,
      distanceM,
      timeS: Math.round(timeS),
      paceKmh,
      elevGainM,
      avgPowerW: meanInt(inBand.map((p) => p.power)),
      avgHr: meanInt(inBand.map((p) => p.hr)),
    });
  }

  return splits;
}
