"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Service = {
  name: string;
  ok: boolean;
  latency_ms: number;
  error?: string;
};

type Status = {
  ok: boolean;
  checked_at: string;
  services: Service[];
};

export default function StatusPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setFetchError(null);
    try {
      const r = await fetch("/api/status", { cache: "no-store" });
      const data: Status = await r.json();
      setStatus(data);
    } catch {
      setFetchError("Não foi possível verificar o status. Pode ser a internet daqui.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  const banner = (() => {
    if (fetchError) return { bg: "bg-amber-50", fg: "text-amber-700", txt: "⚠️ Sem conexão" };
    if (!status) return { bg: "bg-slate-100", fg: "text-slate-500", txt: "Verificando…" };
    if (status.ok) return { bg: "bg-emerald-50", fg: "text-emerald-700", txt: "✅ Tudo funcionando" };
    return { bg: "bg-red-50", fg: "text-red-700", txt: "⚠️ Sistema com problema" };
  })();

  return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Status do sistema</h1>
        <Link
          href="/"
          className="text-sm font-medium text-sky-600 hover:underline"
        >
          Voltar
        </Link>
      </header>

      <div
        className={`rounded-xl p-4 text-center text-base font-semibold ${banner.bg} ${banner.fg}`}
      >
        {banner.txt}
      </div>

      {status && (
        <ul className="space-y-2">
          {status.services.map((s) => (
            <li
              key={s.name}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-900">
                  {s.name}
                </div>
                {s.error && (
                  <div className="mt-0.5 break-words text-xs text-red-600">
                    {s.error}
                  </div>
                )}
              </div>
              <div className="ml-3 flex shrink-0 items-center gap-2">
                <span className="text-xs text-slate-500">{s.latency_ms}ms</span>
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    s.ok ? "bg-emerald-500" : "bg-red-500"
                  }`}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">
          {status
            ? `Última verificação: ${new Date(status.checked_at).toLocaleTimeString("pt-BR")}`
            : " "}
        </p>
        <button
          onClick={load}
          disabled={loading}
          className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          {loading ? "…" : "Atualizar"}
        </button>
      </div>

      <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
        <p className="mb-1 font-medium text-slate-800">Se algo estiver em vermelho:</p>
        <p>
          Avise o Diego com um print dessa tela. Enquanto isso, anote os cupons
          no papel e lance aqui quando voltar ao normal.
        </p>
      </div>
    </main>
  );
}
