import type { Split } from "@/lib/gpx/schema";
import { fmtDuration } from "@/lib/units";
import { cn } from "@/lib/utils";

/** Per-kilometre splits with a pace bar normalized to the fastest split. */
export function SplitsTable({
  splits,
  highlightKm,
}: {
  splits: Split[];
  highlightKm?: number | null;
}) {
  if (splits.length === 0) return null;
  const maxPace = Math.max(...splits.map((s) => s.paceKmh));

  return (
    <div className="overflow-hidden">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink text-left">
            <th className="label py-2 font-normal">Km</th>
            <th className="label py-2 font-normal">Time</th>
            <th className="label py-2 font-normal">Pace</th>
            <th className="label hidden py-2 font-normal sm:table-cell">
              + Elev
            </th>
            <th className="label hidden py-2 text-right font-normal sm:table-cell">
              HR
            </th>
            <th className="label py-2 text-right font-normal">Power</th>
          </tr>
        </thead>
        <tbody>
          {splits.map((s) => (
            <tr
              key={s.km}
              className={cn(
                "border-b border-hairline transition-colors",
                highlightKm === s.km && "bg-bone-2",
              )}
            >
              <td className="tabular py-2 font-mono">
                {String(s.km).padStart(2, "0")}
              </td>
              <td className="tabular py-2">{fmtDuration(s.timeS)}</td>
              <td className="py-2">
                <div className="flex items-center gap-2">
                  <span className="tabular w-14">{s.paceKmh.toFixed(1)}</span>
                  <span
                    className="hidden h-1.5 bg-crimson md:inline-block"
                    style={{
                      width: `${Math.max(4, (s.paceKmh / maxPace) * 88)}px`,
                    }}
                  />
                </div>
              </td>
              <td className="tabular hidden py-2 sm:table-cell">
                {s.elevGainM > 0 ? `${Math.round(s.elevGainM)} m` : "—"}
              </td>
              <td className="tabular hidden py-2 text-right sm:table-cell">
                {s.avgHr ?? "—"}
              </td>
              <td className="tabular py-2 text-right">
                {s.avgPowerW != null ? `${s.avgPowerW} W` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
