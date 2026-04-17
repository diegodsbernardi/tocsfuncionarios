"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { acknowledgeDiscrepancy } from "../actions";

export function AckButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function click() {
    startTransition(async () => {
      await acknowledgeDiscrepancy(sessionId);
      router.refresh();
    });
  }

  return (
    <button
      onClick={click}
      disabled={isPending}
      className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
    >
      {isPending ? "Marcando..." : "Marcar como revisado"}
    </button>
  );
}
