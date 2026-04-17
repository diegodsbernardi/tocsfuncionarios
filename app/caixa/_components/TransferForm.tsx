"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { parseNumberBR } from "@/lib/format";
import { transferBetweenUnits } from "../actions";
import type { Unit } from "@/lib/units";

export function TransferForm({
  fromSessionId,
  toSessionId,
  units,
  currentUnitId,
}: {
  fromSessionId: string;
  toSessionId: string | null;
  units: Unit[];
  currentUnitId: string;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const otherUnit = units.find((u) => u.id !== currentUnitId);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!toSessionId) return;
    const value = parseNumberBR(amount);
    if (value <= 0) {
      setError("Valor deve ser maior que zero.");
      return;
    }
    startTransition(async () => {
      const res = await transferBetweenUnits({
        from_session_id: fromSessionId,
        to_session_id: toSessionId,
        amount: value,
        description: description.trim() || "Transferência de troco",
      });
      if (!res.ok) {
        setError(res.error);
      } else {
        setAmount("");
        setDescription("");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl bg-white p-4 shadow">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Transferir pra outra unidade
      </h3>

      {!toSessionId ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Não há caixa aberto em{" "}
          <strong>{otherUnit?.name ?? "outra unidade"}</strong> hoje. Peça pra
          abrirem lá primeiro.
        </p>
      ) : (
        <p className="text-xs text-slate-500">
          De <strong>este caixa</strong> → <strong>{otherUnit?.name}</strong>
        </p>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Valor transferido
        </label>
        <div className="flex items-center gap-1">
          <span className="text-slate-500">R$</span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={!toSessionId}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-right tabular-nums outline-none focus:border-brand disabled:bg-slate-50"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Motivo (opcional)
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex: ficou sem troco de R$ 5"
          disabled={!toSessionId}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand disabled:bg-slate-50"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || !toSessionId}
        className="w-full rounded-lg bg-slate-800 py-2.5 font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
      >
        {isPending ? "Transferindo..." : "Transferir"}
      </button>
    </form>
  );
}
