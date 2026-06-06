import { describe, expect, it } from "vitest";
import { parseGpx } from "@/lib/gpx/parse";
import { loadFixture } from "./helpers";

describe("parseGpx — fixtures", () => {
  it("short.gpx: 12 km flat commute, HR + cadence, no power", async () => {
    const r = await parseGpx(loadFixture("short.gpx"));

    expect(r.points).toHaveLength(1801);
    expect(r.metrics.distanceM).toBeGreaterThan(11_800);
    expect(r.metrics.distanceM).toBeLessThan(12_200);
    expect(r.metrics.elevGainM).toBeLessThan(20); // flat
    expect(r.metrics.avgSpeedMps * 3.6).toBeGreaterThan(22);
    expect(r.metrics.avgHr).toBeGreaterThan(110);
    expect(r.metrics.maxHr).toBeGreaterThanOrEqual(r.metrics.avgHr!);
    expect(r.metrics.avgCadenceRpm).toBeGreaterThan(60);
    expect(r.metrics.avgPowerW).toBeNull();
    expect(r.metrics.npW).toBeNull();

    expect(r.sourceApp).toBe("garmin");
    expect(r.suggestedName).toMatch(/ride/i);
    expect(r.startedAt).toBe("2024-03-12T07:30:00.000Z");
    expect(r.climbs).toHaveLength(0);

    expect(r.geojson.type).toBe("LineString");
    expect(r.geojson.coordinates.length).toBeGreaterThanOrEqual(2);
    // coordinates are [lon, lat]
    expect(r.geojson.coordinates[0][0]).toBeCloseTo(-122.67, 1);
  });

  it("hilly.gpx: 31 km, 3 climbs, top-level power", async () => {
    const r = await parseGpx(loadFixture("hilly.gpx"));

    expect(r.points).toHaveLength(6127);
    expect(r.metrics.distanceM).toBeGreaterThan(30_000);
    expect(r.metrics.distanceM).toBeLessThan(31_500);
    expect(r.metrics.elevGainM).toBeGreaterThan(800);
    expect(r.metrics.elevLossM).toBeGreaterThan(300);
    expect(r.metrics.avgPowerW!).toBeGreaterThan(150);
    expect(r.metrics.npW!).toBeGreaterThanOrEqual(r.metrics.avgPowerW!);
    expect(r.metrics.maxSpeedMps).toBeGreaterThan(r.metrics.avgSpeedMps);
    expect(r.sourceApp).toBe("wahoo");
    expect(r.climbs).toHaveLength(3);
  });

  it("long.gpx: ~96 km, power via extension, 3 s sampling", async () => {
    const r = await parseGpx(loadFixture("long.gpx"));

    expect(r.metrics.distanceM).toBeGreaterThan(94_000);
    expect(r.metrics.distanceM).toBeLessThan(97_000);
    expect(r.metrics.avgPowerW!).toBeGreaterThan(120);
    expect(r.metrics.avgCadenceRpm!).toBeGreaterThan(60);
    expect(r.sourceApp).toBe("strava");
    expect(r.splits).toHaveLength(96);
  });

  it("start/end coordinates are populated", async () => {
    const r = await parseGpx(loadFixture("hilly.gpx"));
    const { startLat, startLng, endLat } = r.metrics;
    expect(Math.abs(startLat)).toBeGreaterThan(0);
    expect(Math.abs(startLng)).toBeGreaterThan(0);
    expect(startLat).not.toBe(endLat);
  });
});
