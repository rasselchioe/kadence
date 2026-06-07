import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRideDetail } from "@/lib/db/queries";
import { storedRideToView } from "@/lib/db/ride-view";
import { ActivityView } from "@/components/activity/activity-view";

export default async function RideDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const detail = await getRideDetail(user.id, id);
  if (!detail) notFound();

  return <ActivityView ride={storedRideToView(detail)} />;
}
