import { describe, expect, it } from "vitest";
import { parseGpx } from "@/lib/gpx/parse";
import { loadFixture } from "./helpers";

describe("computeSplits", () => {
  it("hilly.gpx produces one split per kilometre", async () => {
    const r = await parseGpx(loadFixture("hilly.gpx"));
    expect(r.splits).toHaveLength(31); // ceil(30.97)
    expect(r.splits[0].km).toBe(1);
    expect(r.splits.at(-1)!.km).toBe(31);
  });

  it("first split duration roughly matches distance ÷ speed", async () => {
    const r = await parseGpx(loadFixture("short.gpx"));
    // 1 km at 24 km/h ≈ 150 s
    expect(r.splits[0].timeS).toBeGreaterThan(140);
    expect(r.splits[0].timeS).toBeLessThan(160);
    expect(r.splits[0].paceKmh).toBeGreaterThan(22);
    expect(r.splits[0].paceKmh).toBeLessThan(26);
  });

  it("split distances sum to the total ride distance", async () => {
    const r = await parseGpx(loadFixture("hilly.gpx"));
    const sum = r.splits.reduce((acc, s) => acc + s.distanceM, 0);
    expect(Math.abs(sum - r.metrics.distanceM)).toBeLessThan(1);
  });

  it("a climbing split records elevation gain", async () => {
    const r = await parseGpx(loadFixture("hilly.gpx"));
    // km 4 sits inside climb A (3–5 km)
    const climbingSplit = r.splits.find((s) => s.km === 4)!;
    expect(climbingSplit.elevGainM).toBeGreaterThan(50);
  });
});
