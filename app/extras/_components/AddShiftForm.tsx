"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { parseNumberBR, brl } from "@/lib/format";
import { createShift } from "../actions";

type Person = {
  id: string;
  name: string;
  default_category: "cozinha" | "atendimento" | null;
};

export function AddShiftForm({
  people,
  workDate,
  defaultValueMap,
}: {
  people: Person[];
  workDate: string;
  defaultValueMap: Record<number, number>;
}) {
  const router = useRouter();
  const [personId, setPersonId] = useState("");
  const [category, setCategory] = useState<"cozinha" | "atendimento">("cozinha");
  const [valueStr, setValueStr] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dow = useMemo(() => {
    const d = new Date(workDate + "T12:00:00");
    return d.getDay();
  }, [workDate]);

  const defaultValue = defaultValueMap[dow] ?? 0;
  const currentValue = valueStr === "" ? defaultValue : parseNumberBR(valueStr);
  const isOverride = currentValue !== defaultValue;

  function onPickPerson(id: string) {
    setPersonId(id);
    const p = people.find((p) => p.id === id);
    if (p?.default_category) setCategory(p.default_category);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!personId) {
      setError("Selecione a pessoa.");
      return;
    }
    if (isOverride && !reason.trim()) {
      setError(
        `Valor diferente do padrão (${brl(defaultValue)}) — justifique.`,
      );
      return;
    }
    startTransition(async () => {
      const res = await createShift({
        person_id: personId,
        work_date: workDate,
        category,
        value: currentValue,
        value_override_reason: isOverride ? reason.trim() : null,
        default_value: defaultValue,
      });
      if (!res.ok) {
        setError(res.error);
      } else {
        setPersonId("");
        setValueStr("");
        setReason("");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl bg-white p-4 shadow">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Lançar extra em {workDate}
      </h2>

      {people.length === 0 ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Nenhuma pessoa cadastrada.{" "}
          <a href="/extras/pessoas" className="underline">
            Cadastrar →
          </a>
        </p>
      ) : (
        <>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Pessoa
            </span>
            <select
              value={personId}
              onChange={(e) => onPickPerson(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-brand"
            >
              <option value="">Selecione...</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setCategory("cozinha")}
              className={`rounded-lg border-2 py-2 text-sm font-medium ${category === "cozinha" ? "border-brand bg-brand/5 text-brand-dark" : "border-slate-200 text-slate-500"}`}
            >
              🍳 Cozinha
            </button>
            <button
              type="button"
              onClick={() => setCategory("atendimento")}
              className={`rounded-lg border-2 py-2 text-sm font-medium ${category === "atendimento" ? "border-brand bg-brand/5 text-brand-dark" : "border-slate-200 text-slate-500"}`}
            >
              🙋 Atendimento
            </button>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Valor (padrão do dia: {brl(defaultValue)})
            </span>
            <div className="flex items-center gap-1">
              <span className="text-slate-500">R$</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder={defaultValue.toFixed(2).replace(".", ",")}
                value={valueStr}
                onChange={(e) => setValueStr(e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-right tabular-nums outline-none focus:border-brand"
              />
            </div>
          </label>

          {isOverride && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-amber-700">
                Justificativa (valor diferente do padrão)
              </span>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: meia diária, fechou mais cedo..."
                className="w-full rounded-lg border border-amber-300 px-3 py-2 outline-none focus:border-amber-500"
              />
            </label>
          )}

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
        </>
      )}
    </form>
  );
}
