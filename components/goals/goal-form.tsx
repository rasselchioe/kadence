"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveGoal, type GoalKind } from "@/app/actions/saveGoal";
import type { GoalPeriod } from "@/lib/date";
import { feetToMeters, milesToKm, type UnitSystem } from "@/lib/units";

const KINDS: { value: GoalKind; label: string }[] = [
  { value: "distance", label: "Distance" },
  { value: "elevation", label: "Elevation" },
  { value: "time", label: "Time" },
  { value: "power20", label: "20-min power" },
];
const PERIODS: GoalPeriod[] = ["week", "month", "year"];

const selectCls =
  "h-9 w-full rounded-md border border-hairline bg-background px-3 text-sm text-foreground";

export function GoalForm({ units }: { units: UnitSystem }) {
  const router = useRouter();
  const imperial = units === "imperial";
  const [kind, setKind] = useState<GoalKind>("distance");
  const [target, setTarget] = useState("");
  const [period, setPeriod] = useState<GoalPeriod>("week");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unitLabel =
    kind === "distance"
      ? imperial
        ? "mi"
        : "km"
      : kind === "elevation"
        ? imperial
          ? "ft"
          : "m"
        : kind === "time"
          ? "hours"
          : "watts";

  function toBase(v: number): number {
    if (kind === "distance") return (imperial ? milesToKm(v) : v) * 1000;
    if (kind === "elevation") return imperial ? feetToMeters(v) : v;
    if (kind === "time") return v * 3600;
    return v;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const v = Number(target);
    if (!(v > 0)) {
      setError("Enter a target greater than zero.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await saveGoal({ kind, target: toBase(v), period });
    if (res.ok) router.push("/goals");
    else {
      setSaving(false);
      setError(res.message ?? "Couldn't save the goal.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="goal-kind">Goal</Label>
        <select
          id="goal-kind"
          className={selectCls}
          value={kind}
          onChange={(e) => setKind(e.target.value as GoalKind)}
        >
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="goal-target">Target ({unitLabel})</Label>
        <Input
          id="goal-target"
          type="number"
          min="0"
          step="any"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="0"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="goal-period">Per</Label>
        <select
          id="goal-period"
          className={selectCls}
          value={period}
          onChange={(e) => setPeriod(e.target.value as GoalPeriod)}
        >
          {PERIODS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mono-tag text-crimson">{error}</p>}

      <div className="flex gap-3 pt-1">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Create goal"}
        </Button>
      </div>
    </form>
  );
}
