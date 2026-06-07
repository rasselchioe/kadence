/**
 * Open-Meteo archive weather, server-only. Build spec § 6, § 11.
 * Cached 24h in-memory by (lat/lng rounded to 0.01°, date, hour). The archive
 * API lags ~5 days, so very recent rides return null — handled gracefully.
 */

export interface WeatherData {
  tempC: number | null;
  windKmh: number | null;
  windDirDeg: number | null;
  precipMm: number | null;
  uv: number | null;
  cloudPct: number | null;
}

const TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { data: WeatherData | null; at: number }>();

export function weatherEnabled(): boolean {
  return process.env.KADENCE_WEATHER_ENABLED !== "false";
}

export async function fetchWeather(
  lat: number,
  lng: number,
  isoTime: string,
): Promise<WeatherData | null> {
  if (!weatherEnabled()) return null;

  const d = new Date(isoTime);
  if (Number.isNaN(d.getTime())) return null;

  const date = d.toISOString().slice(0, 10);
  const hour = d.getUTCHours();
  const rlat = Math.round(lat * 100) / 100;
  const rlng = Math.round(lng * 100) / 100;
  const key = `${rlat},${rlng},${date},${hour}`;

  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;

  try {
    const url =
      `https://archive-api.open-meteo.com/v1/archive?latitude=${rlat}&longitude=${rlng}` +
      `&start_date=${date}&end_date=${date}` +
      `&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,precipitation,cloud_cover,uv_index` +
      `&timezone=UTC`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      cache.set(key, { data: null, at: Date.now() });
      return null;
    }
    const j = (await res.json()) as { hourly?: Record<string, unknown[]> };
    const h = j.hourly;
    if (!h || !Array.isArray(h.time)) {
      cache.set(key, { data: null, at: Date.now() });
      return null;
    }
    const i = Math.min(hour, h.time.length - 1);
    const num = (arr: unknown[] | undefined): number | null => {
      const v = arr?.[i];
      return typeof v === "number" ? v : null;
    };
    const data: WeatherData = {
      tempC: num(h.temperature_2m),
      windKmh: num(h.wind_speed_10m),
      windDirDeg: num(h.wind_direction_10m),
      precipMm: num(h.precipitation),
      uv: num(h.uv_index),
      cloudPct: num(h.cloud_cover),
    };
    const result = Object.values(data).some((v) => v != null) ? data : null;
    cache.set(key, { data: result, at: Date.now() });
    return result;
  } catch {
    return null;
  }
}
