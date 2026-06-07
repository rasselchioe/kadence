import { buildSamples, coordsToBounds } from "@/lib/gpx/preview";
import type { PreviewRide } from "@/lib/gpx/preview";
import type {
  Climb,
  ClimbCategory,
  RideMetrics,
  Split,
  TrackPoint,
} from "@/lib/gpx/schema";
import { climb, ride, rideMetric, rideTrack, split } from "./schema";

/** Shape returned by {@link getRideDetail}. */
export type RideDetail = {
  ride: typeof ride.$inferSelect;
  metric: typeof rideMetric.$inferSelect | undefined;
  track: typeof rideTrack.$inferSelect | undefined;
  splits: (typeof split.$inferSelect)[];
  climbs: (typeof climb.$inferSelect)[];
};

const ZERO_METRICS: RideMetrics = {
  distanceM: 0,
  elapsedS: 0,
  movingS: 0,
  elevGainM: 0,
  elevLossM: 0,
  avgSpeedMps: 0,
  maxSpeedMps: 0,
  avgHr: null,
  maxHr: null,
  avgPowerW: null,
  npW: null,
  avgCadenceRpm: null,
  startLat: 0,
  startLng: 0,
  endLat: 0,
  endLng: 0,
};

function basename(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] || path;
}

/**
 * Maps a stored ride into the same {@link PreviewRide} shape the upload preview
 * produces, so `ActivityView` renders persisted rides verbatim.
 */
export function storedRideToView(detail: RideDetail): PreviewRide {
  const { ride: r, metric, track, splits, climbs } = detail;

  const points = (track?.points ?? []) as TrackPoint[];
  const geojson = r.routeGeojson as GeoJSON.LineString;
  const route = (geojson?.coordinates ?? []) as [number, number][];

  const metrics: RideMetrics = metric
    ? {
        distanceM: metric.distanceM,
        elapsedS: metric.elapsedS,
        movingS: metric.movingS,
        elevGainM: metric.elevGainM,
        elevLossM: metric.elevLossM,
        avgSpeedMps: metric.avgSpeedMps,
        maxSpeedMps: metric.maxSpeedMps,
        avgHr: metric.avgHr,
        maxHr: metric.maxHr,
        avgPowerW: metric.avgPowerW,
        npW: metric.npW,
        avgCadenceRpm: metric.avgCadenceRpm,
        startLat: metric.startLat,
        startLng: metric.startLng,
        endLat: metric.endLat,
        endLng: metric.endLng,
      }
    : ZERO_METRICS;

  const total = metrics.distanceM;
  const splitViews: Split[] = splits.map((s) => ({
    km: s.km,
    distanceM: Math.min(s.km * 1000, total) - (s.km - 1) * 1000,
    timeS: s.timeS,
    paceKmh: s.paceKmh,
    elevGainM: s.elevGainM,
    avgPowerW: s.avgPowerW,
    avgHr: s.avgHr,
  }));

  const climbViews: Climb[] = climbs.map((c) => ({
    startKm: c.startKm,
    endKm: c.endKm,
    lengthM: c.lengthM,
    avgGradePct: c.avgGradePct,
    peakElevM: c.peakElevM,
    category: c.category as ClimbCategory,
  }));

  return {
    fileName: basename(r.gpxStoragePath),
    suggestedName: r.name,
    sourceApp: r.sourceApp ?? "unknown",
    startedAt:
      r.startedAt instanceof Date
        ? r.startedAt.toISOString()
        : String(r.startedAt),
    pointCount: track?.pointCount ?? points.length,
    metrics,
    splits: splitViews,
    climbs: climbViews,
    route,
    samples: buildSamples(points),
    bounds: coordsToBounds(route),
    hasHr: metrics.avgHr != null,
    hasPower: metrics.avgPowerW != null,
    hasCad: metrics.avgCadenceRpm != null,
  };
}
