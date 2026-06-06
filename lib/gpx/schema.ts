import { z } from "zod";

/**
 * Zod shape of a raw `<trkpt>` after `fast-xml-parser` (attributes prefixed
 * `@_`). This documents the *expected* input; `parse.ts` reads tolerantly so a
 * messy real-world GPX still imports. Build spec § 8.
 */
export const TrkPtSchema = z.object({
  "@_lat": z.coerce.number(),
  "@_lon": z.coerce.number(),
  ele: z.coerce.number().optional(),
  time: z.string().optional(), // ISO 8601
  extensions: z
    .object({
      "gpxtpx:TrackPointExtension": z
        .object({
          "gpxtpx:hr": z.coerce.number().optional(),
          "gpxtpx:cad": z.coerce.number().optional(),
        })
        .partial()
        .optional(),
      power: z.coerce.number().optional(),
    })
    .partial()
    .optional(),
});

export type RawTrkPt = z.infer<typeof TrkPtSchema>;

/** Normalized, analysis-ready trackpoint. Stored as JSONB per ride. */
export interface TrackPoint {
  lat: number;
  lon: number;
  /** Raw elevation in metres, or null when the GPX has none. */
  ele: number | null;
  /** Elevation after moving-average smoothing (filled by the pipeline). */
  eleSmoothed: number | null;
  /** Epoch milliseconds, or null. */
  time: number | null;
  hr: number | null;
  cad: number | null;
  power: number | null;
  /** Cumulative distance from the start, metres. */
  distanceM: number;
  /** Instantaneous speed, m/s. */
  speedMps: number;
}

export type ClimbCategory = "hc" | "cat1" | "cat2" | "cat3" | "cat4" | "uncat";

export interface RideMetrics {
  distanceM: number;
  elapsedS: number;
  movingS: number;
  elevGainM: number;
  elevLossM: number;
  avgSpeedMps: number;
  maxSpeedMps: number;
  avgHr: number | null;
  maxHr: number | null;
  avgPowerW: number | null;
  npW: number | null;
  avgCadenceRpm: number | null;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
}

export interface Split {
  km: number;
  /** Distance covered by this split, metres (≈1000 except a partial last km). */
  distanceM: number;
  timeS: number;
  paceKmh: number;
  elevGainM: number;
  avgPowerW: number | null;
  avgHr: number | null;
}

export interface Climb {
  startKm: number;
  endKm: number;
  lengthM: number;
  avgGradePct: number;
  peakElevM: number;
  category: ClimbCategory;
}

export interface ParsedRide {
  points: TrackPoint[];
  metrics: RideMetrics;
  splits: Split[];
  climbs: Climb[];
  /** Simplified GeoJSON LineString, coordinates [lon, lat]. */
  geojson: GeoJSON.LineString;
  sourceApp: string;
  suggestedName: string;
  /** ISO start timestamp, or null when the GPX is timeless. */
  startedAt: string | null;
}

export type GpxErrorCode =
  | "NO_TRACKPOINTS" // <trkpt> count = 0 (route file, not an activity)
  | "TOO_FEW_POINTS" // < 2 valid points
  | "INVALID_XML" // parser threw
  | "MISSING_TIME" // no <time> on any point
  | "TOO_LARGE" // > 25 MB
  | "UNSUPPORTED_MIME"; // not application/gpx+xml or text/xml

/** Copy shown in the upload "[ 05 ] OUTCOMES" panel (Design Spec § 07-C). */
export const GPX_ERROR_COPY: Record<GpxErrorCode, string> = {
  NO_TRACKPOINTS:
    "This looks like a route, not a ride — it has no recorded track points.",
  TOO_FEW_POINTS: "There aren't enough valid points here to make a ride.",
  INVALID_XML: "This file isn't valid GPX — the XML couldn't be read.",
  MISSING_TIME: "This track has no timestamps, so it can't be timed.",
  TOO_LARGE: "That file is over the 25 MB limit.",
  UNSUPPORTED_MIME: "Only .gpx files are supported for now.",
};

export class GpxError extends Error {
  readonly code: GpxErrorCode;
  constructor(code: GpxErrorCode, message?: string) {
    super(message ?? GPX_ERROR_COPY[code]);
    this.name = "GpxError";
    this.code = code;
  }
}
