import type { RideMetrics, TrackPoint } from "./schema";
import { rollingTimeAverage } from "./smoothing";

/** Speeds at or below this (m/s ≈ 1.8 km/h) count as stopped. */
export const MOVING_SPEED_MPS = 0.5;
/** Elevation deltas larger than this between points are GPS spikes (build § 8.2). */
export const ELEV_SPIKE_M = 25;

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two lat/lon points, metres. */
export function haversine(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number,
): number {
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Fill cumulative `distanceM` on each point (point 0 = 0). */
export function withCumulativeDistance(points: TrackPoint[]): void {
  let cum = 0;
  for (let i = 0; i < points.length; i++) {
    if (i > 0) {
      cum += haversine(
        points[i - 1].lat,
        points[i - 1].lon,
        points[i].lat,
        points[i].lon,
      );
    }
    points[i].distanceM = cum;
  }
}

/**
 * Fill `speedMps`. Uses Δdistance / Δtime; point 0 is 0. Negative/zero Δt
 * (paused or duplicate-ish samples) yields 0 rather than a divide-by-zero.
 */
export function withSpeed(points: TrackPoint[]): void {
  for (let i = 0; i < points.length; i++) {
    if (i === 0) {
      points[i].speedMps = 0;
      continue;
    }
    const dDist = points[i].distanceM - points[i - 1].distanceM;
    const tA = points[i - 1].time;
    const tB = points[i].time;
    const dt = tA != null && tB != null ? (tB - tA) / 1000 : 0;
    points[i].speedMps = dt > 0 ? dDist / dt : 0;
  }
}

function timeWeightedAverage(
  points: TrackPoint[],
  pick: (p: TrackPoint) => number | null,
  movingOnly: boolean,
): number | null {
  let num = 0;
  let den = 0;
  for (let i = 1; i < points.length; i++) {
    const tA = points[i - 1].time;
    const tB = points[i].time;
    if (tA == null || tB == null) continue;
    const dt = (tB - tA) / 1000;
    if (dt <= 0) continue;
    if (movingOnly && points[i].speedMps <= MOVING_SPEED_MPS) continue;
    const v = pick(points[i]);
    if (v == null) continue;
    num += v * dt;
    den += dt;
  }
  return den > 0 ? num / den : null;
}

function maxOf(points: TrackPoint[], pick: (p: TrackPoint) => number | null) {
  let max: number | null = null;
  for (const p of points) {
    const v = pick(p);
    if (v != null && (max == null || v > max)) max = v;
  }
  return max;
}

/** Cumulative elevation gain/loss from the smoothed series, spike-rejected. */
export function elevationGainLoss(points: TrackPoint[]): {
  gain: number;
  loss: number;
} {
  let gain = 0;
  let loss = 0;
  let prev: number | null = null;
  for (const p of points) {
    const e = p.eleSmoothed;
    if (e == null) continue;
    if (prev != null) {
      const d = e - prev;
      if (Math.abs(d) <= ELEV_SPIKE_M) {
        if (d > 0) gain += d;
        else loss += -d;
      }
    }
    prev = e;
  }
  return { gain, loss };
}

/** Normalized Power: 30 s rolling average, ⁴, mean, ^¼ (build spec § 8.2). */
export function normalizedPower(points: TrackPoint[]): number | null {
  const hasPower = points.some((p) => p.power != null);
  if (!hasPower) return null;
  const rolled = rollingTimeAverage(
    points.map((p) => p.power),
    points.map((p) => p.time),
    30,
  );
  let sum = 0;
  let count = 0;
  for (const v of rolled) {
    if (v == null) continue;
    sum += v ** 4;
    count += 1;
  }
  if (count === 0) return null;
  return Math.round((sum / count) ** 0.25);
}

export function computeMetrics(points: TrackPoint[]): RideMetrics {
  const first = points[0];
  const last = points[points.length - 1];

  const distanceM = last.distanceM;

  const elapsedS =
    first.time != null && last.time != null
      ? (last.time - first.time) / 1000
      : 0;

  let movingS = 0;
  for (let i = 1; i < points.length; i++) {
    const tA = points[i - 1].time;
    const tB = points[i].time;
    if (tA == null || tB == null) continue;
    const dt = (tB - tA) / 1000;
    if (dt > 0 && points[i].speedMps > MOVING_SPEED_MPS) movingS += dt;
  }

  const { gain, loss } = elevationGainLoss(points);

  const avgSpeedMps = movingS > 0 ? distanceM / movingS : 0;

  const rollingSpeed = rollingTimeAverage(
    points.map((p) => p.speedMps),
    points.map((p) => p.time),
    5,
  );
  const maxSpeedMps = Math.max(0, ...rollingSpeed.filter((v) => v != null));

  const avgHr = timeWeightedAverage(points, (p) => p.hr, true);
  const avgPowerW = timeWeightedAverage(points, (p) => p.power, true);
  const avgCadenceRpm = timeWeightedAverage(points, (p) => p.cad, true);

  const round = (v: number | null) => (v == null ? null : Math.round(v));

  return {
    distanceM,
    elapsedS: Math.round(elapsedS),
    movingS: Math.round(movingS),
    elevGainM: gain,
    elevLossM: loss,
    avgSpeedMps,
    maxSpeedMps,
    avgHr: round(avgHr),
    maxHr: round(maxOf(points, (p) => p.hr)),
    avgPowerW: round(avgPowerW),
    npW: normalizedPower(points),
    avgCadenceRpm: round(avgCadenceRpm),
    startLat: first.lat,
    startLng: first.lon,
    endLat: last.lat,
    endLng: last.lon,
  };
}
