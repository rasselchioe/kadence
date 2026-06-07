import Link from "next/link";
import type { BestEffort } from "@/lib/db/queries";
import {
  fmtDistance,
  fmtDuration,
  fmtElevation,
  fmtSpeed,
  type UnitSystem,
} from "@/lib/units";

function format(effort: BestEffort, units: UnitSystem): string {
  switch (effort.metric) {
    case "distance":
      return fmtDistance(effort.value, units);
    case "elevation":
      return fmtElevation(effort.value, units);
    case "time":
      return fmtDuration(effort.value);
    case "speed":
      return fmtSpeed(effort.value, units);
    case "power":
      return `${Math.round(effort.value)} W`;
  }
}

export function BestEffortCard({
  effort,
  units,
}: {
  effort: BestEffort;
  units: UnitSystem;
}) {
  return (
    <Link
      href={`/rides/${effort.rideId}`}
      className="group flex flex-col gap-2 border-t border-hairline pt-3"
    >
      <span className="label">{effort.kind}</span>
      <span className="tabular font-sans text-2xl font-semibold leading-none text-foreground group-hover:text-crimson">
        {format(effort, units)}
      </span>
      <span className="truncate text-sm text-muted-foreground">
        {effort.rideName}
      </span>
    </Link>
  );
}
