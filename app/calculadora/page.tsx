import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { CalculadoraForm } from "@/components/CalculadoraForm";

export const dynamic = "force-dynamic";

export default async function CalculadoraPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-6">
      <AppHeader title="Calculadora" back={{ href: "/" }} />
      <p className="text-sm text-slate-600">
        Digite a quantidade de cada nota/moeda — o total é calculado automaticamente.
        Isso é só uma ferramenta auxiliar, <strong>não salva nada</strong>.
      </p>
      <CalculadoraForm />
    </main>
  );
}
