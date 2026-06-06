import { describe, expect, it } from "vitest";
import {
  feetToMeters,
  fmtDistance,
  fmtDuration,
  fmtElevation,
  fmtSpeed,
  kmhToMps,
  kmToMiles,
  metersToFeet,
  metersToMiles,
  milesToKm,
  mpsToKmh,
  mpsToMph,
} from "@/lib/units";

describe("unit round-trips", () => {
  it("km ↔ miles", () => {
    const km = 42.195;
    expect(milesToKm(kmToMiles(km))).toBeCloseTo(km, 9);
    expect(kmToMiles(1)).toBeCloseTo(0.621371, 5);
  });

  it("m ↔ ft", () => {
    expect(feetToMeters(metersToFeet(1000))).toBeCloseTo(1000, 9);
    expect(metersToFeet(1)).toBeCloseTo(3.28084, 4);
  });

  it("mps ↔ kmh", () => {
    expect(kmhToMps(mpsToKmh(10))).toBeCloseTo(10, 9);
    expect(mpsToKmh(10)).toBe(36);
  });

  it("mps → mph and m → mi compose correctly", () => {
    expect(mpsToMph(10)).toBeCloseTo(22.3694, 3);
    expect(metersToMiles(1609.344)).toBeCloseTo(1, 9);
  });
});

describe("formatters", () => {
  it("fmtDistance respects the unit system", () => {
    expect(fmtDistance(5000, "metric")).toBe("5 km");
    expect(fmtDistance(1609.344, "imperial")).toBe("1 mi");
  });

  it("fmtElevation respects the unit system", () => {
    expect(fmtElevation(100, "metric")).toBe("100 m");
    expect(fmtElevation(304.8, "imperial")).toBe("1000 ft");
  });

  it("fmtSpeed respects the unit system", () => {
    expect(fmtSpeed(10, "metric")).toBe("36 km/h");
  });

  it("fmtDuration formats h:mm:ss and m:ss", () => {
    expect(fmtDuration(90)).toBe("1:30");
    expect(fmtDuration(3661)).toBe("1:01:01");
    expect(fmtDuration(0)).toBe("0:00");
  });
});
