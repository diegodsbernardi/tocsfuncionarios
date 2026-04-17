"use client";

import { useState } from "react";
import { DenominationGrid } from "./DenominationGrid";
import { emptyCounts } from "@/lib/denominations";

export function CalculadoraForm() {
  const [counts, setCounts] = useState(emptyCounts());

  return (
    <div className="space-y-3">
      <DenominationGrid counts={counts} onChange={setCounts} />
      <button
        onClick={() => setCounts(emptyCounts())}
        className="w-full rounded-lg border border-slate-300 bg-white py-2.5 font-medium text-slate-700 hover:bg-slate-50"
      >
        Zerar contagem
      </button>
    </div>
  );
}
