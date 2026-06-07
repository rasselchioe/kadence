import { palette } from "@/lib/tokens";

/** Circular progress dial. `pct` may exceed 1 (over-target); the ring caps at 1. */
export function GoalDial({ pct, size = 116 }: { pct: number; size?: number }) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(pct, 1));
  const offset = c * (1 - clamped);
  const done = pct >= 1;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0"
      role="img"
      aria-label={`${Math.round(pct * 100)}% of goal`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="hsl(var(--hairline))"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={done ? palette.field : palette.crimson}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        className="tabular fill-foreground font-sans font-semibold"
        fontSize={size * 0.22}
      >
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}
