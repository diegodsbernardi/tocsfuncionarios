import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { PersonForm } from "./PersonForm";
import { PersonList } from "./PersonList";

export const dynamic = "force-dynamic";

type PersonRow = {
  id: string;
  name: string;
  phone: string | null;
  default_category: "cozinha" | "atendimento" | null;
  active: boolean;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
};

export default async function PessoasPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("extras_people")
    .select(
      "id, name, phone, default_category, active, notes, created_at, updated_at, created_by, updated_by",
    )
    .order("active", { ascending: false })
    .order("name");

  const rows = (data || []) as PersonRow[];

  const userIds = Array.from(
    new Set(
      rows
        .flatMap((r) => [r.created_by, r.updated_by])
        .filter((v): v is string => !!v),
    ),
  );

  const nameMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);
    for (const p of profiles ?? []) {
      nameMap[p.user_id] = p.full_name ?? "";
    }
  }

  const people = rows.map((r) => ({
    ...r,
    created_by_name: r.created_by ? nameMap[r.created_by] ?? null : null,
    updated_by_name: r.updated_by ? nameMap[r.updated_by] ?? null : null,
  }));

  return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-6">
      <AppHeader title="Extras — pessoas" back={{ href: "/extras" }} />
      <PersonForm />
      <PersonList people={people} />
    </main>
  );
}
