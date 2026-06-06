import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { GpxError, GpxErrorCode } from "@/lib/gpx/schema";

export const fixturesDir = join(process.cwd(), "fixtures");

export const loadFixture = (name: string): Buffer =>
  readFileSync(join(fixturesDir, name));

/** Resolve to the GpxError code a promise rejects with (or undefined). */
export async function errorCodeOf(
  p: Promise<unknown>,
): Promise<GpxErrorCode | undefined> {
  try {
    await p;
    return undefined;
  } catch (e) {
    return (e as GpxError).code;
  }
}
