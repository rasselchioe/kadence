/**
 * Minimal monochrome route sketch from [lon, lat] coordinates — an editorial
 * placeholder until the real MapLibre map lands (M4). Aspect ratio is corrected
 * for latitude so the shape isn't stretched.
 */
export function RouteSketch({ route }: { route: [number, number][] }) {
  if (route.length < 2) return null;

  const W = 440;
  const H = 320;
  const PAD = 20;

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

  const midLat = (minLat + maxLat) / 2;
  const lonScale = Math.cos((midLat * Math.PI) / 180);
  const geoW = (maxLon - minLon) * lonScale || 1e-6;
  const geoH = maxLat - minLat || 1e-6;
  const scale = Math.min((W - 2 * PAD) / geoW, (H - 2 * PAD) / geoH);
  const offX = (W - geoW * scale) / 2;
  const offY = (H - geoH * scale) / 2;

  const sx = (lon: number) => offX + (lon - minLon) * lonScale * scale;
  const sy = (lat: number) => H - (offY + (lat - minLat) * scale);

  const d = route
    .map(
      ([lon, lat], i) =>
        `${i ? "L" : "M"}${sx(lon).toFixed(1)} ${sy(lat).toFixed(1)}`,
    )
    .join(" ");

  const [startLon, startLat] = route[0];
  const [endLon, endLat] = route[route.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-full w-full text-ink"
      role="img"
      aria-label="Route shape"
    >
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={sx(startLon)}
        cy={sy(startLat)}
        r={5}
        className="fill-field"
      />
      <circle cx={sx(endLon)} cy={sy(endLat)} r={5} className="fill-crimson" />
    </svg>
  );
}
