import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUnit, listUnits } from "@/lib/units";
import { AppHeader } from "@/components/AppHeader";
import { todayISO } from "@/lib/format";
import { OpenCashForm } from "./_components/OpenCashForm";
import { CashDashboard } from "./_components/CashDashboard";
import { ClosedSummary } from "./_components/ClosedSummary";

export const dynamic = "force-dynamic";

export default async function CaixaPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [unit, units] = await Promise.all([getCurrentUnit(), listUnits()]);

  if (!unit) {
    return (
      <main className="mx-auto max-w-md space-y-4 px-4 py-6">
        <AppHeader title="Caixa" back={{ href: "/" }} />
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          Nenhuma unidade configurada. Rode a migração SQL.
        </p>
      </main>
    );
  }

  const today = todayISO();

  const { data: session } = await supabase
    .from("cash_sessions")
    .select(
      `id, unit_id, operation_date, opened_at, opening_total, opening_denominations,
       closed_at, closing_total, closing_denominations, cash_sales, cash_sales_source,
       cash_sales_image_path, expected_total, divergence, divergence_justification,
       divergence_acknowledged_by_admin, status`,
    )
    .eq("unit_id", unit.id)
    .eq("operation_date", today)
    .maybeSingle();

  const { data: movements } = session
    ? await supabase
        .from("cash_movements")
        .select(
          "id, type, amount, description, related_unit_id, created_at, created_by",
        )
        .eq("session_id", session.id)
        .order("created_at", { ascending: true })
    : { data: [] };

  // Sessão aberta em outra unidade hoje — pra habilitar transferências
  const { data: otherUnitSession } = await supabase
    .from("cash_sessions")
    .select("id, unit_id")
    .neq("unit_id", unit.id)
    .eq("operation_date", today)
    .eq("status", "aberta")
    .maybeSingle();

  return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-6">
      <AppHeader title={`Caixa — ${unit.name}`} back={{ href: "/" }} />

      {!session && <OpenCashForm unitId={unit.id} />}

      {session?.status === "aberta" && (
        <CashDashboard
          session={session}
          movements={movements ?? []}
          units={units}
          otherUnitOpenSessionId={otherUnitSession?.id ?? null}
        />
      )}

      {session?.status === "fechada" && (
        <ClosedSummary session={session} movements={movements ?? []} />
      )}

      <div className="pt-2 text-center">
        <Link
          href="/caixa/historico"
          className="text-sm font-medium text-slate-600 hover:underline"
        >
          Ver histórico →
        </Link>
      </div>
    </main>
  );
}
