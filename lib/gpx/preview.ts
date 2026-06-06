import type { Climb, ParsedRide, RideMetrics, Split } from "./schema";
import { movingAverage } from "./smoothing";

/**
 * One downsampled point shared by the charts (x = distance) and the map (the
 * hover marker reads lat/lon at the same index), so a single selected index
 * links every view. Build spec § 9.
 */
export interface RideSample {
  /** Cumulative distance, metres. */
  d: number;
  /** Cumulative distance, kilometres (chart x-axis). */
  km: number;
  /** Smoothed elevation, metres. */
  e: number;
  /** Speed, km/h (lightly smoothed). */
  speed: number;
  hr: number | null;
  power: number | null;
  cad: number | null;
  lat: number;
  lon: number;
}

/**
 * Serializable, client-safe shape returned by the parse-preview endpoint. Omits
 * the full trackpoint array in favour of a downsampled sample series + the
 * already-simplified route line.
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
  /** Full simplified route, [lon, lat] pairs — drawn as the map line. */
  route: [number, number][];
  /** Downsampled series for charts + the map marker. */
  samples: RideSample[];
  /** [[minLon, minLat], [maxLon, maxLat]] for the map's fitBounds. */
  bounds: [[number, number], [number, number]];
  hasHr: boolean;
  hasPower: boolean;
  hasCad: boolean;
}

export type PreviewResponse =
  | { ok: true; ride: PreviewRide }
  | { ok: false; code: string; message: string };

const SAMPLE_TARGET = 320;

/** Evenly spaced indices including the first and last element. */
function pickEven<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr.slice();
  const out: T[] = [];
  const step = (arr.length - 1) / (max - 1);
  for (let i = 0; i < max; i++) out.push(arr[Math.round(i * step)]);
  return out;
}

export function toPreview(parsed: ParsedRide, fileName: string): PreviewRide {
  const pts = parsed.points;

  // Smooth speed a touch so the chart reads cleanly on real GPS data.
  const speeds = movingAverage(
    pts.map((p) => p.speedMps),
    5,
  );

  const samples: RideSample[] = pickEven(
    pts.map((p, i) => ({
      d: p.distanceM,
      km: p.distanceM / 1000,
      e: p.eleSmoothed ?? p.ele ?? 0,
      speed: (speeds[i] ?? p.speedMps) * 3.6,
      hr: p.hr,
      power: p.power,
      cad: p.cad,
      lat: p.lat,
      lon: p.lon,
    })),
    SAMPLE_TARGET,
  );

  const route = parsed.geojson.coordinates as [number, number][];
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const [lon, lat] of route) {
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }

  return {
    fileName,
    suggestedName: parsed.suggestedName,
    sourceApp: parsed.sourceApp,
    startedAt: parsed.startedAt,
    pointCount: pts.length,
    metrics: parsed.metrics,
    splits: parsed.splits,
    climbs: parsed.climbs,
    route,
    samples,
    bounds: [
      [minLon, minLat],
      [maxLon, maxLat],
    ],
    hasHr: parsed.metrics.avgHr != null,
    hasPower: parsed.metrics.avgPowerW != null,
    hasCad: parsed.metrics.avgCadenceRpm != null,
  };
}
