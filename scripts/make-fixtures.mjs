/**
 * Deterministic GPX fixture generator. Builds rides from (distance, grade,
 * speed) segments so the parser's metrics, splits, and climb categories are
 * predictable in tests. Re-run with `node scripts/make-fixtures.mjs`.
 *
 * Output: fixtures/{short,hilly,long,broken}.gpx
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "fixtures");
mkdirSync(OUT, { recursive: true });

// Seeded RNG (mulberry32) → identical fixtures on every run.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const START_LAT = 45.5231;
const START_LON = -122.6765;
const START_ELE = 200;

/**
 * @param {{distanceM:number, gradePct:number, speedKmh:number}[]} segments
 * @param {{dt:number, startISO:string, seed:number, hr?:boolean, cad?:boolean,
 *          power?: 'none'|'toplevel'|'extension'}} opts
 */
function generate(segments, opts) {
  const { dt, startISO, seed } = opts;
  const rand = rng(seed);
  const noise = (amp) => (rand() - 0.5) * 2 * amp;

  let lat = START_LAT;
  let lon = START_LON;
  let ele = START_ELE;
  let t = Date.parse(startISO);

  const points = [];
  const push = (speedKmh, gradePct) => {
    const speed = speedKmh / 3.6;
    const hr = opts.hr
      ? clamp(128 + gradePct * 3.2 + speed * 0.8 + noise(4), 95, 188)
      : null;
    const cad = opts.cad
      ? speed > 0.5
        ? clamp(82 + gradePct * 0.6 + noise(5), 0, 110)
        : 0
      : null;
    const power =
      opts.power && opts.power !== "none"
        ? Math.max(0, Math.round(150 + gradePct * 26 + speed * 1.5 + noise(15)))
        : null;
    points.push({
      lat,
      lon,
      ele,
      time: new Date(t).toISOString(),
      hr: hr == null ? null : Math.round(hr),
      cad: cad == null ? null : Math.round(cad),
      power,
    });
  };

  let traveled = 0; // cumulative metres, drives a gently meandering bearing

  push(0, 0); // resting first sample
  for (const seg of segments) {
    const speed = seg.speedKmh / 3.6; // m/s
    let covered = 0;
    while (covered < seg.distanceM - 1e-6) {
      const step = Math.min(speed * dt, seg.distanceM - covered);
      covered += step;
      traveled += step;
      // Sweep the heading so the route curves like a real road. Bearing only
      // changes direction — step distance and grade are unaffected, so metrics
      // and climb geometry stay exact.
      const bearing =
        70 + 48 * Math.sin(traveled / 2500) + 12 * Math.sin(traveled / 700);
      const br = (bearing * Math.PI) / 180;
      lat += (step * Math.cos(br)) / 111320;
      lon += (step * Math.sin(br)) / (111320 * Math.cos((lat * Math.PI) / 180));
      ele += (seg.gradePct / 100) * step;
      t += dt * 1000;
      push(seg.speedKmh, seg.gradePct);
    }
  }
  return points;
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function serialize(points, { creator, name, powerMode = "none" }) {
  const head =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<gpx version="1.1" creator="${creator}"\n` +
    `  xmlns="http://www.topografix.com/GPX/1/1"\n` +
    `  xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">\n` +
    `  <trk><name>${name}</name><trkseg>\n`;

  const body = points
    .map((p) => {
      const lines = [
        `    <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lon.toFixed(6)}">`,
        `      <ele>${p.ele.toFixed(1)}</ele>`,
        `      <time>${p.time}</time>`,
      ];
      const tpx = [];
      if (p.hr != null) tpx.push(`<gpxtpx:hr>${p.hr}</gpxtpx:hr>`);
      if (p.cad != null) tpx.push(`<gpxtpx:cad>${p.cad}</gpxtpx:cad>`);
      const extInner = [];
      if (tpx.length)
        extInner.push(
          `<gpxtpx:TrackPointExtension>${tpx.join("")}</gpxtpx:TrackPointExtension>`,
        );
      if (powerMode === "extension" && p.power != null)
        extInner.push(`<gpxtpx:power>${p.power}</gpxtpx:power>`);
      if (extInner.length)
        lines.push(`      <extensions>${extInner.join("")}</extensions>`);
      if (powerMode === "toplevel" && p.power != null)
        lines.push(`      <power>${p.power}</power>`);
      lines.push(`    </trkpt>`);
      return lines.join("\n");
    })
    .join("\n");

  return `${head}${body}\n  </trkseg></trk>\n</gpx>\n`;
}

function write(file, content) {
  writeFileSync(join(OUT, file), content);
  const points = (content.match(/<trkpt/g) || []).length;
  console.log(
    `  ${file.padEnd(12)} ${(content.length / 1024).toFixed(0).padStart(5)} KB  ${points} trkpts`,
  );
}

console.log("Generating fixtures →", OUT);

// ── short: 12 km flat commute, HR + cadence, no power ────────────────────────
write(
  "short.gpx",
  serialize(
    generate([{ distanceM: 12000, gradePct: 0, speedKmh: 24 }], {
      dt: 1,
      startISO: "2024-03-12T07:30:00Z",
      seed: 11,
      hr: true,
      cad: true,
      power: "none",
    }),
    { creator: "Garmin Edge 530", name: "Morning commute" },
  ),
);

// ── hilly: 31 km with 3 climbs (cat4, cat3, cat2), power as top-level <power> ─
write(
  "hilly.gpx",
  serialize(
    generate(
      [
        { distanceM: 3000, gradePct: 0, speedKmh: 25 },
        { distanceM: 2000, gradePct: 8, speedKmh: 12 }, // climb A → cat4
        { distanceM: 1500, gradePct: -6, speedKmh: 40 },
        { distanceM: 2000, gradePct: 0, speedKmh: 28 },
        { distanceM: 3000, gradePct: 9, speedKmh: 11 }, // climb B → cat3
        { distanceM: 2000, gradePct: -7, speedKmh: 42 },
        { distanceM: 2500, gradePct: 0, speedKmh: 27 },
        { distanceM: 6000, gradePct: 9, speedKmh: 10 }, // climb C → cat2
        { distanceM: 4000, gradePct: -6, speedKmh: 40 },
        { distanceM: 5000, gradePct: 0, speedKmh: 26 },
      ],
      {
        dt: 1,
        startISO: "2024-04-09T09:00:00Z",
        seed: 23,
        hr: true,
        cad: true,
        power: "toplevel",
      },
    ),
    {
      creator: "Wahoo ELEMNT BOLT",
      name: "Tuesday hill loop",
      powerMode: "toplevel",
    },
  ),
);

// ── long: ~96 km rolling, HR + cadence + power (extension), 3 s sampling ──────
write(
  "long.gpx",
  serialize(
    generate(
      [
        { distanceM: 20000, gradePct: 0, speedKmh: 30 },
        { distanceM: 8000, gradePct: 3, speedKmh: 18 },
        { distanceM: 8000, gradePct: -3, speedKmh: 45 },
        { distanceM: 20000, gradePct: 0, speedKmh: 31 },
        { distanceM: 5000, gradePct: 4, speedKmh: 17 },
        { distanceM: 5000, gradePct: -4, speedKmh: 45 },
        { distanceM: 20000, gradePct: 0, speedKmh: 29 },
        { distanceM: 10000, gradePct: 0, speedKmh: 30 },
      ],
      {
        dt: 3,
        startISO: "2024-05-18T06:00:00Z",
        seed: 71,
        hr: true,
        cad: true,
        power: "extension",
      },
    ),
    { creator: "StravaGPX", name: "Saturday century", powerMode: "extension" },
  ),
);

// ── broken: a route file (no <trkpt>) → NO_TRACKPOINTS ───────────────────────
write(
  "broken.gpx",
  `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="RouteBuilder"
  xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>Planned route — not a ride</name></metadata>
  <wpt lat="45.5231" lon="-122.6765"><name>Start</name></wpt>
  <wpt lat="45.5400" lon="-122.6500"><name>Turn</name></wpt>
  <rte>
    <name>Loop</name>
    <rtept lat="45.5231" lon="-122.6765"><ele>200</ele></rtept>
    <rtept lat="45.5400" lon="-122.6500"><ele>240</ele></rtept>
    <rtept lat="45.5600" lon="-122.6300"><ele>300</ele></rtept>
  </rte>
</gpx>
`,
);

console.log("Done.");
