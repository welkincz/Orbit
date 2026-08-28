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
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={isPending}
      className="orbit-control"
    >
      <RefreshCw
        aria-hidden="true"
        className={`size-4 transition-transform duration-[120ms]${isPending ? " rotate-180" : ""}`}
      />
      {label}
    </button>
  );
}
