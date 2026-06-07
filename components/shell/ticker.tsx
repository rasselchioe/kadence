const ITEMS = [
  "GPX-NATIVE",
  "NO LEADERBOARDS",
  "PRIVATE BY DEFAULT",
  "EDITORIAL ANALYTICS",
  "ONE RIDER",
];

/** Editorial marquee. Pauses under prefers-reduced-motion (see globals.css). */
export function Ticker() {
  const line = ITEMS.join("  ·  ");
  return (
    <div className="overflow-hidden border-b border-hairline bg-ink py-1.5 text-paper">
      <div className="ticker-track font-mono text-[11px] uppercase tracking-wider">
        <span className="px-4">{line}</span>
        <span className="px-4" aria-hidden>
          {line}
        </span>
      </div>
    </div>
  );
}
