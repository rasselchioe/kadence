/** UTC date helpers for weekly/period aggregations (trends, goals, dashboard). */

export function startOfWeekUTC(d: Date = new Date()): Date {
  const x = new Date(d);
  const monday = (x.getUTCDay() + 6) % 7; // 0 = Monday
  x.setUTCHours(0, 0, 0, 0);
  x.setUTCDate(x.getUTCDate() - monday);
  return x;
}

export function addWeeks(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n * 7);
  return x;
}

export function startOfMonthUTC(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function startOfYearUTC(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
}

export type GoalPeriod = "week" | "month" | "year";

/** Inclusive-start, exclusive-end range for the period containing `ref`. */
export function periodRange(
  period: GoalPeriod,
  ref: Date = new Date(),
): { start: Date; end: Date } {
  if (period === "week") {
    const start = startOfWeekUTC(ref);
    return { start, end: addWeeks(start, 1) };
  }
  if (period === "month") {
    const start = startOfMonthUTC(ref);
    return {
      start,
      end: new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + 1, 1)),
    };
  }
  const start = startOfYearUTC(ref);
  return { start, end: new Date(Date.UTC(ref.getUTCFullYear() + 1, 0, 1)) };
}
