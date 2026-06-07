"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { updateProfile } from "@/app/actions/updateProfile";
import { resetDemo } from "@/app/actions/resetDemo";
import { deleteArchive } from "@/app/actions/deleteArchive";
import { THEME_KEY } from "@/components/theme/theme-toggle";

interface Props {
  units: "metric" | "imperial";
  theme: "light" | "night" | "auto";
  ftpW: number | null;
  maxHrBpm: number | null;
  weatherEnabled: boolean;
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-hairline py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-0.5">
        <span className="font-sans text-sm font-medium text-foreground">
          {label}
        </span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-hairline">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "px-3 py-1.5 font-sans text-sm transition-colors",
            value === o.value
              ? "bg-ink text-paper"
              : "text-foreground hover:bg-bone-2",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsForm(p: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [theme, setTheme] = useState<"light" | "night">(
    p.theme === "night" ? "night" : "light",
  );
  const [ftp, setFtp] = useState(p.ftpW?.toString() ?? "");
  const [maxHr, setMaxHr] = useState(p.maxHrBpm?.toString() ?? "");
  const [weather, setWeather] = useState(p.weatherEnabled);
  const [note, setNote] = useState<string | null>(null);

  const save = (
    patch: Parameters<typeof updateProfile>[0],
    after?: () => void,
  ) =>
    start(async () => {
      await updateProfile(patch);
      after?.();
      router.refresh();
    });

  const chooseTheme = (t: "light" | "night") => {
    setTheme(t);
    document.documentElement.classList.toggle("night", t === "night");
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {
      /* ignore */
    }
    save({ theme: t });
  };

  return (
    <div className="flex max-w-2xl flex-col">
      <Row label="Units" hint="Distance, elevation, and speed across the app.">
        <Segmented
          value={p.units}
          onChange={(u) => save({ units: u })}
          options={[
            { value: "metric", label: "Metric" },
            { value: "imperial", label: "Imperial" },
          ]}
        />
      </Row>

      <Row label="Theme" hint="Bone by day, ink by night.">
        <Segmented
          value={theme}
          onChange={(t) => chooseTheme(t)}
          options={[
            { value: "light", label: "Light" },
            { value: "night", label: "Night" },
          ]}
        />
      </Row>

      <Row label="FTP" hint="Functional threshold power, watts.">
        <Input
          type="number"
          min="0"
          value={ftp}
          onChange={(e) => setFtp(e.target.value)}
          className="w-24"
          placeholder="—"
        />
      </Row>

      <Row label="Max HR" hint="Used for effort zones, bpm.">
        <Input
          type="number"
          min="0"
          value={maxHr}
          onChange={(e) => setMaxHr(e.target.value)}
          className="w-24"
          placeholder="—"
        />
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            save(
              {
                ftpW: ftp ? Number(ftp) : null,
                maxHrBpm: maxHr ? Number(maxHr) : null,
              },
              () => setNote("Saved."),
            )
          }
        >
          Save
        </Button>
      </Row>

      <Row label="Weather" hint="Fetch conditions for new rides (Open-Meteo).">
        <Segmented
          value={weather ? "on" : "off"}
          onChange={(v) => {
            const on = v === "on";
            setWeather(on);
            save({ weatherEnabled: on });
          }}
          options={[
            { value: "on", label: "On" },
            { value: "off", label: "Off" },
          ]}
        />
      </Row>

      <Row label="Export" hint="Download your archive as JSON.">
        <Button variant="outline" asChild>
          <a href="/api/export" download>
            Export JSON
          </a>
        </Button>
      </Row>

      {note && <p className="mono-tag pt-2 text-field">{note}</p>}

      <div className="mt-8 flex flex-col gap-4 rounded-card border border-crimson/40 p-5">
        <span className="label text-crimson">Danger zone</span>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await resetDemo();
                router.refresh();
              })
            }
          >
            {pending ? "Working…" : "Reset demo data"}
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-crimson text-crimson">
                Delete archive
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete your entire archive?</DialogTitle>
                <DialogDescription>
                  This permanently removes every ride and its stored file. This
                  cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button
                    className="bg-crimson hover:bg-crimson-ink"
                    onClick={() =>
                      start(async () => {
                        await deleteArchive();
                        router.refresh();
                      })
                    }
                  >
                    Delete everything
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
