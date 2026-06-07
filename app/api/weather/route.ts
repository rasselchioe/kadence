import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchWeather } from "@/lib/weather";

export const runtime = "nodejs";

/** Server-only Open-Meteo proxy with 24h cache. Auth-gated. */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const t = searchParams.get("t");
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !t) {
    return NextResponse.json(
      { error: "lat, lng and t are required" },
      { status: 400 },
    );
  }

  const data = await fetchWeather(lat, lng, t);
  return NextResponse.json(data ?? {});
}
