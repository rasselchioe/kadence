import { describe, expect, it } from "vitest";
import {
  computeMetrics,
  elevationGainLoss,
  haversine,
  normalizedPower,
  withCumulativeDistance,
  withSpeed,
} from "@/lib/gpx/metrics";
import type { TrackPoint } from "@/lib/gpx/schema";

function pt(partial: Partial<TrackPoint>): TrackPoint {
  return {
    lat: 0,
    lon: 0,
    ele: null,
    eleSmoothed: null,
    time: null,
    hr: null,
    cad: null,
    power: null,
    distanceM: 0,
    speedMps: 0,
    ...partial,
  };
}

describe("haversine", () => {
  it("≈ 111 km per degree of latitude", () => {
    const d = haversine(0, 0, 1, 0);
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });

  it("is zero for identical points", () => {
    expect(haversine(45, -122, 45, -122)).toBe(0);
  });
});

describe("elevationGainLoss — GPS spike rejection", () => {
  it("ignores a single +100 m spike (and its return)", () => {
    const eles = [100, 101, 102, 202, 103, 104];
    const points = eles.map((e, i) =>
      pt({ eleSmoothed: e, distanceM: i * 10 }),
    );
    const { gain, loss } = elevationGainLoss(points);
    expect(gain).toBe(3); // 1 + 1 + 1, the ±100 m jumps are rejected
    expect(loss).toBe(0);
  });

  it("counts gentle changes under the 25 m threshold", () => {
    const eles = [100, 110, 120, 110, 100];
    const points = eles.map((e, i) =>
      pt({ eleSmoothed: e, distanceM: i * 100 }),
    );
    const { gain, loss } = elevationGainLoss(points);
    expect(gain).toBe(20);
    expect(loss).toBe(20);
  });
});

describe("normalizedPower", () => {
  it("equals steady power for a constant effort", () => {
    const points = Array.from({ length: 120 }, (_, i) =>
      pt({ power: 200, time: i * 1000 }),
    );
    expect(normalizedPower(points)).toBe(200);
  });

  it("is null when no point has power", () => {
    const points = Array.from({ length: 10 }, (_, i) => pt({ time: i * 1000 }));
    expect(normalizedPower(points)).toBeNull();
  });
});

describe("computeMetrics — small synthetic ride", () => {
  it("derives distance, speed, and moving time", () => {
    // Three points 0.001° of latitude apart (~111 m), 10 s apart.
    const points = [
      pt({ lat: 45.0, lon: -122, time: 0 }),
      pt({ lat: 45.001, lon: -122, time: 10_000 }),
      pt({ lat: 45.002, lon: -122, time: 20_000 }),
    ];
    withCumulativeDistance(points);
    withSpeed(points);
    const m = computeMetrics(points);

    expect(m.distanceM).toBeGreaterThan(200);
    expect(m.distanceM).toBeLessThan(230);
    expect(m.elapsedS).toBe(20);
    expect(m.movingS).toBeGreaterThan(0);
    expect(m.avgSpeedMps).toBeGreaterThan(5); // ~11 m/s
    expect(m.startLat).toBe(45.0);
    expect(m.endLat).toBe(45.002);
  });
});
