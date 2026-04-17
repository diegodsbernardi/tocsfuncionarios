"use client";

import { useMemo } from "react";
import {
  DENOMINATIONS,
  denomKey,
  denominationLabel,
  totalFromCounts,
  type DenominationCounts,
} from "@/lib/denominations";
import { brl } from "@/lib/format";

export function DenominationGrid({
  counts,
  onChange,
  disabled = false,
  showTotal = true,
}: {
  counts: DenominationCounts;
  onChange: (next: DenominationCounts) => void;
  disabled?: boolean;
  showTotal?: boolean;
}) {
  const total = useMemo(() => totalFromCounts(counts), [counts]);

  function update(value: number, qtyStr: string) {
    const qty = Math.max(0, Math.floor(Number(qtyStr) || 0));
    onChange({ ...counts, [denomKey(value)]: qty });
  }

  return (
    <div className="space-y-2">
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {DENOMINATIONS.map((d) => {
          const key = denomKey(d);
          const qty = counts[key] || 0;
          const subtotal = Math.round(d * qty * 100) / 100;
          return (
            <li
              key={key}
              className="flex items-center gap-3 px-3 py-2"
            >
              <span className="w-20 font-medium text-slate-700 tabular-nums">
                {denominationLabel(d)}
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={qty === 0 ? "" : qty}
                placeholder="0"
                disabled={disabled}
                onChange={(e) => update(d, e.target.value)}
                className="w-20 rounded-md border border-slate-300 px-2 py-1.5 text-right tabular-nums outline-none focus:border-brand disabled:bg-slate-50"
                aria-label={`Quantidade de notas/moedas de ${denominationLabel(d)}`}
              />
              <span className="ml-auto text-sm tabular-nums text-slate-500">
                {subtotal > 0 ? brl(subtotal) : "—"}
              </span>
            </li>
          );
        })}
      </ul>
      {showTotal && (
        <div className="flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3 text-white">
          <span className="text-sm font-medium uppercase tracking-wide text-white/80">
            Total
          </span>
          <span className="text-2xl font-bold tabular-nums">{brl(total)}</span>
        </div>
      )}
    </div>
  );
}
