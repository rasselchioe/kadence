import Link from "next/link";
import {
  fmtDuration,
  metersToFeet,
  metersToKm,
  metersToMiles,
  type UnitSystem,
} from "@/lib/units";

export interface RideRow {
  id: string;
  name: string;
  startedAt: Date;
  sourceApp: string | null;
  distanceM: number;
  elevGainM: number;
  movingS: number;
  avgSpeedMps: number;
}

const fmtDate = (d: Date) =>
  new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

export function RidesTable({
  rides,
  units = "metric",
}: {
  rides: RideRow[];
  units?: UnitSystem;
}) {
  if (rides.length === 0) return null;
  const imperial = units === "imperial";

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-ink text-left">
          <th className="label py-2 font-normal">Ride</th>
          <th className="label hidden py-2 font-normal sm:table-cell">Date</th>
          <th className="label py-2 text-right font-normal">Dist</th>
          <th className="label hidden py-2 text-right font-normal sm:table-cell">
            + Elev
          </th>
          <th className="label hidden py-2 text-right font-normal md:table-cell">
            Moving
          </th>
        </tr>
      </thead>
      <tbody>
        {rides.map((r) => (
          <tr
            key={r.id}
            className="group border-b border-hairline transition-colors hover:bg-bone-2"
          >
            <td className="py-3">
              <Link href={`/rides/${r.id}`} className="flex flex-col">
                <span className="font-sans font-medium text-foreground group-hover:text-crimson">
                  {r.name}
                </span>
                <span className="label">{r.sourceApp ?? "unknown"}</span>
              </Link>
            </td>
            <td className="tabular hidden py-3 text-muted-foreground sm:table-cell">
              {fmtDate(r.startedAt)}
            </td>
            <td className="tabular py-3 text-right">
              {(imperial
                ? metersToMiles(r.distanceM)
                : metersToKm(r.distanceM)
              ).toFixed(1)}{" "}
              {imperial ? "mi" : "km"}
            </td>
            <td className="tabular hidden py-3 text-right sm:table-cell">
              {Math.round(imperial ? metersToFeet(r.elevGainM) : r.elevGainM)}{" "}
              {imperial ? "ft" : "m"}
            </td>
            <td className="tabular hidden py-3 text-right md:table-cell">
              {fmtDuration(r.movingS)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
