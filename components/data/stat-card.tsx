import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  className?: string;
}

/** A single figure in the editorial grid: mono label over a tabular value. */
export function StatCard({ label, value, unit, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-t border-hairline pt-3",
        className,
      )}
    >
      <span className="label">{label}</span>
      <span className="tabular font-sans text-2xl font-semibold leading-none text-foreground md:text-3xl">
        {value}
        {unit ? (
          <span className="ml-1 text-sm font-normal text-muted-foreground">
            {unit}
          </span>
        ) : null}
      </span>
    </div>
  );
}

export function StatGrid({ stats }: { stats: StatCardProps[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
      {stats.map((s) => (
        <StatCard key={s.label} {...s} />
      ))}
    </div>
  );
}
