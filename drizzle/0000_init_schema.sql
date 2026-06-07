CREATE TABLE IF NOT EXISTS "climb" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ride_id" uuid NOT NULL,
	"start_km" real NOT NULL,
	"end_km" real NOT NULL,
	"length_m" real NOT NULL,
	"avg_grade_pct" real NOT NULL,
	"category" text NOT NULL,
	"peak_elev_m" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "goal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"target" real NOT NULL,
	"period" text NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profile" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"units" text DEFAULT 'metric' NOT NULL,
	"theme" text DEFAULT 'light' NOT NULL,
	"ftp_w" integer,
	"max_hr_bpm" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ride" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sport_type" text DEFAULT 'cycling' NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"timezone" text,
	"source_app" text,
	"gpx_storage_path" text NOT NULL,
	"route_geojson" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ride_metric" (
	"ride_id" uuid PRIMARY KEY NOT NULL,
	"distance_m" real NOT NULL,
	"moving_s" integer NOT NULL,
	"elapsed_s" integer NOT NULL,
	"elev_gain_m" real NOT NULL,
	"elev_loss_m" real NOT NULL,
	"avg_speed_mps" real NOT NULL,
	"max_speed_mps" real NOT NULL,
	"avg_hr" integer,
	"max_hr" integer,
	"avg_power_w" integer,
	"np_w" integer,
	"avg_cadence_rpm" integer,
	"start_lat" real NOT NULL,
	"start_lng" real NOT NULL,
	"end_lat" real NOT NULL,
	"end_lng" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ride_track" (
	"ride_id" uuid PRIMARY KEY NOT NULL,
	"points" jsonb NOT NULL,
	"point_count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "split" (
	"ride_id" uuid NOT NULL,
	"km" integer NOT NULL,
	"time_s" integer NOT NULL,
	"pace_kmh" real NOT NULL,
	"elev_gain_m" real NOT NULL,
	"avg_power_w" integer,
	"avg_hr" integer,
	CONSTRAINT "split_ride_id_km_pk" PRIMARY KEY("ride_id","km")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "weather_snapshot" (
	"ride_id" uuid PRIMARY KEY NOT NULL,
	"temp_c" real,
	"wind_kmh" real,
	"wind_dir_deg" integer,
	"precip_mm" real,
	"uv" real,
	"cloud_pct" integer,
	"source" text DEFAULT 'open-meteo' NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "climb" ADD CONSTRAINT "climb_ride_id_ride_id_fk" FOREIGN KEY ("ride_id") REFERENCES "public"."ride"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "goal" ADD CONSTRAINT "goal_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ride" ADD CONSTRAINT "ride_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ride_metric" ADD CONSTRAINT "ride_metric_ride_id_ride_id_fk" FOREIGN KEY ("ride_id") REFERENCES "public"."ride"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ride_track" ADD CONSTRAINT "ride_track_ride_id_ride_id_fk" FOREIGN KEY ("ride_id") REFERENCES "public"."ride"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "split" ADD CONSTRAINT "split_ride_id_ride_id_fk" FOREIGN KEY ("ride_id") REFERENCES "public"."ride"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "weather_snapshot" ADD CONSTRAINT "weather_snapshot_ride_id_ride_id_fk" FOREIGN KEY ("ride_id") REFERENCES "public"."ride"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "climb_ride_idx" ON "climb" USING btree ("ride_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "goal_profile_idx" ON "goal" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ride_profile_started_idx" ON "ride" USING btree ("profile_id","started_at");