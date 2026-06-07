"use client";

import {
  Area,
  AreaChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RideSample } from "@/lib/gpx/preview";
import type { Climb } from "@/lib/gpx/schema";
import { kmToMiles, metersToFeet } from "@/lib/units";
import { useSelection } from "@/components/activity/selection-context";
import { useUnits } from "@/components/units-provider";

type MetricKey = "e" | "speed" | "hr" | "power" | "cad";

/** Recharts reports the hovered datum index on this (loosely-typed) state. */
type ChartState = { activeTooltipIndex?: number } | undefined;

export function MetricChart({
  samples,
  dataKey,
  label,
  unit,
  color,
  climbs,
  baseline = "auto",
  precision = 0,
  height = 132,
}: {
  samples: RideSample[];
  dataKey: MetricKey;
  label: string;
  unit: string;
  color: string;
  climbs?: Climb[];
  baseline?: "zero" | "auto";
  precision?: 0 | 1;
  height?: number;
}) {
  const { index, setHover, togglePin } = useSelection();
  const { units } = useUnits();
  const imperial = units === "imperial";
  const selected = index != null ? samples[index] : null;
  const selectedVal = selected ? selected[dataKey] : null;
  const gid = `grad-${dataKey}`;

  // Elevation (m) + speed (km/h) samples convert for imperial; the rest pass through.
  let readoutVal = selectedVal;
  let readoutUnit = unit;
  if (selectedVal != null && imperial) {
    if (dataKey === "e") {
      readoutVal = metersToFeet(selectedVal);
      readoutUnit = "ft";
    } else if (dataKey === "speed") {
      readoutVal = kmToMiles(selectedVal);
      readoutUnit = "mph";
    }
  }

  const onMove = (state: ChartState) => {
    if (state && typeof state.activeTooltipIndex === "number")
      setHover(state.activeTooltipIndex);
  };
  const onClick = (state: ChartState) => {
    if (state && typeof state.activeTooltipIndex === "number")
      togglePin(state.activeTooltipIndex);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="label">{label}</span>
        <span className="tabular font-mono text-xs text-foreground">
          {readoutVal != null
            ? `${Number(readoutVal).toFixed(precision)} ${readoutUnit}`
            : ""}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={samples}
          margin={{ top: 4, right: 2, bottom: 0, left: 2 }}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
          onClick={onClick}
        >
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis dataKey="km" type="number" domain={[0, "dataMax"]} hide />
          <YAxis
            domain={
              baseline === "zero" ? [0, "dataMax"] : ["dataMin", "dataMax"]
            }
            hide
          />
          {climbs?.map((c, i) => (
            <ReferenceArea
              key={i}
              x1={c.startKm}
              x2={c.endKm}
              fill="hsl(var(--crimson) / 0.10)"
              strokeOpacity={0}
            />
          ))}
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gid})`}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
          {selected != null && (
            <ReferenceLine
              x={selected.km}
              stroke={color}
              strokeDasharray="3 3"
              strokeOpacity={0.7}
            />
          )}
          <Tooltip cursor={false} content={() => null} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
