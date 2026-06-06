/**
 * Design tokens mirrored for JS contexts (charts, MapLibre styles) where the
 * Tailwind theme isn't reachable. Source of truth for *values* is the Design
 * Spec § 03; this file and `tailwind.config.ts` must stay in lock-step.
 */
export const palette = {
  bone: "#F8F6F1",
  bone2: "#EDE9DF",
  paper: "#FCFAF5",
  ink: "#15140F",
  carbon: "#2A2823",
  muted: "#8C8678",
  muted2: "#B3AC9D",
  hairline: "#C9C1B0",
  crimson: "#C13525",
  crimsonInk: "#8A1F12",
  cobalt: "#2748B5",
  field: "#455F2C",
  slate: "#4B5A6B",
  sun: "#D9A12B",
  night: "#100F0C",
  night2: "#1A1814",
  nightInk: "#ECE6D8",
} as const;

/** Data-viz quartet used across charts (Design Spec § 03). */
export const chartColors = {
  speed: palette.cobalt,
  hr: palette.crimson,
  power: palette.field,
  cadence: palette.sun,
  elevation: palette.slate,
} as const;

/** Climb category → fill (Design Spec § 09). */
export const climbCategoryColor: Record<string, string> = {
  hc: palette.crimsonInk,
  cat1: palette.crimson,
  cat2: palette.sun,
  cat3: palette.field,
  cat4: palette.slate,
  uncat: palette.muted2,
};

export type PaletteKey = keyof typeof palette;
