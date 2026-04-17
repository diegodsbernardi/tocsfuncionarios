"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { brl, formatDateTime } from "@/lib/format";
import { AddMovementForm } from "./AddMovementForm";
import { TransferForm } from "./TransferForm";
import { CloseCashForm } from "./CloseCashForm";
import type { Unit } from "@/lib/units";

export type Session = {
  id: string;
  unit_id: string;
  operation_date: string;
  opened_at: string;
  opening_total: number | string;
  opening_denominations: Record<string, number>;
  status: "aberta" | "fechada";
};

export type Movement = {
  id: string;
  type:
    | "reforco"
    | "retirada"
    | "transferencia_saida"
    | "transferencia_entrada";
  amount: number | string;
  description: string | null;
  related_unit_id: string | null;
  created_at: string;
};

const TYPE_LABEL: Record<Movement["type"], string> = {
  reforco: "Reforço (entrou)",
  retirada: "Retirada (saiu)",
  transferencia_saida: "Transferência (saiu)",
  transferencia_entrada: "Transferência (entrou)",
};

const TYPE_SIGN: Record<Movement["type"], 1 | -1> = {
  reforco: 1,
  retirada: -1,
  transferencia_saida: -1,
  transferencia_entrada: 1,
};

export function CashDashboard({
  session,
  movements,
  units,
  otherUnitOpenSessionId,
}: {
  session: Session;
  movements: Movement[];
  units: Unit[];
  otherUnitOpenSessionId: string | null;
}) {
  const [tab, setTab] = useState<"resumo" | "lancar" | "fechar">("resumo");

  const balance = useMemo(() => {
    let v = Number(session.opening_total);
    for (const m of movements) {
      v += TYPE_SIGN[m.type] * Number(m.amount);
    }
    return Math.round(v * 100) / 100;
  }, [session, movements]);

  const unitsMap = useMemo(
    () => Object.fromEntries(units.map((u) => [u.id, u.name])),
    [units],
  );

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-gradient-to-br from-brand to-brand-dark p-5 text-white shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/80">
          Em operação desde {formatDateTime(session.opened_at)}
        </p>
        <p className="mt-1 text-3xl font-bold tabular-nums">{brl(balance)}</p>
        <p className="text-xs text-white/80">
          Abertura {brl(Number(session.opening_total))} + movimentações
        </p>
      </section>

      <div className="grid grid-cols-3 rounded-lg bg-slate-100 p-1 text-sm font-medium">
        <TabButton active={tab === "resumo"} onClick={() => setTab("resumo")}>
          Resumo
        </TabButton>
        <TabButton active={tab === "lancar"} onClick={() => setTab("lancar")}>
          Lançar
        </TabButton>
        <TabButton active={tab === "fechar"} onClick={() => setTab("fechar")}>
          Fechar
        </TabButton>
      </div>

      {tab === "resumo" && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Movimentações ({movements.length})
          </h3>
          {movements.length === 0 ? (
            <p className="rounded-xl bg-white p-5 text-center text-sm text-slate-500 shadow">
              Nenhuma movimentação ainda.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl bg-white shadow">
              {movements.map((m) => {
                const signed = TYPE_SIGN[m.type] * Number(m.amount);
                return (
                  <li key={m.id} className="flex items-start gap-3 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">
                        {TYPE_LABEL[m.type]}
                        {m.related_unit_id && (
                          <span className="text-slate-500">
                            {" "}↔ {unitsMap[m.related_unit_id] ?? "—"}
                          </span>
                        )}
                      </p>
                      {m.description && (
                        <p className="text-xs text-slate-500">{m.description}</p>
                      )}
                      <p className="text-[10px] text-slate-400">
                        {formatDateTime(m.created_at)}
                      </p>
                    </div>
                    <span
                      className={`font-semibold tabular-nums ${signed >= 0 ? "text-emerald-600" : "text-red-600"}`}
                    >
                      {signed >= 0 ? "+" : ""}
                      {brl(signed)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {tab === "lancar" && (
        <div className="space-y-4">
          <AddMovementForm sessionId={session.id} />
          <TransferForm
            fromSessionId={session.id}
            toSessionId={otherUnitOpenSessionId}
            units={units}
            currentUnitId={session.unit_id}
          />
        </div>
      )}

      {tab === "fechar" && (
        <CloseCashForm sessionId={session.id} openingTotal={Number(session.opening_total)} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md py-1.5 transition ${
        active ? "bg-white text-slate-900 shadow" : "text-slate-500"
      }`}
    >
      {children}
    </button>
  );
}

