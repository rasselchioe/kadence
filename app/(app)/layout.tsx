import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRideCount } from "@/lib/db/queries";
import { AppShell } from "@/components/shell/app-shell";

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
  try {
    archiveCount = await getRideCount(user.id);
  } catch {
    archiveCount = 0;
  }

  return <AppShell archiveCount={archiveCount}>{children}</AppShell>;
}
