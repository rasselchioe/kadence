import type { Climb, ParsedRide, RideMetrics, Split } from "./schema";

/** One point of the downsampled elevation profile. */
export interface ElevationSample {
  /** Cumulative distance, metres. */
  d: number;
  /** Smoothed elevation, metres. */
  e: number;
}

/**
 * Serializable, client-safe shape returned by the parse-preview endpoint. Omits
 * the full trackpoint array (too heavy to ship) in favour of a downsampled
 * elevation profile + the already-simplified route.
 */
export interface PreviewRide {
  fileName: string;
  suggestedName: string;
  sourceApp: string;
  startedAt: string | null;
  pointCount: number;
  metrics: RideMetrics;
  splits: Split[];
  climbs: Climb[];
  /** Simplified route, [lon, lat] pairs. */
  route: [number, number][];
  elevation: ElevationSample[];
}

export type PreviewResponse =
  | { ok: true; ride: PreviewRide }
  | { ok: false; code: string; message: string };

function downsample<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  const step = arr.length / max;
  const out: T[] = [];
  for (let i = 0; i < max; i++) out.push(arr[Math.floor(i * step)]);
  out.push(arr[arr.length - 1]);
  return out;
}

export function toPreview(parsed: ParsedRide, fileName: string): PreviewRide {
  const elevation = downsample(
    parsed.points.map((p) => ({
      d: p.distanceM,
      e: p.eleSmoothed ?? p.ele ?? 0,
    })),
    240,
  );

  return {
    fileName,
    suggestedName: parsed.suggestedName,
    sourceApp: parsed.sourceApp,
    startedAt: parsed.startedAt,
    pointCount: parsed.points.length,
    metrics: parsed.metrics,
    splits: parsed.splits,
    climbs: parsed.climbs,
    route: parsed.geojson.coordinates as [number, number][],
    elevation,
  };
}
