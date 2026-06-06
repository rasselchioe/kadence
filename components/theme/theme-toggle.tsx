"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export const THEME_KEY = "kadence-theme";

/**
 * Toggles the `.night` class on <html> and persists the choice. The initial
 * class is set pre-hydration by the inline script in the root layout, so this
 * only mirrors + flips it (no flash).
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [night, setNight] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setNight(document.documentElement.classList.contains("night"));
    setMounted(true);
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("night");
    document.documentElement.classList.toggle("night", next);
    try {
      localStorage.setItem(THEME_KEY, next ? "night" : "light");
    } catch {
      // ignore unavailable storage
    }
    setNight(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={night ? "Switch to light mode" : "Switch to night mode"}
      className={[
        "inline-flex h-8 w-8 items-center justify-center rounded-md border border-hairline text-foreground transition-colors hover:bg-bone-2",
        className ?? "",
      ].join(" ")}
    >
      {/* Render a stable icon until mounted to avoid hydration mismatch. */}
      {mounted && night ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}
