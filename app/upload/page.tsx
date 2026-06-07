import type { Metadata } from "next";
import Link from "next/link";
import { UploadClient } from "@/components/upload/upload-client";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Upload" };

export default async function UploadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isSignedIn = !!user;

  return (
    <main className="min-h-screen bg-background px-6 py-12 md:px-12">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <header className="flex items-center justify-between border-b border-hairline pb-4">
          <Link
            href="/"
            className="mono-tag text-foreground transition-colors hover:text-crimson"
          >
            ← Kadence
          </Link>
          <div className="flex items-center gap-4">
            <span className="label">[ upload ]</span>
            <ThemeToggle />
          </div>
        </header>

        <div className="flex flex-col gap-4">
          <span className="label">Import</span>
          <h1 className="display text-foreground">
            Drop your <em>ride</em>.
          </h1>
          <p className="serif max-w-xl text-lg text-muted-foreground">
            A .gpx in, a dashboard out. The file is parsed on the server and the
            analysis is rendered right here
            {isSignedIn
              ? " — then save it to your archive."
              : "; sign in to keep it."}
          </p>
        </div>

        <UploadClient isSignedIn={isSignedIn} />
      </div>
    </main>
  );
}
