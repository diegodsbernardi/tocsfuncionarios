import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CaptureForm } from "@/components/CaptureForm";
import { TodayStatsCard } from "@/components/TodayStatsCard";
import { AppHeader } from "@/components/AppHeader";

export const dynamic = "force-dynamic";

export default async function SafrapayPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto max-w-md space-y-5 px-4 py-6">
      <AppHeader title="Safrapay" back={{ href: "/" }} />

      <div className="flex justify-end">
        <Link
          href="/historico"
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Histórico
        </Link>
      </div>

      <TodayStatsCard />

      <CaptureForm />
    </main>
  );
}
