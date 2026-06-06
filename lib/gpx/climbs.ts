import type { Climb, ClimbCategory, TrackPoint } from "./schema";

export const CLIMB_MIN_LENGTH_M = 500;
export const CLIMB_MIN_GRADE_PCT = 3;
export const CLIMB_MIN_GAIN_M = 30;
/** Adjacent rising stretches closer than this (flat/descent) merge into one. */
export const CLIMB_MERGE_GAP_M = 200;

/**
 * FIETS-style difficulty score → category. score = length(km)·(grade%/10)².
 * Build spec § 8.3.
 */
export function categorize(lengthM: number, gradePct: number): ClimbCategory {
  const score = (lengthM / 1000) * (gradePct / 10) ** 2;
  if (score >= 8) return "hc";
  if (score >= 6) return "cat1";
  if (score >= 4) return "cat2";
  if (score >= 2) return "cat3";
  if (score >= 1) return "cat4";
  return "uncat";
}

/**
 * Detect climbs from the smoothed elevation series:
 *  1. find maximal rising runs,
 *  2. merge runs separated by < 200 m of flat/descent,
 *  3. keep those ≥ 500 m, ≥ 3% average grade, ≥ 30 m gain,
 *  4. categorize by FIETS score.
 */
export function detectClimbs(points: TrackPoint[]): Climb[] {
  const n = points.length;
  if (n < 2) return [];

  const dist = points.map((p) => p.distanceM);
  const ele = points.map((p) => p.eleSmoothed ?? p.ele);
  if (ele.every((e) => e == null)) return [];

  // 1. Maximal runs where every consecutive step rises.
  const runs: { s: number; e: number }[] = [];
  let start = -1;
  for (let i = 1; i < n; i++) {
    const a = ele[i - 1];
    const b = ele[i];
    const rising = a != null && b != null && b - a > 0;
    if (rising) {
      if (start < 0) start = i - 1;
    } else if (start >= 0) {
      runs.push({ s: start, e: i - 1 });
      start = -1;
    }
  }
  if (start >= 0) runs.push({ s: start, e: n - 1 });
  if (runs.length === 0) return [];

  // 2. Merge runs separated by a short gap.
  const merged: { s: number; e: number }[] = [];
  let cur = { ...runs[0] };
  for (let k = 1; k < runs.length; k++) {
    const gap = dist[runs[k].s] - dist[cur.e];
    if (gap < CLIMB_MERGE_GAP_M) {
      cur.e = runs[k].e;
    } else {
      merged.push(cur);
      cur = { ...runs[k] };
    }
  }
  merged.push(cur);

  // 3 + 4. Filter + categorize.
  const climbs: Climb[] = [];
  for (const m of merged) {
    const lengthM = dist[m.e] - dist[m.s];
    const startEle = ele[m.s];
    const endEle = ele[m.e];
    if (startEle == null || endEle == null) continue;

    const gain = endEle - startEle;
    if (lengthM < CLIMB_MIN_LENGTH_M) continue;
    if (gain < CLIMB_MIN_GAIN_M) continue;

    const avgGradePct = (gain / lengthM) * 100;
    if (avgGradePct < CLIMB_MIN_GRADE_PCT) continue;

    let peak = -Infinity;
    for (let i = m.s; i <= m.e; i++) {
      const e = ele[i];
      if (e != null && e > peak) peak = e;
    }

    climbs.push({
      startKm: dist[m.s] / 1000,
      endKm: dist[m.e] / 1000,
      lengthM,
      avgGradePct,
      peakElevM: peak,
      category: categorize(lengthM, avgGradePct),
    });
  }

  return climbs;
}
