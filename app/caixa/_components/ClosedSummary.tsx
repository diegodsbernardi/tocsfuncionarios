import { brl, formatDateTime } from "@/lib/format";
import type { Movement } from "./CashDashboard";

type ClosedSession = {
  id: string;
  opened_at: string;
  closed_at: string | null;
  opening_total: number | string;
  closing_total: number | string | null;
  cash_sales: number | string | null;
  expected_total: number | string | null;
  divergence: number | string | null;
  divergence_justification: string | null;
  divergence_acknowledged_by_admin: boolean;
};

export function ClosedSummary({
  session,
  movements,
}: {
  session: ClosedSession;
  movements: Movement[];
}) {
  const divergence = session.divergence !== null ? Number(session.divergence) : 0;

  return (
    <div className="space-y-4">
      <section
        className={`rounded-2xl p-5 shadow-lg ${
          divergence === 0
            ? "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white"
            : "bg-gradient-to-br from-red-500 to-red-700 text-white"
        }`}
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-white/80">
          Caixa fechado
          {session.closed_at && ` às ${formatDateTime(session.closed_at)}`}
        </p>
        <p className="mt-1 text-3xl font-bold tabular-nums">
          {divergence === 0 ? "✅ Bateu!" : `⚠️ ${brl(divergence)}`}
        </p>
        {divergence !== 0 && (
          <p className="text-xs text-white/80">
            Divergência {divergence > 0 ? "sobrou" : "faltou"}{" "}
            {brl(Math.abs(divergence))}
          </p>
        )}
      </section>

      <section className="rounded-2xl bg-white p-4 shadow">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Conferência
        </h3>
        <dl className="space-y-1 text-sm text-slate-700">
          <Row label="Abertura" value={Number(session.opening_total)} />
          <Row label="+ Vendas em dinheiro" value={Number(session.cash_sales ?? 0)} />
          <Row label="= Esperado" value={Number(session.expected_total ?? 0)} bold />
          <Row label="Contado" value={Number(session.closing_total ?? 0)} bold />
          <Row
            label="Divergência"
            value={divergence}
            bold
            tone={divergence === 0 ? "ok" : "bad"}
          />
        </dl>
      </section>

      {session.divergence_justification && (
        <section className="rounded-2xl bg-amber-50 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-800">
            Justificativa
          </h3>
          <p className="mt-1 text-sm text-amber-900">
            {session.divergence_justification}
          </p>
          {divergence !== 0 && (
            <p className="mt-2 text-xs text-amber-700">
              {session.divergence_acknowledged_by_admin
                ? "✅ Já revisado pelo admin"
                : "Aguardando revisão do admin"}
            </p>
          )}
        </section>
      )}

      <section className="rounded-2xl bg-white p-4 shadow">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Movimentações ({movements.length})
        </h3>
        {movements.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {movements.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between py-2 text-sm"
              >
                <span className="text-slate-700">
                  {m.type.replace("_", " ")}
                  {m.description && (
                    <span className="text-slate-500"> — {m.description}</span>
                  )}
                </span>
                <span className="tabular-nums text-slate-600">
                  {brl(Number(m.amount))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  tone,
}: {
  label: string;
  value: number;
  bold?: boolean;
  tone?: "ok" | "bad";
}) {
  const color =
    tone === "ok"
      ? "text-emerald-700"
      : tone === "bad"
        ? "text-red-700"
        : "text-slate-700";
  return (
    <div
      className={`flex items-center justify-between ${bold ? "font-semibold" : ""} ${color}`}
    >
      <dt>{label}</dt>
      <dd className="tabular-nums">{brl(value)}</dd>
    </div>
  );
}
