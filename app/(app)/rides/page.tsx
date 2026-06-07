import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getRidesForProfile } from "@/lib/db/queries";
import { RidesTable } from "@/components/data/rides-table";

export const metadata: Metadata = { title: "Rides" };

export default async function RidesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const rides = await getRidesForProfile(user.id, 200, 0);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-baseline justify-between border-b border-ink pb-5">
        <h1 className="font-sans text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Rides
        </h1>
        <span className="label">{rides.length} total</span>
      </header>

      {rides.length === 0 ? (
        <div className="flex max-w-xl flex-col gap-4 border-t border-hairline pt-6">
          <p className="serif text-lg text-muted-foreground">
            Nothing here yet.
          </p>
          <Link
            href="/upload"
            className="group inline-flex w-fit items-baseline gap-2 border-b border-ink pb-1 font-sans text-lg font-semibold text-foreground transition-colors hover:border-crimson hover:text-crimson"
          >
            Import a ride
            <span className="transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>
      ) : (
        <RidesTable rides={rides} />
      )}
    </div>
  );
}
