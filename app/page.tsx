import Link from "next/link";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { SignInForm } from "@/components/auth/sign-in-form";
import { createClient } from "@/lib/supabase/server";

/** Landing + magic-link sign-in. Signed-in riders go straight to the app. */
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-background px-6 py-16 md:px-12 md:py-24">
      <div className="mx-auto flex max-w-5xl flex-col gap-16">
        <header className="flex items-center justify-between border-b border-hairline pb-4">
          <span className="mono-tag text-foreground">Kadence</span>
          <div className="flex items-center gap-4">
            <span className="label">[ index ] · 00</span>
            <ThemeToggle />
          </div>
        </header>

        <section className="flex flex-col gap-8">
          <span className="label">
            Editorial cycling-analytics for one rider
          </span>
          <h1 className="display max-w-3xl text-foreground">
            An archive, <em>not</em> a network.
          </h1>
          <p className="max-w-xl font-sans text-[19px] leading-relaxed text-muted-foreground">
            Upload a <span className="mono-tag">.gpx</span>. Read your ride as a
            dashboard — map, elevation, splits, climbs, charts. Private by
            default. No feed, no followers, no leaderboards.
          </p>

          <div className="flex flex-col gap-4 pt-2">
            <span className="label">Sign in</span>
            <SignInForm />
            <Link
              href="/upload"
              className="group inline-flex w-fit items-baseline gap-2 font-sans text-sm font-medium text-muted-foreground transition-colors hover:text-crimson"
            >
              …or try the demo without an account
              <span className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>
        </section>

        <footer className="flex flex-wrap gap-6 border-t border-hairline pt-4">
          {["Map", "Elevation", "Splits", "Climbs", "Trends", "Goals"].map(
            (item, i) => (
              <span key={item} className="label">
                [ {String(i + 1).padStart(2, "0")} ] {item}
              </span>
            ),
          )}
        </footer>
      </div>
    </main>
  );
}
