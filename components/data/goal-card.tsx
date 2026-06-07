import type { GoalProgress } from "@/lib/db/queries";
import {
  fmtDistance,
  fmtDuration,
  fmtElevation,
  type UnitSystem,
} from "@/lib/units";
import { GoalDial } from "./goal-dial";
import { DeleteGoalButton } from "./delete-goal-button";

const KIND_LABEL: Record<string, string> = {
  distance: "Distance",
  elevation: "Elevation",
  time: "Time",
  power20: "20-min power",
};

export function GoalCard({
  progress,
  units,
}: {
  progress: GoalProgress;
  units: UnitSystem;
}) {
  const { goal, current, pct } = progress;

  const fmt = (v: number) => {
    switch (goal.kind) {
      case "distance":
        return fmtDistance(v, units);
      case "elevation":
        return fmtElevation(v, units);
      case "time":
        return fmtDuration(v);
      default:
        return `${Math.round(v)} W`;
    }
  };

  return (
    <div className="flex items-center gap-5 border-t border-hairline pt-5">
      <GoalDial pct={pct} />
      <div className="flex flex-1 flex-col gap-1">
        <span className="label">
          {KIND_LABEL[goal.kind]} · this {goal.period}
        </span>
        <span className="tabular font-sans text-xl font-semibold text-foreground">
          {fmt(current)}{" "}
          <span className="font-normal text-muted-foreground">
            / {fmt(goal.target)}
          </span>
        </span>
        <div className="mt-1">
          <DeleteGoalButton goalId={goal.id} />
        </div>
      </div>
    </div>
  );
}
