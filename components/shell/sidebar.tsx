"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", ix: "01" },
  { href: "/rides", label: "Rides", ix: "02" },
  { href: "/upload", label: "Upload", ix: "03" },
  { href: "/trends", label: "Trends", ix: "04" },
  { href: "/goals", label: "Goals", ix: "05" },
  { href: "/settings", label: "Settings", ix: "06" },
];

const SOON: { label: string; ix: string }[] = [];

export function Sidebar({ archiveCount }: { archiveCount: number }) {
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col gap-8 border-r border-hairline bg-bone/40 p-6">
      <Link
        href="/dashboard"
        className="font-sans text-xl font-semibold tracking-tight text-foreground"
      >
        Kadence
      </Link>

      <ul className="flex flex-col gap-1">
        {NAV.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-baseline gap-3 rounded-md px-3 py-2 font-sans text-sm transition-colors",
                  active
                    ? "bg-ink text-paper"
                    : "text-foreground hover:bg-bone-2",
                )}
              >
                <span className="font-mono text-[11px] opacity-60">
                  {item.ix}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <ul className="flex flex-col gap-1">
        {SOON.map((item) => (
          <li key={item.label}>
            <span
              aria-disabled
              className="flex cursor-not-allowed items-baseline gap-3 px-3 py-2 font-sans text-sm text-muted-foreground opacity-50"
            >
              <span className="font-mono text-[11px]">{item.ix}</span>
              {item.label}
              <span className="label ml-auto">soon</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-col gap-2 border-t border-hairline pt-4">
        <span className="label">Archive</span>
        <span className="tabular font-sans text-2xl font-semibold text-foreground">
          {archiveCount}
          <span className="ml-1 text-sm font-normal text-muted-foreground">
            {archiveCount === 1 ? "ride" : "rides"}
          </span>
        </span>
      </div>
    </nav>
  );
}
