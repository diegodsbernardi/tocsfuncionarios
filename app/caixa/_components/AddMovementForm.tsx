"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { parseNumberBR } from "@/lib/format";
import { addMovement } from "../actions";

export function AddMovementForm({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [type, setType] = useState<"reforco" | "retirada">("retirada");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const value = parseNumberBR(amount);
    if (value <= 0) {
      setError("Valor deve ser maior que zero.");
      return;
    }
    if (!description.trim()) {
      setError("Descreva o que é (ex: depósito, troco do dono, pagamento fornecedor).");
      return;
    }
    startTransition(async () => {
      const res = await addMovement({
        session_id: sessionId,
        type,
        amount: value,
        description: description.trim(),
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
        Reforço ou retirada
      </h3>

      <div className="grid grid-cols-2 gap-2">
        <TypeOption
          active={type === "reforco"}
          onClick={() => setType("reforco")}
          label="Entrou"
          emoji="➕"
          color="emerald"
        />
        <TypeOption
          active={type === "retirada"}
          onClick={() => setType("retirada")}
          label="Saiu"
          emoji="➖"
          color="red"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Valor
        </label>
        <div className="flex items-center gap-1">
          <span className="text-slate-500">R$</span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-right tabular-nums outline-none focus:border-brand"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Descrição {type === "retirada" ? "(obrigatória — motivo da saída)" : ""}
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={
            type === "retirada"
              ? "Ex: depósito bancário, pagamento fornecedor..."
              : "Ex: troco do dono, reforço do cofre..."
          }
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-brand py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
      >
        {isPending ? "Salvando..." : "Lançar"}
      </button>
    </form>
  );
}

function TypeOption({
  active,
  onClick,
  label,
  emoji,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  emoji: string;
  color: "emerald" | "red";
}) {
  const colorClasses = active
    ? color === "emerald"
      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
      : "border-red-500 bg-red-50 text-red-700"
    : "border-slate-200 text-slate-500";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border-2 py-3 font-medium transition ${colorClasses}`}
    >
      <span className="mr-1">{emoji}</span>
      {label}
    </button>
  );
}
