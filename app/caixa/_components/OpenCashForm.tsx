"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DenominationGrid } from "@/components/DenominationGrid";
import { emptyCounts, totalFromCounts } from "@/lib/denominations";
import { brl, dayOfWeekPt } from "@/lib/format";
import { openCashSession } from "../actions";

export function OpenCashForm({ unitId }: { unitId: string }) {
  const router = useRouter();
  const [counts, setCounts] = useState(emptyCounts());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const total = totalFromCounts(counts);
  const today = new Date();

  function submit() {
    if (total <= 0) {
      setError("Conte o dinheiro antes de abrir.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await openCashSession({ unit_id: unitId, counts });
      if (!res.ok) {
        setError(res.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white p-4 shadow">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Abrir caixa
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          {dayOfWeekPt(today)},{" "}
          {today.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Conte TODO o dinheiro (caixa + gaveta) antes de começar a operação.
        </p>
      </section>

      <DenominationGrid counts={counts} onChange={setCounts} />

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        onClick={submit}
        disabled={isPending || total <= 0}
        className="w-full rounded-lg bg-brand py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
      >
        {isPending
          ? "Abrindo..."
          : `Abrir caixa com ${brl(total)}`}
      </button>
    </div>
  );
}
