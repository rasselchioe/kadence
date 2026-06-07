/**
 * Seed a believable 52-week archive for a user.
 *
 *   pnpm seed you@example.com            # add ~80 rides over the last year
 *   pnpm seed you@example.com --reset    # wipe the user's rides first
 *   SEED_COUNT=120 pnpm seed you@…        # custom ride count
 *
 * Generates varied rides (segment-based GPX → parseGpx → persistRide), so each
 * seeded ride is a real, openable activity. Needs SUPABASE_SERVICE_ROLE_KEY +
 * DATABASE_URL in .env.local.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { parseGpx } from "../lib/gpx/parse";
import { persistRide } from "../lib/db/persist";
import { closeDb, getDb } from "../lib/db";
import { ride } from "../lib/db/schema";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  try {
    const txt = readFileSync(join(ROOT, ".env.local"), "utf8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    /* ignore */
  }
}
loadEnv();

// ── Synthetic ride generator (compact port of scripts/make-fixtures.mjs) ──────
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

const SOURCES = ["Garmin Edge 530", "Wahoo ELEMNT BOLT", "StravaGPX"];

function generateGpx(seed: number): string {
  const rand = rng(seed);
  const power = rand() < 0.5;
  const segCount = 4 + Math.floor(rand() * 4);
  const segments: { distanceM: number; gradePct: number; speedKmh: number }[] =
    [];
  for (let s = 0; s < segCount; s++) {
    const r = rand();
    if (r < 0.45)
      segments.push({
        distanceM: 1500 + rand() * 6000,
        gradePct: 0,
        speedKmh: 24 + rand() * 10,
      });
    else if (r < 0.7)
      segments.push({
        distanceM: 800 + rand() * 3500,
        gradePct: 3 + rand() * 7,
        speedKmh: 10 + rand() * 6,
      });
    else
      segments.push({
        distanceM: 800 + rand() * 3500,
        gradePct: -(3 + rand() * 6),
        speedKmh: 35 + rand() * 12,
      });
  }

  let lat = 45.4 + rand() * 0.3;
  let lon = -122.9 + rand() * 0.5;
  let ele = 60 + rand() * 200;
  let t = Date.parse("2024-01-01T08:00:00Z");
  let traveled = 0;
  const dt = 4;
  const pts: string[] = [];

  const push = (speedKmh: number, grade: number) => {
    const speed = speedKmh / 3.6;
    const hr = Math.round(
      clamp(120 + grade * 3 + speed * 0.8 + (rand() - 0.5) * 8, 95, 188),
    );
    const cad =
      speed > 0.5 ? Math.round(clamp(82 + (rand() - 0.5) * 12, 0, 110)) : 0;
    const pwr = power
      ? Math.max(0, Math.round(150 + grade * 25 + (rand() - 0.5) * 40))
      : null;
    const ext =
      `<gpxtpx:TrackPointExtension><gpxtpx:hr>${hr}</gpxtpx:hr><gpxtpx:cad>${cad}</gpxtpx:cad></gpxtpx:TrackPointExtension>` +
      (pwr != null ? `<gpxtpx:power>${pwr}</gpxtpx:power>` : "");
    pts.push(
      `<trkpt lat="${lat.toFixed(6)}" lon="${lon.toFixed(6)}"><ele>${ele.toFixed(1)}</ele><time>${new Date(t).toISOString()}</time><extensions>${ext}</extensions></trkpt>`,
    );
  };

  push(0, 0);
  for (const seg of segments) {
    const speed = seg.speedKmh / 3.6;
    let covered = 0;
    while (covered < seg.distanceM - 1e-6) {
      const step = Math.min(speed * dt, seg.distanceM - covered);
      covered += step;
      traveled += step;
      const bearing = 70 + 48 * Math.sin(traveled / 2500);
      const br = (bearing * Math.PI) / 180;
      lat += (step * Math.cos(br)) / 111320;
      lon += (step * Math.sin(br)) / (111320 * Math.cos((lat * Math.PI) / 180));
      ele += (seg.gradePct / 100) * step;
      t += dt * 1000;
      push(seg.speedKmh, seg.gradePct);
    }
  }

  const creator = SOURCES[Math.floor(rand() * SOURCES.length)];
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="${creator}" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"><trk><name>Ride</name><trkseg>` +
    pts.join("") +
    `</trkseg></trk></gpx>`
  );
}

const PART_OF_DAY = (h: number) =>
  h < 5
    ? "night"
    : h < 12
      ? "morning"
      : h < 17
        ? "afternoon"
        : h < 21
          ? "evening"
          : "night";

async function main() {
  const email =
    process.env.SEED_EMAIL ?? process.argv.find((a) => a.includes("@"));
  const reset = process.argv.includes("--reset");
  const count = Number(process.env.SEED_COUNT ?? 80);

  if (!email) {
    console.error("Usage: pnpm seed <email> [--reset]");
    process.exit(1);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
    process.exit(1);
  }

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  let userId = list.users.find((u) => u.email === email)?.id;
  if (!userId) {
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      password: `Seed-${randomUUID()}`,
    });
    if (error || !created.user) {
      throw new Error(`Couldn't create ${email}: ${error?.message}`);
    }
    userId = created.user.id;
    console.log(`Created user ${email}`);
  }

  const db = getDb();

  if (reset) {
    await db.delete(ride).where(eq(ride.profileId, userId));
    console.log("Cleared existing rides.");
  }

  for (let i = 0; i < count; i++) {
    const parsed = await parseGpx(Buffer.from(generateGpx(i + 1)));
    const started = new Date();
    started.setUTCDate(
      started.getUTCDate() -
        Math.round((i * 364) / count) -
        Math.floor(Math.random() * 3),
    );
    started.setUTCHours(7 + Math.floor(Math.random() * 5), 0, 0, 0);
    parsed.startedAt = started.toISOString();
    parsed.suggestedName = `${started.toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: "UTC",
    })} ${PART_OF_DAY(started.getUTCHours())} ride`;

    const rideId = randomUUID();
    await persistRide({
      rideId,
      profileId: userId,
      parsed,
      storagePath: `${userId}/${rideId}.gpx`,
    });
    process.stdout.write(`\rSeeded ${i + 1}/${count}`);
  }

  console.log(`\nDone — ${count} rides for ${email}.`);
  await closeDb();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
