import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ServiceStatus = {
  name: string;
  ok: boolean;
  latency_ms: number;
  error?: string;
};

async function checkAnthropic(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada");

    // /messages/count_tokens autentica a key mas NÃO gera tokens (grátis).
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const r = await fetch(
      "https://api.anthropic.com/v1/messages/count_tokens",
      {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          messages: [{ role: "user", content: "hi" }],
        }),
        cache: "no-store",
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);

    if (!r.ok) {
      let msg = `HTTP ${r.status}`;
      if (r.status === 401) msg = "Chave da IA inválida (avise o Diego)";
      else if (r.status === 429) msg = "Limite de uso atingido";
      else if (r.status >= 500) msg = "IA indisponível no momento";
      throw new Error(msg);
    }
    return {
      name: "Leitura de cupom (Claude)",
      ok: true,
      latency_ms: Date.now() - start,
    };
  } catch (e: unknown) {
    const err = e as { name?: string; message?: string };
    const msg =
      err?.name === "AbortError"
        ? "Timeout de 7s — IA lenta ou fora"
        : (err?.message ?? "Erro desconhecido");
    return {
      name: "Leitura de cupom (Claude)",
      ok: false,
      latency_ms: Date.now() - start,
      error: msg,
    };
  }
}

async function checkSupabase(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Supabase não configurado");

    // PostgREST responde 200 mesmo sem sessão (RLS filtra, mas a query roda).
    // Isso prova que DB + API REST estão de pé.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const r = await fetch(`${url}/rest/v1/reports?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return {
      name: "Banco de dados (Supabase)",
      ok: true,
      latency_ms: Date.now() - start,
    };
  } catch (e: unknown) {
    const err = e as { name?: string; message?: string };
    const msg =
      err?.name === "AbortError"
        ? "Timeout de 5s — Supabase lento ou fora"
        : (err?.message ?? "Erro desconhecido");
    return {
      name: "Banco de dados (Supabase)",
      ok: false,
      latency_ms: Date.now() - start,
      error: msg,
    };
  }
}

export async function GET() {
  const [anthropic, supabase] = await Promise.all([
    checkAnthropic(),
    checkSupabase(),
  ]);
  const all_ok = anthropic.ok && supabase.ok;
  return NextResponse.json(
    {
      ok: all_ok,
      checked_at: new Date().toISOString(),
      services: [anthropic, supabase],
    },
    {
      status: all_ok ? 200 : 503,
      headers: { "Cache-Control": "no-store, max-age=0" },
    },
  );
}
