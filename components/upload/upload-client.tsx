"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, MountainSnow, Save, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PreviewResponse, PreviewRide } from "@/lib/gpx/preview";
import { ActivityView } from "@/components/activity/activity-view";
import { uploadRide } from "@/app/actions/uploadRide";

// Mirrors MAX_GPX_BYTES in lib/gpx/parse.ts (kept inline so the parser's
// server-only deps don't get pulled into the client bundle).
const MAX_BYTES = 25 * 1024 * 1024;

type Status = "idle" | "parsing" | "done" | "error";

export function UploadClient({ isSignedIn }: { isSignedIn: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [ride, setRide] = useState<PreviewRide | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(
    null,
  );
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<File | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!/\.gpx$/i.test(file.name)) {
      setStatus("error");
      setError({
        code: "UNSUPPORTED_MIME",
        message: "Only .gpx files are supported.",
      });
      return;
    }
    if (file.size > MAX_BYTES) {
      setStatus("error");
      setError({
        code: "TOO_LARGE",
        message: "That file is over the 25 MB limit.",
      });
      return;
    }

    fileRef.current = file;
    setFileName(file.name);
    setStatus("parsing");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/parse-preview", {
        method: "POST",
        body: form,
      });
      const json: PreviewResponse = await res.json();
      if (json.ok) {
        setRide(json.ride);
        setStatus("done");
      } else {
        setError({ code: json.code, message: json.message });
        setStatus("error");
      }
    } catch {
      setStatus("error");
      setError({
        code: "NETWORK",
        message: "The parse request failed. Is the dev server running?",
      });
    }
  }

  async function loadSample() {
    try {
      setStatus("parsing");
      setFileName("sample-ride.gpx");
      const res = await fetch("/sample-ride.gpx");
      const blob = await res.blob();
      await handleFile(new File([blob], "sample-ride.gpx"));
    } catch {
      setStatus("error");
      setError({ code: "NETWORK", message: "Couldn't load the sample ride." });
    }
  }

  async function save() {
    const file = fileRef.current;
    if (!file) return;
    setSaving(true);
    setSaveError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await uploadRide(form);
    if (res.ok) {
      router.push(`/rides/${res.rideId}`);
    } else {
      setSaving(false);
      setSaveError(res.message);
    }
  }

  function reset() {
    setStatus("idle");
    setRide(null);
    setError(null);
    setFileName("");
    setSaveError(null);
    fileRef.current = null;
  }

  if (status === "done" && ride) {
    return (
      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {isSignedIn ? (
            <Button onClick={save} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {saving ? "Saving…" : "Save to archive"}
            </Button>
          ) : (
            <Link
              href="/"
              className="serif text-sm text-muted-foreground transition-colors hover:text-crimson"
            >
              Sign in to save this to your archive →
            </Link>
          )}
          <Button variant="outline" onClick={reset} disabled={saving}>
            Parse another
          </Button>
        </div>

        {saveError && (
          <div
            className="border-l-2 border-crimson px-4 py-3"
            style={{ backgroundColor: "hsl(var(--crimson) / 0.05)" }}
            role="alert"
          >
            <p className="serif text-foreground">{saveError}</p>
          </div>
        )}

        <ActivityView ride={ride} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        }}
        className={cn(
          "relative flex flex-col items-center justify-center gap-4 rounded-card border-2 border-dashed px-6 py-20 text-center transition-colors",
          dragging
            ? "border-crimson bg-crimson/5"
            : "border-hairline bg-bone/40",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".gpx,application/gpx+xml"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />

        {status === "parsing" ? (
          <>
            <Loader2 className="h-7 w-7 animate-spin text-crimson" />
            <p className="serif text-lg text-muted-foreground">
              Parsing {fileName} …
            </p>
          </>
        ) : (
          <>
            <UploadCloud className="h-8 w-8 text-muted-foreground" />
            <span className="label">Drop a .gpx</span>
            <p className="font-sans text-2xl font-semibold text-foreground">
              Drag a ride here
            </p>
            <p className="serif max-w-sm text-muted-foreground">
              {isSignedIn
                ? "…or choose a file. Parse it, then save it to your archive."
                : "…or choose a file. It’s parsed in memory — nothing is uploaded or stored."}
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
              <Button onClick={() => inputRef.current?.click()}>
                Choose file
              </Button>
              <Button variant="outline" onClick={loadSample}>
                <MountainSnow className="mr-2 h-4 w-4" />
                Load a sample ride
              </Button>
            </div>
          </>
        )}
      </div>

      {status === "error" && error && (
        <div
          className="border-l-2 border-crimson px-4 py-3"
          style={{ backgroundColor: "hsl(var(--crimson) / 0.05)" }}
          role="alert"
        >
          <p className="mono-tag text-crimson">[ {error.code} ]</p>
          <p className="serif text-foreground">{error.message}</p>
        </div>
      )}
    </div>
  );
}
