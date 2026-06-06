import { describe, expect, it } from "vitest";
import { parseGpx } from "@/lib/gpx/parse";
import { categorize } from "@/lib/gpx/climbs";
import { loadFixture } from "./helpers";

describe("detectClimbs", () => {
  it("finds the 3 climbs on hilly.gpx with expected categories", async () => {
    const r = await parseGpx(loadFixture("hilly.gpx"));

    expect(r.climbs.map((c) => c.category)).toEqual(["cat4", "cat3", "cat2"]);

    const [a, b, c] = r.climbs;
    expect(a.lengthM).toBeGreaterThan(1800);
    expect(a.avgGradePct).toBeGreaterThan(6);
    expect(b.lengthM).toBeGreaterThan(2800);
    expect(c.lengthM).toBeGreaterThan(5500);

    // ordered, non-overlapping, and gaining elevation along the ride
    expect(a.endKm).toBeLessThanOrEqual(b.startKm);
    expect(b.endKm).toBeLessThanOrEqual(c.startKm);
    expect(c.peakElevM).toBeGreaterThan(a.peakElevM);
  });

  it("short.gpx (flat) has no climbs", async () => {
    const r = await parseGpx(loadFixture("short.gpx"));
    expect(r.climbs).toHaveLength(0);
  });

  it("categorize() maps FIETS score to category", () => {
    expect(categorize(500, 4)).toBe("uncat"); // 0.08
    expect(categorize(2000, 8)).toBe("cat4"); // 1.28
    expect(categorize(3000, 9)).toBe("cat3"); // 2.43
    expect(categorize(6000, 9)).toBe("cat2"); // 4.86
    expect(categorize(8000, 9)).toBe("cat1"); // 6.48
    expect(categorize(12000, 9)).toBe("hc"); // 9.72
  });
});
