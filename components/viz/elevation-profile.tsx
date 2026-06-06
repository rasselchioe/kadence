import type { Climb } from "@/lib/gpx/schema";
import type { ElevationSample } from "@/lib/gpx/preview";

/**
 * Elevation profile as a filled area, with detected climbs shaded in crimson
 * and their peaks marked. A static SVG precursor to the interactive Recharts
 * profile (M4–M5).
 */
export function ElevationProfile({
  elevation,
  climbs,
}: {
  elevation: ElevationSample[];
  climbs: Climb[];
}) {
  if (elevation.length < 2) {
    return (
      <p className="serif text-muted-foreground">
        No elevation was recorded for this ride.
      </p>
    );
  }

  const W = 720;
  const H = 200;
  const PAD = 24;

  const maxD = elevation[elevation.length - 1].d || 1;
  const es = elevation.map((s) => s.e);
  const minE = Math.min(...es);
  const maxE = Math.max(...es);
  const spanE = maxE - minE < 1 ? 1 : maxE - minE;

  const x = (d: number) => PAD + (d / maxD) * (W - 2 * PAD);
  const y = (e: number) => H - PAD - ((e - minE) / spanE) * (H - 2 * PAD);

  const line = elevation
    .map((s, i) => `${i ? "L" : "M"}${x(s.d).toFixed(1)} ${y(s.e).toFixed(1)}`)
    .join(" ");
  const area = `${line} L ${x(maxD).toFixed(1)} ${H - PAD} L ${x(0).toFixed(1)} ${H - PAD} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-full w-full"
      role="img"
      aria-label="Elevation profile"
    >
      <line
        x1={PAD}
        y1={H - PAD}
        x2={W - PAD}
        y2={H - PAD}
        className="stroke-hairline"
        strokeWidth={1}
      />
      {climbs.map((c, i) => (
        <rect
          key={`shade-${i}`}
          x={x(c.startKm * 1000)}
          y={PAD}
          width={Math.max(1, x(c.endKm * 1000) - x(c.startKm * 1000))}
          height={H - 2 * PAD}
          style={{ fill: "hsl(var(--crimson) / 0.10)" }}
        />
      ))}
      <path d={area} className="fill-bone-2" />
      <path d={line} fill="none" className="stroke-ink" strokeWidth={1.5} />
      {climbs.map((c, i) => (
        <circle
          key={`peak-${i}`}
          cx={x(c.endKm * 1000)}
          cy={y(c.peakElevM)}
          r={3.5}
          className="fill-crimson"
        />
      ))}
    </svg>
  );
}
