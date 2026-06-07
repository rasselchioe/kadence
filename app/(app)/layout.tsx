import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getRideCount } from "@/lib/db/queries";
import { AppShell } from "@/components/shell/app-shell";
import { UnitsProvider } from "@/components/units-provider";
import type { UnitSystem } from "@/lib/units";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // Resilient: render the shell even if the DB isn't reachable yet.
  let archiveCount = 0;
  let units: UnitSystem = "metric";
  try {
    const [count, profile] = await Promise.all([
      getRideCount(user.id),
      getProfile(user.id),
    ]);
    archiveCount = count;
    units = (profile?.units ?? "metric") as UnitSystem;
  } catch {
    archiveCount = 0;
  }

  return (
    <UnitsProvider units={units}>
      <AppShell archiveCount={archiveCount}>{children}</AppShell>
    </UnitsProvider>
  );
}
