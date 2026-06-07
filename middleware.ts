import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Run on everything except static assets, the public sample GPX, and the
  // anonymous parse-preview demo endpoint.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sample-ride.gpx|api/parse-preview|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
