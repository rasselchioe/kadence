import type { EffortZone } from "@/lib/db/queries";
import { palette } from "@/lib/tokens";
import { fmtDuration } from "@/lib/units";

// Cool → hot across the five zones.
const ZONE_COLORS = [
  palette.slate,
  palette.cobalt,
  palette.field,
  palette.sun,
  palette.crimson,
];

/** Moving-time share across intensity zones, as a stacked bar + legend. */
export function EffortDistribution({ zones }: { zones: EffortZone[] }) {
  const total = zones.reduce((a, z) => a + z.timeS, 0);
  if (total === 0) {
    return (
      <p className="serif text-muted-foreground">
        No effort data yet — zones appear once rides carry HR or power.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-3 w-full overflow-hidden rounded-full">
        {zones.map((z) => (
          <div
            key={z.zone}
            style={{
              width: `${z.share * 100}%`,
              background: ZONE_COLORS[z.zone - 1],
            }}
            title={`${z.label}: ${Math.round(z.share * 100)}%`}
          />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {zones.map((z) => (
          <li key={z.zone} className="flex flex-col gap-1">
            <span className="label inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 shrink-0"
                style={{ background: ZONE_COLORS[z.zone - 1] }}
              />
              {z.label}
            </span>
            <span className="tabular text-sm text-foreground">
              {Math.round(z.share * 100)}%
            </span>
            <span className="tabular text-xs text-muted-foreground">
              {fmtDuration(z.timeS)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
