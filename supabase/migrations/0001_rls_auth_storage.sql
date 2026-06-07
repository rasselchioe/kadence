-- Row-level security, auth→profile wiring, and private GPX storage.
-- The table schema lives in drizzle/0000_init_schema.sql (Drizzle is the source
-- of truth for tables); these policies are applied on top. Build spec § 5.

-- profile.id is the auth user id
ALTER TABLE public.profile
  ADD CONSTRAINT profile_id_users_fk
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Enable RLS on every table
ALTER TABLE public.profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_metric ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_track ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.climb ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_snapshot ENABLE ROW LEVEL SECURITY;

-- profile: own row only
CREATE POLICY profile_select_own ON public.profile FOR SELECT USING (id = auth.uid());
CREATE POLICY profile_update_own ON public.profile FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY profile_insert_own ON public.profile FOR INSERT WITH CHECK (id = auth.uid());

-- ride + goal: own rows by profile_id
CREATE POLICY ride_all_own ON public.ride FOR ALL USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());
CREATE POLICY goal_all_own ON public.goal FOR ALL USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

-- per-ride children: own via join to ride
CREATE POLICY ride_metric_all_own ON public.ride_metric FOR ALL
  USING (EXISTS (SELECT 1 FROM public.ride r WHERE r.id = ride_metric.ride_id AND r.profile_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ride r WHERE r.id = ride_metric.ride_id AND r.profile_id = auth.uid()));
CREATE POLICY ride_track_all_own ON public.ride_track FOR ALL
  USING (EXISTS (SELECT 1 FROM public.ride r WHERE r.id = ride_track.ride_id AND r.profile_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ride r WHERE r.id = ride_track.ride_id AND r.profile_id = auth.uid()));
CREATE POLICY split_all_own ON public.split FOR ALL
  USING (EXISTS (SELECT 1 FROM public.ride r WHERE r.id = split.ride_id AND r.profile_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ride r WHERE r.id = split.ride_id AND r.profile_id = auth.uid()));
CREATE POLICY climb_all_own ON public.climb FOR ALL
  USING (EXISTS (SELECT 1 FROM public.ride r WHERE r.id = climb.ride_id AND r.profile_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ride r WHERE r.id = climb.ride_id AND r.profile_id = auth.uid()));
CREATE POLICY weather_all_own ON public.weather_snapshot FOR ALL
  USING (EXISTS (SELECT 1 FROM public.ride r WHERE r.id = weather_snapshot.ride_id AND r.profile_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ride r WHERE r.id = weather_snapshot.ride_id AND r.profile_id = auth.uid()));

-- Auto-create a profile row when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profile (id, email)
  VALUES (NEW.id, COALESCE(NEW.email, ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Private GPX storage bucket, scoped to gpx/<userId>/...
INSERT INTO storage.buckets (id, name, public)
VALUES ('gpx', 'gpx', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY gpx_read_own ON storage.objects FOR SELECT
  USING (bucket_id = 'gpx' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY gpx_insert_own ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'gpx' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY gpx_delete_own ON storage.objects FOR DELETE
  USING (bucket_id = 'gpx' AND (storage.foldername(name))[1] = auth.uid()::text);
