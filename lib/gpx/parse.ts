import { XMLParser } from "fast-xml-parser";
import { lineString, simplify } from "@turf/turf";
import { computeMetrics, withCumulativeDistance, withSpeed } from "./metrics";
import { smoothElevation } from "./smoothing";
import { computeSplits } from "./splits";
import { detectClimbs } from "./climbs";
import { GpxError, type ParsedRide, type TrackPoint } from "./schema";

/** Reject elevation deltas; Douglas-Peucker tolerance for the stored route. */
const SIMPLIFY_TOLERANCE = 0.00005; // ≈ 5 m
export const MAX_GPX_BYTES = 25 * 1024 * 1024;

// ── helpers ──────────────────────────────────────────────────────────────────

type AnyNode = Record<string, unknown>;

const asArray = <T>(x: T | T[] | undefined | null): T[] =>
  Array.isArray(x) ? x : x == null ? [] : [x];

const localName = (key: string) => {
  const i = key.indexOf(":");
  return (i >= 0 ? key.slice(i + 1) : key).toLowerCase();
};

function toNum(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : null;
  }
  if (typeof v === "object" && "#text" in (v as AnyNode)) {
    return toNum((v as AnyNode)["#text"]);
  }
  return null;
}

/** Depth-first search for a numeric child whose local (un-namespaced) tag matches. */
function deepFindNumber(node: unknown, names: string[]): number | null {
  if (node == null || typeof node !== "object") return null;
  for (const [key, value] of Object.entries(node as AnyNode)) {
    if (names.includes(localName(key))) {
      const n = toNum(value);
      if (n != null) return n;
    }
    if (value && typeof value === "object") {
      const found = deepFindNumber(value, names);
      if (found != null) return found;
    }
  }
  return null;
}

function collectTrkpts(xml: AnyNode): AnyNode[] {
  const gpx = xml.gpx as AnyNode | undefined;
  if (!gpx) return [];
  const pts: AnyNode[] = [];
  for (const trk of asArray(gpx.trk as AnyNode | AnyNode[])) {
    for (const seg of asArray((trk as AnyNode).trkseg as AnyNode | AnyNode[])) {
      for (const pt of asArray((seg as AnyNode).trkpt as AnyNode | AnyNode[])) {
        pts.push(pt as AnyNode);
      }
    }
  }
  return pts;
}

function toTrackPoint(raw: AnyNode): TrackPoint {
  const lat = toNum(raw["@_lat"]);
  const lon = toNum(raw["@_lon"]);
  const ele = toNum(raw.ele);

  const rawTime = raw.time;
  const parsedTime = rawTime != null ? Date.parse(String(rawTime)) : Number.NaN;

  const ext = raw.extensions;
  const hr = deepFindNumber(ext, ["hr", "heartrate"]);
  const cad = deepFindNumber(ext, ["cad", "cadence"]);
  const power =
    deepFindNumber(ext, ["power", "powerinwatts"]) ?? toNum(raw.power);

  return {
    lat: lat ?? Number.NaN,
    lon: lon ?? Number.NaN,
    ele,
    eleSmoothed: null,
    time: Number.isFinite(parsedTime) ? parsedTime : null,
    hr,
    cad,
    power,
    distanceM: 0,
    speedMps: 0,
  };
}

/** Drop points with bad coords, no time, or a duplicate timestamp. */
function sanitize(points: TrackPoint[]): TrackPoint[] {
  const out: TrackPoint[] = [];
  let lastTime: number | null = null;
  for (const p of points) {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) continue;
    if (p.lat < -90 || p.lat > 90 || p.lon < -180 || p.lon > 180) continue;
    if (p.time == null) continue;
    if (lastTime != null && p.time === lastTime) continue;
    out.push(p);
    lastTime = p.time;
  }
  return out;
}

function sniffSource(creator: unknown): string {
  if (typeof creator !== "string") return "unknown";
  const c = creator.toLowerCase();
  if (c.includes("garmin")) return "garmin";
  if (c.includes("wahoo")) return "wahoo";
  if (c.includes("strava")) return "strava";
  if (c.includes("hammerhead") || c.includes("karoo")) return "hammerhead";
  if (c.includes("apple") || c.includes("workoutdoors")) return "apple";
  return "unknown";
}

function nameFromTime(timeMs: number | null): string {
  if (timeMs == null) return "Untitled ride";
  const d = new Date(timeMs);
  const hour = d.getUTCHours();
  const partOfDay =
    hour < 5
      ? "night"
      : hour < 12
        ? "morning"
        : hour < 17
          ? "afternoon"
          : hour < 21
            ? "evening"
            : "night";
  const weekday = d.toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
  return `${weekday} ${partOfDay} ride`;
}

function toGeojson(points: TrackPoint[]): GeoJSON.LineString {
  const coords = points.map((p) => [p.lon, p.lat]);
  const simplified = simplify(lineString(coords), {
    tolerance: SIMPLIFY_TOLERANCE,
    highQuality: false,
  });
  return simplified.geometry;
}

// ── pipeline ─────────────────────────────────────────────────────────────────

/**
 * Parse a GPX buffer into a fully-analyzed ride. Throws {@link GpxError} with a
 * specific code for the upload UI's outcome panel. Build spec § 8.
 */
export async function parseGpx(buf: Buffer): Promise<ParsedRide> {
  let xml: AnyNode;
  try {
    xml = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      parseAttributeValue: true,
    }).parse(buf.toString("utf8")) as AnyNode;
  } catch {
    throw new GpxError("INVALID_XML");
  }

  const rawPts = collectTrkpts(xml);
  if (rawPts.length === 0) throw new GpxError("NO_TRACKPOINTS");

  const points = rawPts.map(toTrackPoint);
  if (!points.some((p) => p.time != null)) throw new GpxError("MISSING_TIME");

  const clean = sanitize(points);
  if (clean.length < 2) throw new GpxError("TOO_FEW_POINTS");

  withCumulativeDistance(clean);
  withSpeed(clean);
  smoothElevation(clean, 5);

  const metrics = computeMetrics(clean);
  const splits = computeSplits(clean);
  const climbs = detectClimbs(clean);
  const geojson = toGeojson(clean);

  const gpx = xml.gpx as AnyNode | undefined;
  const sourceApp = sniffSource(gpx?.["@_creator"]);
  const startedAt =
    clean[0].time != null ? new Date(clean[0].time).toISOString() : null;

  return {
    points: clean,
    metrics,
    splits,
    climbs,
    geojson,
    sourceApp,
    suggestedName: nameFromTime(clean[0].time),
    startedAt,
  };
}
