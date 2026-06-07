import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db";
import { climb, ride, rideMetric, split } from "@/lib/db/schema";

export const runtime = "nodejs";

/** Download the user's archive as JSON (analyzed data + route; not raw points). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const db = getDb();
  const rides = await db
    .select()
    .from(ride)
    .where(eq(ride.profileId, user.id))
    .orderBy(desc(ride.startedAt));

  const out = [];
  for (const r of rides) {
    const [metric] = await db
      .select()
      .from(rideMetric)
      .where(eq(rideMetric.rideId, r.id));
    const splits = await db
      .select()
      .from(split)
      .where(eq(split.rideId, r.id))
      .orderBy(split.km);
    const climbs = await db.select().from(climb).where(eq(climb.rideId, r.id));
    out.push({ ...r, metric: metric ?? null, splits, climbs });
  }

  const payload = JSON.stringify(
    { exportedAt: new Date().toISOString(), rideCount: out.length, rides: out },
    null,
    2,
  );

  return new NextResponse(payload, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="kadence-export.json"',
    },
  });
}
