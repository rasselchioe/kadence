import {
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// One row per authenticated user (id = auth.uid()). Build spec § 5.
export const profile = pgTable("profile", {
  id: uuid("id").primaryKey(), // references auth.users(id)
  email: text("email").notNull(),
  displayName: text("display_name"),
  units: text("units").default("metric").notNull(), // 'metric' | 'imperial'
  theme: text("theme").default("light").notNull(), // 'light' | 'night' | 'auto'
  ftpW: integer("ftp_w"),
  maxHrBpm: integer("max_hr_bpm"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const ride = pgTable(
  "ride",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profile.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sportType: text("sport_type").default("cycling").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    timezone: text("timezone"), // IANA, derived from start coords
    sourceApp: text("source_app"), // 'garmin' | 'wahoo' | 'apple' | 'unknown'
    gpxStoragePath: text("gpx_storage_path").notNull(),
    routeGeojson: jsonb("route_geojson").notNull(), // simplified LineString
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    byProfileStarted: index("ride_profile_started_idx").on(
      t.profileId,
      t.startedAt,
    ),
  }),
);

export const rideMetric = pgTable("ride_metric", {
  rideId: uuid("ride_id")
    .primaryKey()
    .references(() => ride.id, { onDelete: "cascade" }),
  distanceM: real("distance_m").notNull(),
  movingS: integer("moving_s").notNull(),
  elapsedS: integer("elapsed_s").notNull(),
  elevGainM: real("elev_gain_m").notNull(),
  elevLossM: real("elev_loss_m").notNull(),
  avgSpeedMps: real("avg_speed_mps").notNull(),
  maxSpeedMps: real("max_speed_mps").notNull(),
  avgHr: integer("avg_hr"),
  maxHr: integer("max_hr"),
  avgPowerW: integer("avg_power_w"),
  npW: integer("np_w"),
  avgCadenceRpm: integer("avg_cadence_rpm"),
  startLat: real("start_lat").notNull(),
  startLng: real("start_lng").notNull(),
  endLat: real("end_lat").notNull(),
  endLng: real("end_lng").notNull(),
});

// Trackpoints stored as a compressed JSONB array per ride (queried by-ride only).
export const rideTrack = pgTable("ride_track", {
  rideId: uuid("ride_id")
    .primaryKey()
    .references(() => ride.id, { onDelete: "cascade" }),
  points: jsonb("points").notNull(), // TrackPoint[]
  pointCount: integer("point_count").notNull(),
});

export const split = pgTable(
  "split",
  {
    rideId: uuid("ride_id")
      .notNull()
      .references(() => ride.id, { onDelete: "cascade" }),
    km: integer("km").notNull(),
    timeS: integer("time_s").notNull(),
    paceKmh: real("pace_kmh").notNull(),
    elevGainM: real("elev_gain_m").notNull(),
    avgPowerW: integer("avg_power_w"),
    avgHr: integer("avg_hr"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.rideId, t.km] }),
  }),
);

export const climb = pgTable(
  "climb",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rideId: uuid("ride_id")
      .notNull()
      .references(() => ride.id, { onDelete: "cascade" }),
    startKm: real("start_km").notNull(),
    endKm: real("end_km").notNull(),
    lengthM: real("length_m").notNull(),
    avgGradePct: real("avg_grade_pct").notNull(),
    category: text("category").notNull(), // 'cat4'..'hc' | 'uncat'
    peakElevM: real("peak_elev_m").notNull(),
  },
  (t) => ({
    byRide: index("climb_ride_idx").on(t.rideId),
  }),
);

export const goal = pgTable(
  "goal",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profile.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // 'distance' | 'elevation' | 'time' | 'power20'
    target: real("target").notNull(),
    period: text("period").notNull(), // 'week' | 'month' | 'year'
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    byProfile: index("goal_profile_idx").on(t.profileId),
  }),
);

export const weatherSnapshot = pgTable("weather_snapshot", {
  rideId: uuid("ride_id")
    .primaryKey()
    .references(() => ride.id, { onDelete: "cascade" }),
  tempC: real("temp_c"),
  windKmh: real("wind_kmh"),
  windDirDeg: integer("wind_dir_deg"),
  precipMm: real("precip_mm"),
  uv: real("uv"),
  cloudPct: integer("cloud_pct"),
  source: text("source").default("open-meteo").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Profile = typeof profile.$inferSelect;
export type Ride = typeof ride.$inferSelect;
export type NewRide = typeof ride.$inferInsert;
export type Goal = typeof goal.$inferSelect;
