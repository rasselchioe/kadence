import { describe, expect, it } from "vitest";
import { parseGpx } from "@/lib/gpx/parse";
import { GPX_ERROR_COPY, GpxError } from "@/lib/gpx/schema";
import { errorCodeOf, loadFixture } from "./helpers";

const buf = (s: string) => Buffer.from(s, "utf8");

describe("GPX error handling", () => {
  it("broken.gpx (a route, no <trkpt>) → NO_TRACKPOINTS", async () => {
    expect(await errorCodeOf(parseGpx(loadFixture("broken.gpx")))).toBe(
      "NO_TRACKPOINTS",
    );
  });

  it("fewer than two valid points → TOO_FEW_POINTS", async () => {
    const gpx = `<gpx><trk><trkseg>
      <trkpt lat="45" lon="-122"><time>2024-01-01T00:00:00Z</time></trkpt>
    </trkseg></trk></gpx>`;
    expect(await errorCodeOf(parseGpx(buf(gpx)))).toBe("TOO_FEW_POINTS");
  });

  it("no timestamps anywhere → MISSING_TIME", async () => {
    const gpx = `<gpx><trk><trkseg>
      <trkpt lat="45" lon="-122"><ele>10</ele></trkpt>
      <trkpt lat="45.001" lon="-122"><ele>11</ele></trkpt>
    </trkseg></trk></gpx>`;
    expect(await errorCodeOf(parseGpx(buf(gpx)))).toBe("MISSING_TIME");
  });

  it("text with no GPX structure is treated as having no trackpoints", async () => {
    expect(await errorCodeOf(parseGpx(buf("not a gpx file")))).toBe(
      "NO_TRACKPOINTS",
    );
  });

  it("GpxError carries a code and human-readable copy", () => {
    const e = new GpxError("TOO_LARGE");
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe("GpxError");
    expect(e.code).toBe("TOO_LARGE");
    expect(e.message).toBe(GPX_ERROR_COPY.TOO_LARGE);
  });
});
