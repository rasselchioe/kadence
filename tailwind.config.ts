import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

/**
 * Kadence design tokens — mirrors `lib/tokens.ts` and the Design Spec § 03–05.
 *
 * Colors are exposed two ways:
 *  1. shadcn/ui semantic roles (`background`, `foreground`, `primary`, …) driven
 *     by HSL CSS variables so components re-skin cleanly in `.night` mode.
 *  2. Named editorial hues (`crimson`, `cobalt`, `field`, …) for charts + marks.
 *
 * Dark mode is the `.night` class on <body> (Design Spec § 03-B).
 */
const config: Config = {
  darkMode: ["class", ".night"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1280px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Editorial palette (Design Spec § 03). Constant across themes.
        paper: "hsl(var(--paper))",
        bone: {
          DEFAULT: "hsl(var(--bone))",
          2: "hsl(var(--bone-2))",
        },
        ink: "hsl(var(--ink))",
        carbon: "hsl(var(--carbon))",
        hairline: "hsl(var(--hairline))",
        crimson: {
          DEFAULT: "hsl(var(--crimson))",
          ink: "hsl(var(--crimson-ink))",
        },
        cobalt: "hsl(var(--cobalt))",
        field: "hsl(var(--field))",
        slate: "hsl(var(--slate))",
        sun: "hsl(var(--sun))",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Times New Roman", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        card: "var(--r-card)",
        pill: "var(--r-pill)",
      },
      letterSpacing: {
        label: "0.08em",
        mono: "0.06em",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "draw-on": {
          from: { strokeDashoffset: "var(--dash-len, 1)" },
          to: { strokeDashoffset: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "draw-on": "draw-on 1.2s ease-out forwards",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
