import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listUnits, getCurrentProfile } from "@/lib/units";
import { AppHeader } from "@/components/AppHeader";
import { brl, formatDate } from "@/lib/format";
import { AckButton } from "./AckButton";

export const dynamic = "force-dynamic";

type SessionRow = {
  id: string;
  unit_id: string;
  operation_date: string;
  opening_total: number | string;
  closing_total: number | string | null;
  expected_total: number | string | null;
  divergence: number | string | null;
  divergence_justification: string | null;
  divergence_acknowledged_by_admin: boolean;
  status: "aberta" | "fechada";
  closed_at: string | null;
};

export default async function HistoricoCaixaPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [units, profile] = await Promise.all([listUnits(), getCurrentProfile()]);
  const isAdmin = profile?.role === "admin";

  const { data: sessions } = await supabase
    .from("cash_sessions")
    .select(
      `id, unit_id, operation_date, opening_total, closing_total,
       expected_total, divergence, divergence_justification,
       divergence_acknowledged_by_admin, status, closed_at`,
    )
    .order("operation_date", { ascending: false })
    .limit(60);

  const list = (sessions || []) as SessionRow[];
  const unitsMap = Object.fromEntries(units.map((u) => [u.id, u.name]));

  const pending = list.filter(
    (s) =>
      s.divergence !== null &&
      Number(s.divergence) !== 0 &&
      !s.divergence_acknowledged_by_admin,
  );

  return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-6">
      <AppHeader title="Histórico caixa" back={{ href: "/caixa" }} />

      {isAdmin && pending.length > 0 && (
        <section className="rounded-2xl border border-red-300 bg-red-50 p-4">
          <h2 className="text-sm font-semibold text-red-800">
            ⚠️ {pending.length}{" "}
            {pending.length === 1 ? "divergência" : "divergências"} pendente{pending.length > 1 ? "s" : ""}
          </h2>
          <p className="mt-1 text-xs text-red-700">
            Revise cada caso e marque como visto.
          </p>
        </section>
      )}

      {list.length === 0 && (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow">
          Nenhuma sessão de caixa registrada ainda.
        </p>
      )}

      <ul className="space-y-3">
        {list.map((s) => {
          const divergence = s.divergence !== null ? Number(s.divergence) : null;
          return (
            <li
              key={s.id}
              className={`rounded-2xl bg-white p-4 shadow ${
                divergence !== null && divergence !== 0 && !s.divergence_acknowledged_by_admin
                  ? "border-2 border-red-200"
                  : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {formatDate(s.operation_date)} — {unitsMap[s.unit_id] ?? "—"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {s.status === "aberta"
                      ? "Ainda aberto"
                      : `Fechado • abertura ${brl(Number(s.opening_total))} → fechamento ${brl(Number(s.closing_total ?? 0))}`}
                  </p>
                </div>
                {divergence !== null && (
                  <span
                    className={`shrink-0 rounded-md px-2 py-1 text-xs font-bold tabular-nums ${
                      divergence === 0
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {divergence === 0
                      ? "OK"
                      : `${divergence > 0 ? "+" : ""}${brl(divergence)}`}
                  </span>
                )}
              </div>

              {s.divergence_justification && (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <span className="font-semibold">Justificativa:</span>{" "}
                  {s.divergence_justification}
                </p>
              )}

              {isAdmin &&
                divergence !== null &&
                divergence !== 0 &&
                !s.divergence_acknowledged_by_admin && (
                  <div className="mt-3">
                    <AckButton sessionId={s.id} />
                  </div>
                )}

              {s.divergence_acknowledged_by_admin &&
                divergence !== null &&
                divergence !== 0 && (
                  <p className="mt-2 text-xs text-slate-500">
                    ✅ Revisado pelo admin
                  </p>
                )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
