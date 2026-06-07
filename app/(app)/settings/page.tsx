import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/db/queries";
import { SettingsForm } from "@/components/settings/settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await getProfile(user.id);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2 border-b border-ink pb-5">
        <span className="label">Preferences</span>
        <h1 className="font-sans text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Settings
        </h1>
      </header>

      <SettingsForm
        units={(profile?.units ?? "metric") as "metric" | "imperial"}
        theme={(profile?.theme ?? "light") as "light" | "night" | "auto"}
        ftpW={profile?.ftpW ?? null}
        maxHrBpm={profile?.maxHrBpm ?? null}
        weatherEnabled={profile?.weatherEnabled ?? true}
      />
    </div>
  );
}
