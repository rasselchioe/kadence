/**
 * Unit conversions + formatters. The UI never formats inline — it goes through
 * these helpers (and the `useUnits()` hook, later) so the app stays unit-clean
 * (Design Spec § 09, build spec § 9).
 */

export type UnitSystem = "metric" | "imperial";

export const KM_PER_MILE = 1.609344;
export const M_PER_FOOT = 0.3048;

// ── Distance ────────────────────────────────────────────────────────────────
export const metersToKm = (m: number) => m / 1000;
export const kmToMeters = (km: number) => km * 1000;
export const kmToMiles = (km: number) => km / KM_PER_MILE;
export const milesToKm = (mi: number) => mi * KM_PER_MILE;
export const metersToMiles = (m: number) => kmToMiles(metersToKm(m));

// ── Elevation ───────────────────────────────────────────────────────────────
export const metersToFeet = (m: number) => m / M_PER_FOOT;
export const feetToMeters = (ft: number) => ft * M_PER_FOOT;

// ── Speed ───────────────────────────────────────────────────────────────────
export const mpsToKmh = (mps: number) => mps * 3.6;
export const kmhToMps = (kmh: number) => kmh / 3.6;
export const mpsToMph = (mps: number) => kmToMiles(mpsToKmh(mps));
export const mphToMps = (mph: number) => kmhToMps(milesToKm(mph));

// ── Formatters ──────────────────────────────────────────────────────────────

function round(n: number, places = 1) {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

export function fmtDistance(meters: number, units: UnitSystem): string {
  return units === "imperial"
    ? `${round(metersToMiles(meters))} mi`
    : `${round(metersToKm(meters))} km`;
}

export function fmtElevation(meters: number, units: UnitSystem): string {
  return units === "imperial"
    ? `${Math.round(metersToFeet(meters))} ft`
    : `${Math.round(meters)} m`;
}

export function fmtSpeed(mps: number, units: UnitSystem): string {
  return units === "imperial"
    ? `${round(mpsToMph(mps))} mph`
    : `${round(mpsToKmh(mps))} km/h`;
}

/** Seconds → `h:mm:ss` / `m:ss`. */
export function fmtDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = m.toString().padStart(2, "0");
  const ss = sec.toString().padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}
