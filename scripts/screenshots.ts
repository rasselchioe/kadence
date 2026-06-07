/**
 * Capture README screenshots with headless Chromium against a running dev
 * server (`pnpm dev`). Output: docs/screenshots/*.png.
 *
 *   pnpm dev            # in one terminal
 *   pnpm shots          # in another
 *
 * Uses only the public landing + /upload demo, so no auth is needed.
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.env.SHOTS_BASE ?? "http://localhost:3000";
const OUT = "docs/screenshots";
mkdirSync(OUT, { recursive: true });

async function main() {
  const browser = await chromium.launch({
    args: ["--enable-unsafe-swiftshader", "--use-gl=angle"],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  const settle = (ms: number) => page.waitForTimeout(ms);

  // 1. Landing (light)
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await settle(800);
  await page.screenshot({ path: `${OUT}/landing.png` });
  console.log("✓ landing.png");

  // 2. Landing (night)
  await page.evaluate(() => localStorage.setItem("kadence-theme", "night"));
  await page.reload({ waitUntil: "networkidle" });
  await settle(600);
  await page.screenshot({ path: `${OUT}/landing-dark.png` });
  await page.evaluate(() => localStorage.setItem("kadence-theme", "light"));
  console.log("✓ landing-dark.png");

  // 3. Upload — idle dropzone
  await page.goto(`${BASE}/upload`, { waitUntil: "networkidle" });
  await settle(500);
  await page.screenshot({ path: `${OUT}/upload.png` });
  console.log("✓ upload.png");

  // 4. Activity — load the sample ride, wait for the map + charts
  await page.getByRole("button", { name: /load a sample ride/i }).click();
  await page.waitForSelector("canvas", { timeout: 30000 }).catch(() => {});
  await settle(3500); // map tiles + fonts
  await page.screenshot({ path: `${OUT}/activity.png`, fullPage: true });
  console.log("✓ activity.png");

  // 5. Activity — night
  await page.evaluate(() => document.documentElement.classList.add("night"));
  await settle(1800);
  await page.screenshot({ path: `${OUT}/activity-dark.png`, fullPage: true });
  await page.evaluate(() => document.documentElement.classList.remove("night"));
  console.log("✓ activity-dark.png");

  // 6. Upload — error state (broken fixture)
  await page.goto(`${BASE}/upload`, { waitUntil: "networkidle" });
  await page.locator('input[type="file"]').setInputFiles("fixtures/broken.gpx");
  await page
    .waitForSelector("text=NO_TRACKPOINTS", { timeout: 15000 })
    .catch(() => {});
  await settle(500);
  await page.screenshot({ path: `${OUT}/upload-error.png` });
  console.log("✓ upload-error.png");

  await browser.close();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
