"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

interface RefreshPeopleButtonProps {
  label?: string;
}

export function RefreshPeopleButton({ label = "Refresh" }: RefreshPeopleButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      aria-busy={isPending}
      aria-label={isPending ? "Refreshing people" : label}
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={isPending}
      className="orbit-control refresh-control"
      title="Reload your Markdown notes"
    >
      <RefreshCw
        aria-hidden="true"
        className={`icon refresh-icon${isPending ? " refresh-icon--pending" : ""}`}
      />
      <span className="refresh-label" aria-hidden="true">
        <span className="refresh-label__measure">Refreshing…</span>
        <span>{isPending ? "Refreshing…" : label}</span>
      </span>
    </button>
  );
}
