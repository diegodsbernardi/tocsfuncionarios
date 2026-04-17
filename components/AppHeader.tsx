import Link from "next/link";
import { listUnits, getCurrentUnit, getCurrentProfile } from "@/lib/units";
import { UnitSwitcher } from "./UnitSwitcher";
import { LogoutButton } from "./LogoutButton";

export async function AppHeader({
  title,
  back,
}: {
  title: string;
  back?: { href: string; label?: string };
}) {
  const [units, current, profile] = await Promise.all([
    listUnits(),
    getCurrentUnit(),
    getCurrentProfile(),
  ]);

  return (
    <header className="mb-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {back && (
              <Link
                href={back.href}
                aria-label="Voltar"
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                ←
              </Link>
            )}
            <h1 className="truncate text-xl font-bold text-slate-900">
              {title}
            </h1>
          </div>
          {profile?.full_name && (
            <p className="truncate text-xs text-slate-500">
              {profile.full_name}
              {profile.role === "admin" && (
                <span className="ml-1 rounded bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-brand-dark">
                  admin
                </span>
              )}
            </p>
          )}
        </div>
        <LogoutButton />
      </div>
      {units.length > 1 && (
        <div className="flex items-center justify-end">
          <UnitSwitcher units={units} currentId={current?.id ?? null} />
        </div>
      )}
    </header>
  );
}
