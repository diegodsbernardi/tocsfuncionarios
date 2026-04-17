import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUnit, getCurrentProfile } from "@/lib/units";
import { AppHeader } from "@/components/AppHeader";
import { brl, todayISO } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [unit, profile] = await Promise.all([
    getCurrentUnit(),
    getCurrentProfile(),
  ]);

  const today = todayISO();

  const { data: todaySession } = unit
    ? await supabase
        .from("cash_sessions")
        .select(
          "id, status, opening_total, closing_total, expected_total, divergence",
        )
        .eq("unit_id", unit.id)
        .eq("operation_date", today)
        .maybeSingle()
    : { data: null };

  const { data: pendingDiverg } =
    profile?.role === "admin"
      ? await supabase
          .from("cash_sessions")
          .select("id, unit_id, operation_date, divergence")
          .neq("divergence", 0)
          .not("divergence", "is", null)
          .eq("divergence_acknowledged_by_admin", false)
          .order("closed_at", { ascending: false })
          .limit(10)
      : { data: null };

  const { data: unpaidExtras } = await supabase
    .from("extras_shifts")
    .select("id")
    .eq("paid", false);

  return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-6">
      <AppHeader title="TOCS" />

      {unit && (
        <section className="rounded-2xl bg-gradient-to-br from-brand to-brand-dark p-5 text-white shadow-lg">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/80">
              Hoje — {unit.name}
            </span>
          </div>
          {todaySession ? (
            <div className="mt-2">
              {todaySession.status === "aberta" ? (
                <>
                  <p className="text-2xl font-bold tabular-nums">
                    {brl(Number(todaySession.opening_total))}
                  </p>
                  <p className="text-xs text-white/80">
                    Caixa aberto com esse valor
                  </p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold tabular-nums">
                    {brl(Number(todaySession.closing_total))}
                  </p>
                  <p className="text-xs text-white/80">
                    Fechado
                    {todaySession.divergence !== null &&
                      Number(todaySession.divergence) !== 0 && (
                        <>
                          {" "}• divergência{" "}
                          <span className="font-semibold">
                            {brl(Number(todaySession.divergence))}
                          </span>
                        </>
                      )}
                  </p>
                </>
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm text-white/90">
              Caixa ainda não foi aberto hoje
            </p>
          )}
        </section>
      )}

      {profile?.role === "admin" &&
        pendingDiverg &&
        pendingDiverg.length > 0 && (
          <Link
            href="/caixa/historico"
            className="block rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 hover:bg-red-100"
          >
            ⚠️ {pendingDiverg.length}{" "}
            {pendingDiverg.length === 1
              ? "divergência pendente"
              : "divergências pendentes"}{" "}
            de revisão →
          </Link>
        )}

      <nav className="grid grid-cols-2 gap-3">
        <Tile
          href="/caixa"
          title="Caixa"
          subtitle={
            todaySession
              ? todaySession.status === "aberta"
                ? "Em operação"
                : "Fechado hoje"
              : "Abrir"
          }
          emoji="💰"
        />
        <Tile
          href="/calculadora"
          title="Calculadora"
          subtitle="Contar notas"
          emoji="🧮"
        />
        <Tile
          href="/extras"
          title="Extras"
          subtitle={
            unpaidExtras && unpaidExtras.length > 0
              ? `${unpaidExtras.length} não pago${unpaidExtras.length > 1 ? "s" : ""}`
              : "Freelas do dia"
          }
          highlight={(unpaidExtras?.length ?? 0) > 0}
          emoji="🧑‍🍳"
        />
        <Tile
          href="/safrapay"
          title="Safrapay"
          subtitle="Cupom de cartão"
          emoji="💳"
        />
      </nav>

      {profile?.role === "admin" && (
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Tile
            href="/caixa/historico"
            title="Histórico caixa"
            subtitle="Sessões anteriores"
            emoji="📊"
          />
          <Tile
            href="/extras/pessoas"
            title="Cadastro extras"
            subtitle="Pessoas"
            emoji="👥"
          />
        </div>
      )}

      <p className="pt-2 text-center text-xs text-slate-400">
        <Link href="/status" className="hover:underline">
          Status do sistema
        </Link>
      </p>
    </main>
  );
}

function Tile({
  href,
  title,
  subtitle,
  emoji,
  highlight,
}: {
  href: string;
  title: string;
  subtitle: string;
  emoji: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col justify-between rounded-2xl p-4 shadow transition hover:shadow-md active:scale-[0.98] ${
        highlight
          ? "border-2 border-amber-300 bg-amber-50"
          : "bg-white"
      }`}
    >
      <span className="text-2xl">{emoji}</span>
      <div className="mt-3">
        <p className="font-bold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
    </Link>
  );
}
