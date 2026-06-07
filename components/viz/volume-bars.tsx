"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeekVolume } from "@/lib/db/queries";
import { metersToKm, metersToMiles, type UnitSystem } from "@/lib/units";
import { palette } from "@/lib/tokens";

/** Weekly distance bars; the most recent week is crimson. */
export function VolumeBars({
  weeks,
  units,
  height = 160,
}: {
  weeks: WeekVolume[];
  units: UnitSystem;
  height?: number;
}) {
  const unit = units === "imperial" ? "mi" : "km";
  const data = weeks.map((w) => ({
    week: w.weekStart,
    v:
      units === "imperial"
        ? metersToMiles(w.distanceM)
        : metersToKm(w.distanceM),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <XAxis dataKey="week" hide />
        <YAxis hide />
        <Tooltip
          cursor={{ fill: "hsl(var(--bone-2))" }}
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--hairline))",
            borderRadius: 4,
            fontSize: 12,
          }}
          labelFormatter={(w) =>
            new Date(w as string).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              timeZone: "UTC",
            })
          }
          formatter={(v: number) => [`${v.toFixed(1)} ${unit}`, "Distance"]}
        />
        <Bar dataKey="v" radius={[2, 2, 0, 0]} isAnimationActive={false}>
          {data.map((_, i) => (
            <Cell
              key={i}
              fill={i === data.length - 1 ? palette.crimson : palette.ink}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
