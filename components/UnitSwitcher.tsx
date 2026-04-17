"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setUnit } from "@/app/actions/set-unit";
import type { Unit } from "@/lib/units";

export function UnitSwitcher({
  units,
  currentId,
}: {
  units: Unit[];
  currentId: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    startTransition(async () => {
      await setUnit(id);
      router.refresh();
    });
  }

  return (
    <label className="flex items-center gap-2 text-xs text-slate-500">
      <span className="hidden sm:inline">Unidade:</span>
      <select
        value={currentId ?? ""}
        onChange={handleChange}
        disabled={isPending}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm font-medium text-slate-800 outline-none focus:border-brand disabled:opacity-50"
      >
        {units.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
    </label>
  );
}
