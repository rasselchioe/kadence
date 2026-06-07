-- Per-user weather enrichment toggle (Settings page).
ALTER TABLE public.profile
  ADD COLUMN IF NOT EXISTS weather_enabled boolean NOT NULL DEFAULT true;
