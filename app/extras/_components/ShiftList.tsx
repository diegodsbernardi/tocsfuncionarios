"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { brl, formatDateTime, parseNumberBR } from "@/lib/format";
import type { Unit } from "@/lib/units";
import { markShiftPaid, deleteShift } from "../actions";

type Shift = {
  id: string;
  work_date: string;
  category: "cozinha" | "atendimento";
  value: number | string;
  value_was_overridden: boolean;
  value_override_reason: string | null;
  paid: boolean;
  paid_at: string | null;
  paid_amount: number | string | null;
  payment_method: "dinheiro" | "pix" | null;
  payment_pix_reason: string | null;
  paid_by_unit_id: string | null;
  notes: string | null;
  person_id: string;
  person_name: string;
};

export function ShiftList({
  shifts,
  units,
  currentUnitId,
}: {
  shifts: Shift[];
  units: Unit[];
  currentUnitId: string | null;
}) {
  const total = shifts.reduce((sum, s) => sum + Number(s.value), 0);
  const unpaid = shifts.filter((s) => !s.paid);
  const totalUnpaid = unpaid.reduce((sum, s) => sum + Number(s.value), 0);

  if (shifts.length === 0) {
    return (
      <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow">
        Nenhum extra lançado pra essa data.
      </p>
    );
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between rounded-xl bg-slate-900 px-4 py-2 text-white">
        <span className="text-xs font-semibold uppercase tracking-wide text-white/70">
          {shifts.length}{" "}
          {shifts.length === 1 ? "lançamento" : "lançamentos"} —{" "}
          {unpaid.length} {unpaid.length === 1 ? "pendente" : "pendentes"}
        </span>
        <span className="text-sm font-bold tabular-nums">
          {brl(total)}
          {unpaid.length > 0 && (
            <span className="ml-2 text-xs font-normal text-amber-300">
              ({brl(totalUnpaid)} a pagar)
            </span>
          )}
        </span>
      </div>

      {shifts.map((s) => (
        <ShiftCard
          key={s.id}
          shift={s}
          units={units}
          currentUnitId={currentUnitId}
        />
      ))}
    </section>
  );
}

function ShiftCard({
  shift,
  units,
  currentUnitId,
}: {
  shift: Shift;
  units: Unit[];
  currentUnitId: string | null;
}) {
  const router = useRouter();
  const [showPay, setShowPay] = useState(false);
  const [amountStr, setAmountStr] = useState(
    Number(shift.value).toFixed(2).replace(".", ","),
  );
  const [method, setMethod] = useState<"dinheiro" | "pix">("dinheiro");
  const [pixReason, setPixReason] = useState("");
  const [unitId, setUnitId] = useState(currentUnitId ?? units[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function payNow() {
    setError(null);
    const amount = parseNumberBR(amountStr);
    if (amount <= 0) {
      setError("Valor pago deve ser maior que zero.");
      return;
    }
    if (method === "pix" && !pixReason.trim()) {
      setError("PIX exige justificativa.");
      return;
    }
    if (!unitId) {
      setError("Selecione de qual caixa saiu o pagamento.");
      return;
    }
    startTransition(async () => {
      const res = await markShiftPaid({
        shift_id: shift.id,
        paid_amount: amount,
        payment_method: method,
        payment_pix_reason: method === "pix" ? pixReason.trim() : null,
        paid_by_unit_id: unitId,
      });
      if (!res.ok) {
        setError(res.error);
      } else {
        setShowPay(false);
        router.refresh();
      }
    });
  }

  function remove() {
    if (!window.confirm("Apagar esse lançamento?")) return;
    startTransition(async () => {
      await deleteShift(shift.id);
      router.refresh();
    });
  }

  const paidUnitName = shift.paid_by_unit_id
    ? units.find((u) => u.id === shift.paid_by_unit_id)?.name
    : null;

  return (
    <article className="rounded-2xl bg-white p-4 shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-800">{shift.person_name}</p>
          <p className="text-xs text-slate-500">
            {shift.category === "cozinha" ? "🍳 Cozinha" : "🙋 Atendimento"}
            {shift.value_was_overridden && (
              <span className="ml-2 text-amber-700">
                (valor alterado)
              </span>
            )}
          </p>
          {shift.value_override_reason && (
            <p className="text-xs italic text-slate-400">
              "{shift.value_override_reason}"
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="font-bold tabular-nums text-slate-800">
            {brl(Number(shift.value))}
          </p>
          {shift.paid ? (
            <span className="text-xs font-semibold text-emerald-600">
              ✅ Pago
            </span>
          ) : (
            <span className="text-xs font-semibold text-amber-600">
              ● A pagar
            </span>
          )}
        </div>
      </div>

      {shift.paid && (
        <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800">
          {brl(Number(shift.paid_amount ?? 0))} em{" "}
          {shift.payment_method === "pix" ? "PIX" : "dinheiro"}
          {paidUnitName && ` pelo ${paidUnitName}`}
          {shift.paid_at && ` • ${formatDateTime(shift.paid_at)}`}
          {shift.payment_pix_reason && (
            <span className="block italic text-emerald-700">
              "{shift.payment_pix_reason}"
            </span>
          )}
        </p>
      )}

      {!shift.paid && !showPay && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setShowPay(true)}
            className="flex-1 rounded-lg bg-brand py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Pagar agora
          </button>
          <button
            onClick={remove}
            disabled={isPending}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
          >
            Apagar
          </button>
        </div>
      )}

      {showPay && (
        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Valor pago
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right tabular-nums outline-none focus:border-brand"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMethod("dinheiro")}
              className={`rounded-lg border-2 py-2 text-sm font-medium ${method === "dinheiro" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500"}`}
            >
              💵 Dinheiro
            </button>
            <button
              type="button"
              onClick={() => setMethod("pix")}
              className={`rounded-lg border-2 py-2 text-sm font-medium ${method === "pix" ? "border-sky-500 bg-sky-50 text-sky-700" : "border-slate-200 text-slate-500"}`}
            >
              📱 PIX
            </button>
          </div>

          {method === "pix" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-amber-700">
                Justificativa (PIX)
              </label>
              <input
                type="text"
                value={pixReason}
                onChange={(e) => setPixReason(e.target.value)}
                placeholder="Ex: caixa sem troco, pessoa pediu..."
                className="w-full rounded-lg border border-amber-300 px-3 py-2 outline-none focus:border-amber-500"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Pago por qual caixa?
            </label>
            <select
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-brand"
            >
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setShowPay(false)}
              className="flex-1 rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={payNow}
              disabled={isPending}
              className="flex-1 rounded-lg bg-brand py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {isPending ? "Salvando..." : "Confirmar"}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
