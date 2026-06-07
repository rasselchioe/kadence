"use client";

import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/rides": "Rides",
  "/upload": "Upload",
};

export function TopBar() {
  const pathname = usePathname();
  const label = pathname.startsWith("/rides/")
    ? "Ride"
    : (LABELS[pathname] ?? "Archive");

  return (
    <header className="flex items-center justify-between border-b border-hairline px-6 py-3 md:px-10">
      <span className="label">
        Kadence <span className="text-muted-foreground">/ {label}</span>
      </span>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <form action="/auth/sign-out" method="post">
          <button
            type="submit"
            className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-crimson"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
