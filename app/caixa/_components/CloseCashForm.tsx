"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DenominationGrid } from "@/components/DenominationGrid";
import {
  emptyCounts,
  totalFromCounts,
  type DenominationCounts,
} from "@/lib/denominations";
import { brl, parseNumberBR } from "@/lib/format";
import { compressImage } from "@/lib/compressImage";
import { createClient } from "@/lib/supabase/client";
import { closeCashSession } from "../actions";

type SaipsSource = "saipos_foto" | "manual";
type ExtractState =
  | { step: "idle" }
  | { step: "extracting" }
  | { step: "done"; total: number; context: string; path: string }
  | { step: "error"; message: string };

export function CloseCashForm({
  sessionId,
  openingTotal,
}: {
  sessionId: string;
  openingTotal: number;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [counts, setCounts] = useState<DenominationCounts>(emptyCounts());
  const [source, setSource] = useState<SaipsSource>("saipos_foto");
  const [cashSalesStr, setCashSalesStr] = useState("");
  const [extract, setExtract] = useState<ExtractState>({ step: "idle" });
  const [justification, setJustification] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const closingTotal = useMemo(() => totalFromCounts(counts), [counts]);
  const cashSales =
    source === "saipos_foto" && extract.step === "done"
      ? extract.total
      : parseNumberBR(cashSalesStr);

  const expected = Math.round((openingTotal + cashSales) * 100) / 100;
  const divergence = Math.round((closingTotal - expected) * 100) / 100;

  async function onPickFile() {
    fileInputRef.current?.click();
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files?.[0];
    if (!raw) return;
    setExtract({ step: "extracting" });
    setError(null);

    let file = raw;
    try {
      file = await compressImage(raw);
    } catch {}

    try {
      // 1. Upload
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${sessionId}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("saipos")
        .upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;

      // 2. Extração via IA
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/extract-saipos", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao ler relatório");
      }
      const data = (await res.json()) as { cash_total: number; context: string };
      setExtract({
        step: "done",
        total: data.cash_total,
        context: data.context,
        path,
      });
    } catch (err) {
      setExtract({
        step: "error",
        message: err instanceof Error ? err.message : "Erro",
      });
    }
  }

  function submit() {
    setError(null);
    if (closingTotal <= 0) {
      setError("Conte o dinheiro no fechamento.");
      return;
    }
    if (source === "saipos_foto" && extract.step !== "done") {
      setError("Tire/envie a foto do relatório Saipos primeiro.");
      return;
    }
    if (source === "manual" && cashSales < 0) {
      setError("Informe o valor de vendas em dinheiro.");
      return;
    }
    if (divergence !== 0 && !justification.trim()) {
      setError("Divergência precisa de justificativa.");
      return;
    }
    startTransition(async () => {
      const res = await closeCashSession({
        session_id: sessionId,
        closing_counts: counts,
        cash_sales: cashSales,
        cash_sales_source: source,
        cash_sales_image_path: extract.step === "done" ? extract.path : null,
        divergence_justification:
          divergence !== 0 ? justification.trim() : null,
      });
      if (!res.ok) {
        setError(res.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFileChange}
      />

      {/* Step 1: vendas em dinheiro */}
      <section className="rounded-2xl bg-white p-4 shadow">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          1. Vendas em dinheiro (do Saipos)
        </h3>

        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <SourceTile
            active={source === "saipos_foto"}
            onClick={() => setSource("saipos_foto")}
            label="📸 Foto Saipos"
          />
          <SourceTile
            active={source === "manual"}
            onClick={() => setSource("manual")}
            label="⌨️ Digitar"
          />
        </div>

        {source === "saipos_foto" && (
          <div className="mt-3 space-y-2">
            {extract.step === "idle" && (
              <button
                onClick={onPickFile}
                className="w-full rounded-lg border-2 border-dashed border-slate-300 py-5 text-slate-600 hover:border-brand hover:text-brand"
              >
                Tirar foto do relatório Saipos
              </button>
            )}
            {extract.step === "extracting" && (
              <p className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                Lendo relatório...
              </p>
            )}
            {extract.step === "done" && (
              <div className="space-y-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                <p className="font-semibold">
                  Dinheiro lido: {brl(extract.total)}
                </p>
                {extract.context && (
                  <p className="text-xs text-emerald-700/80">
                    {extract.context}
                  </p>
                )}
                <button
                  onClick={onPickFile}
                  className="text-xs font-medium text-emerald-800 underline"
                >
                  Tirar outra foto
                </button>
              </div>
            )}
            {extract.step === "error" && (
              <div className="space-y-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <p>{extract.message}</p>
                <button
                  onClick={onPickFile}
                  className="text-xs font-medium underline"
                >
                  Tentar de novo
                </button>
              </div>
            )}
          </div>
        )}

        {source === "manual" && (
          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Total de vendas em dinheiro hoje
            </label>
            <div className="flex items-center gap-1">
              <span className="text-slate-500">R$</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={cashSalesStr}
                onChange={(e) => setCashSalesStr(e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-right tabular-nums outline-none focus:border-brand"
              />
            </div>
          </div>
        )}
      </section>

      {/* Step 2: contagem */}
      <section className="space-y-3">
        <h3 className="px-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
          2. Conte o caixa no fechamento
        </h3>
        <DenominationGrid counts={counts} onChange={setCounts} />
      </section>

      {/* Step 3: divergência */}
      <section className="rounded-2xl bg-white p-4 shadow">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          3. Conferência
        </h3>
        <dl className="mt-3 space-y-1 text-sm text-slate-700">
          <Row label="Abertura" value={openingTotal} />
          <Row label="+ Vendas em dinheiro" value={cashSales} />
          <Row label="= Esperado" value={expected} bold />
          <Row label="Contado agora" value={closingTotal} bold />
        </dl>
        <div
          className={`mt-3 flex items-center justify-between rounded-lg px-3 py-2 ${
            divergence === 0
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          <span className="font-semibold">Divergência</span>
          <span className="font-bold tabular-nums">
            {divergence > 0 ? "+" : ""}
            {brl(divergence)}
          </span>
        </div>

        {divergence !== 0 && (
          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Justificativa (obrigatória)
            </label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Ex: troco incorreto, funcionário X gastou, cliente levou sem pagar..."
              rows={3}
              className="w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500"
            />
          </div>
        )}
      </section>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        onClick={submit}
        disabled={isPending}
        className="w-full rounded-lg bg-slate-900 py-3 font-semibold text-white hover:bg-black disabled:opacity-50"
      >
        {isPending ? "Fechando caixa..." : "Fechar caixa"}
      </button>

      <p className="text-center text-xs text-slate-400">
        Precisa sair sem fechar?{" "}
        <Link href="/" className="underline hover:text-slate-600">
          Voltar ao início
        </Link>
      </p>
    </div>
  );
}

function SourceTile({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border-2 py-3 font-medium transition ${
        active
          ? "border-brand bg-brand/5 text-brand-dark"
          : "border-slate-200 text-slate-500"
      }`}
    >
      {label}
    </button>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: number;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between ${bold ? "font-semibold" : ""}`}
    >
      <dt>{label}</dt>
      <dd className="tabular-nums">{brl(value)}</dd>
    </div>
  );
}
