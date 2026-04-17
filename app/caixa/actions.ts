"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { totalFromCounts, type DenominationCounts } from "@/lib/denominations";
import { todayISO } from "@/lib/format";

type Result<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  return { supabase, user };
}

export async function openCashSession(input: {
  unit_id: string;
  counts: DenominationCounts;
}): Promise<Result<{ id: string }>> {
  try {
    const { supabase, user } = await requireUser();
    const total = totalFromCounts(input.counts);
    const { data, error } = await supabase
      .from("cash_sessions")
      .insert({
        unit_id: input.unit_id,
        operation_date: todayISO(),
        opened_by: user.id,
        opening_total: total,
        opening_denominations: input.counts,
        status: "aberta",
      })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") {
        return { ok: false, error: "Já existe uma sessão pra essa unidade hoje." };
      }
      return { ok: false, error: error.message };
    }
    revalidatePath("/");
    revalidatePath("/caixa");
    return { ok: true, data: { id: data.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro" };
  }
}

export async function addMovement(input: {
  session_id: string;
  type: "reforco" | "retirada";
  amount: number;
  description: string;
}): Promise<Result> {
  try {
    const { supabase, user } = await requireUser();
    if (input.amount <= 0) return { ok: false, error: "Valor deve ser positivo." };

    const { data: session, error: sErr } = await supabase
      .from("cash_sessions")
      .select("id, unit_id, status")
      .eq("id", input.session_id)
      .maybeSingle();
    if (sErr || !session) return { ok: false, error: "Sessão não encontrada." };
    if (session.status !== "aberta")
      return { ok: false, error: "Caixa já fechado." };

    const { error } = await supabase.from("cash_movements").insert({
      session_id: session.id,
      unit_id: session.unit_id,
      type: input.type,
      amount: input.amount,
      description: input.description,
      created_by: user.id,
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/caixa");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro" };
  }
}

export async function transferBetweenUnits(input: {
  from_session_id: string;
  to_session_id: string;
  amount: number;
  description: string;
}): Promise<Result> {
  try {
    const { supabase } = await requireUser();
    if (input.amount <= 0) return { ok: false, error: "Valor deve ser positivo." };
    const { error } = await supabase.rpc("transfer_between_units", {
      p_from_session: input.from_session_id,
      p_to_session: input.to_session_id,
      p_amount: input.amount,
      p_description: input.description,
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/caixa");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro" };
  }
}

export async function closeCashSession(input: {
  session_id: string;
  closing_counts: DenominationCounts;
  cash_sales: number;
  cash_sales_source: "saipos_foto" | "manual";
  cash_sales_image_path: string | null;
  divergence_justification: string | null;
}): Promise<Result<{ divergence: number; expected: number; closing: number }>> {
  try {
    const { supabase, user } = await requireUser();

    const { data: session, error: sErr } = await supabase
      .from("cash_sessions")
      .select("id, opening_total, status")
      .eq("id", input.session_id)
      .maybeSingle();
    if (sErr || !session) return { ok: false, error: "Sessão não encontrada." };
    if (session.status !== "aberta")
      return { ok: false, error: "Caixa já fechado." };

    // Somar movimentações
    const { data: movs } = await supabase
      .from("cash_movements")
      .select("type, amount")
      .eq("session_id", session.id);

    let movBalance = 0;
    for (const m of movs || []) {
      const amount = Number(m.amount);
      if (m.type === "reforco" || m.type === "transferencia_entrada") {
        movBalance += amount;
      } else {
        // retirada ou transferencia_saida
        movBalance -= amount;
      }
    }

    const opening = Number(session.opening_total);
    const closing = totalFromCounts(input.closing_counts);
    const expected =
      Math.round((opening + Number(input.cash_sales) + movBalance) * 100) / 100;
    const divergence = Math.round((closing - expected) * 100) / 100;

    if (divergence !== 0 && !input.divergence_justification?.trim()) {
      return {
        ok: false,
        error: "Divergência precisa de justificativa.",
      };
    }

    const { error } = await supabase
      .from("cash_sessions")
      .update({
        closed_at: new Date().toISOString(),
        closed_by: user.id,
        closing_total: closing,
        closing_denominations: input.closing_counts,
        cash_sales: input.cash_sales,
        cash_sales_source: input.cash_sales_source,
        cash_sales_image_path: input.cash_sales_image_path,
        expected_total: expected,
        divergence,
        divergence_justification: input.divergence_justification,
        status: "fechada",
      })
      .eq("id", session.id);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/");
    revalidatePath("/caixa");
    revalidatePath("/caixa/historico");
    return { ok: true, data: { divergence, expected, closing } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro" };
  }
}

export async function acknowledgeDiscrepancy(sessionId: string): Promise<Result> {
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase
      .from("cash_sessions")
      .update({ divergence_acknowledged_by_admin: true })
      .eq("id", sessionId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/");
    revalidatePath("/caixa/historico");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro" };
  }
}
