import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { PersonForm } from "./PersonForm";
import { PersonList } from "./PersonList";

export const dynamic = "force-dynamic";

type Person = {
  id: string;
  name: string;
  phone: string | null;
  pix_key: string | null;
  default_category: "cozinha" | "atendimento" | null;
  active: boolean;
  notes: string | null;
};

export default async function PessoasPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("extras_people")
    .select("id, name, phone, pix_key, default_category, active, notes")
    .order("active", { ascending: false })
    .order("name");

  const people = (data || []) as Person[];

  return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-6">
      <AppHeader title="Extras — pessoas" back={{ href: "/extras" }} />
      <PersonForm />
      <PersonList people={people} />
    </main>
  );
}
