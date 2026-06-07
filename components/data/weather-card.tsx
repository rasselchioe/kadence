import type { WeatherData } from "@/lib/weather";
import { kmToMiles, type UnitSystem } from "@/lib/units";

const DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const windDir = (deg: number | null) =>
  deg == null ? "" : DIRS[Math.round(deg / 45) % 8];

export function WeatherCard({
  weather,
  units,
}: {
  weather: WeatherData;
  units: UnitSystem;
}) {
  const imperial = units === "imperial";
  const stats: { label: string; value: string }[] = [];

  if (weather.tempC != null) {
    stats.push({
      label: "Temp",
      value: imperial
        ? `${Math.round((weather.tempC * 9) / 5 + 32)}°F`
        : `${Math.round(weather.tempC)}°C`,
    });
  }
  if (weather.windKmh != null) {
    const v = imperial ? kmToMiles(weather.windKmh) : weather.windKmh;
    stats.push({
      label: "Wind",
      value: `${Math.round(v)} ${imperial ? "mph" : "km/h"} ${windDir(
        weather.windDirDeg,
      )}`.trim(),
    });
  }
  if (weather.precipMm != null) {
    stats.push({ label: "Precip", value: `${weather.precipMm.toFixed(1)} mm` });
  }
  if (weather.cloudPct != null) {
    stats.push({ label: "Cloud", value: `${Math.round(weather.cloudPct)}%` });
  }
  if (weather.uv != null) {
    stats.push({ label: "UV", value: weather.uv.toFixed(1) });
  }
  if (stats.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-5">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex flex-col gap-1 border-t border-hairline pt-3"
        >
          <span className="label">{s.label}</span>
          <span className="tabular font-sans text-xl font-semibold text-foreground">
            {s.value}
          </span>
        </div>
      ))}
    </div>
  );
}
