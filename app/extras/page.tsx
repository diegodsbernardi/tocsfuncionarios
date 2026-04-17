import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listUnits, getCurrentUnit } from "@/lib/units";
import { AppHeader } from "@/components/AppHeader";
import { todayISO } from "@/lib/format";
import { AddShiftForm } from "./_components/AddShiftForm";
import { ShiftList } from "./_components/ShiftList";

export const dynamic = "force-dynamic";

export default async function ExtrasPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workDate = searchParams.date || todayISO();

  const [units, currentUnit] = await Promise.all([
    listUnits(),
    getCurrentUnit(),
  ]);

  const { data: people } = await supabase
    .from("extras_people")
    .select("id, name, default_category")
    .eq("active", true)
    .order("name");

  const { data: defaults } = await supabase
    .from("extras_default_values")
    .select("day_of_week, default_value");

  const { data: shifts } = await supabase
    .from("extras_shifts")
    .select(
      `id, work_date, category, value, value_was_overridden, value_override_reason,
       paid, paid_at, paid_amount, payment_method, payment_pix_reason,
       paid_by_unit_id, notes, person_id,
       person:extras_people(id, name)`,
    )
    .eq("work_date", workDate)
    .order("created_at", { ascending: false });

  const { data: allUnpaid } = await supabase
    .from("extras_shifts")
    .select("id, work_date, value, category, person:extras_people(name)")
    .eq("paid", false)
    .order("work_date", { ascending: true });

  const defaultMap: Record<number, number> = {};
  for (const d of defaults ?? []) defaultMap[d.day_of_week] = Number(d.default_value);

  return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-6">
      <AppHeader title="Extras" back={{ href: "/" }} />

      <div className="flex items-center justify-between rounded-xl bg-white p-3 shadow">
        <label className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-600">Data</span>
          <input
            type="date"
            defaultValue={workDate}
            onChange={(e) => {
              window.location.href = `/extras?date=${e.target.value}`;
            }}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-brand"
          />
        </label>
        <Link
          href="/extras/pessoas"
          className="text-sm font-medium text-brand-dark hover:underline"
        >
          Cadastro →
        </Link>
      </div>

      <AddShiftForm
        people={people ?? []}
        workDate={workDate}
        defaultValueMap={defaultMap}
      />

      <ShiftList
        shifts={(shifts ?? []).map((s) => ({
          ...s,
          person_name:
            (Array.isArray(s.person) ? s.person[0]?.name : (s.person as { name?: string } | null)?.name) ??
            "—",
        }))}
        units={units}
        currentUnitId={currentUnit?.id ?? null}
      />

      {allUnpaid && allUnpaid.length > 0 && (
        <section className="rounded-2xl bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-900">
            Pendentes no geral ({allUnpaid.length})
          </h2>
          <ul className="mt-2 space-y-1 text-xs text-amber-900">
            {allUnpaid.slice(0, 10).map((u) => {
              const name = Array.isArray(u.person)
                ? u.person[0]?.name
                : (u.person as { name?: string } | null)?.name;
              return (
                <li key={u.id} className="flex justify-between">
                  <span>
                    {u.work_date} — {name ?? "—"}
                  </span>
                  <span className="tabular-nums">R$ {Number(u.value).toFixed(2)}</span>
                </li>
              );
            })}
            {allUnpaid.length > 10 && (
              <li className="italic">
                …e mais {allUnpaid.length - 10}
              </li>
            )}
          </ul>
        </section>
      )}
    </main>
  );
}
