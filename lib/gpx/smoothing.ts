import type { TrackPoint } from "./schema";

/**
 * Centered moving average over a numeric series, ignoring nulls. Window is the
 * total span (clamped to odd). Used to tame GPS elevation jitter before grade
 * and gain/loss are computed (build spec § 8, § 8.2).
 */
export function movingAverage(
  values: (number | null)[],
  window: number,
): (number | null)[] {
  const half = Math.floor(window / 2);
  return values.map((v, i) => {
    if (v == null) return null;
    let sum = 0;
    let count = 0;
    for (let j = i - half; j <= i + half; j++) {
      const x = values[j];
      if (j >= 0 && j < values.length && x != null) {
        sum += x;
        count += 1;
      }
    }
    return count > 0 ? sum / count : v;
  });
}

/** Fill `eleSmoothed` on each point via a moving average (default window 5). */
export function smoothElevation(points: TrackPoint[], window = 5): void {
  const smoothed = movingAverage(
    points.map((p) => p.ele),
    window,
  );
  points.forEach((p, i) => {
    p.eleSmoothed = smoothed[i];
  });
}

/**
 * Time-windowed rolling average of a per-point series, returned per point.
 * `times` are epoch ms; `seconds` is the trailing window. Used for max-speed
 * (5 s) and normalized power (30 s) so single-sample spikes don't dominate.
 */
export function rollingTimeAverage(
  values: (number | null)[],
  times: (number | null)[],
  seconds: number,
): (number | null)[] {
  const windowMs = seconds * 1000;
  const out: (number | null)[] = new Array(values.length).fill(null);
  let start = 0;
  let sum = 0;
  let count = 0;
  for (let end = 0; end < values.length; end++) {
    const v = values[end];
    if (v != null) {
      sum += v;
      count += 1;
    }
    const tEnd = times[end];
    if (tEnd == null) {
      out[end] = count > 0 ? sum / count : null;
      continue;
    }
    // Shrink the window from the left until it fits within `seconds`.
    while (start < end) {
      const tStart = times[start];
      if (tStart == null || tEnd - tStart <= windowMs) break;
      const sv = values[start];
      if (sv != null) {
        sum -= sv;
        count -= 1;
      }
      start += 1;
    }
    out[end] = count > 0 ? sum / count : null;
  }
  return out;
}
