import { createClient } from "@/lib/supabase/server";

function brl(n: number) {
  return Number(n).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function startOfDayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function TodayStatsCard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("reports")
    .select("credito, debito, pix, total")
    .eq("user_id", user.id)
    .gte("created_at", startOfDayISO());

  const list = data || [];
  const totals = list.reduce(
    (acc, r) => {
      acc.credito += Number(r.credito);
      acc.debito += Number(r.debito);
      acc.pix += Number(r.pix);
      acc.total += Number(r.total);
      return acc;
    },
    { credito: 0, debito: 0, pix: 0, total: 0 },
  );

  const count = list.length;

  return (
    <section
      aria-label="Totais de hoje"
      className="rounded-2xl bg-gradient-to-br from-brand to-brand-dark p-5 text-white shadow-lg"
    >
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-white/80">
          Hoje
        </span>
        <span className="text-xs font-medium text-white/80 tabular-nums">
          {count} {count === 1 ? "relatório" : "relatórios"}
        </span>
      </div>

      <p className="mt-1 text-3xl font-bold tabular-nums">{brl(totals.total)}</p>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/20 pt-3">
        <Stat label="Crédito" value={totals.credito} />
        <Stat label="Débito" value={totals.debito} />
        <Stat label="Pix" value={totals.pix} />
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-white">
        {brl(value)}
      </p>
    </div>
  );
}
