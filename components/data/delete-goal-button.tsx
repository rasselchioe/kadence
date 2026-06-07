"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteGoal } from "@/app/actions/deleteGoal";

export function DeleteGoalButton({ goalId }: { goalId: string }) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span className="flex items-center gap-2 text-xs">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(() => {
              void deleteGoal(goalId);
            })
          }
          className="mono-tag text-crimson hover:text-crimson-ink"
        >
          {pending ? "Deleting…" : "Confirm"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="mono-tag text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      aria-label="Delete goal"
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-crimson"
    >
      <Trash2 className="h-3.5 w-3.5" />
      Remove
    </button>
  );
}
