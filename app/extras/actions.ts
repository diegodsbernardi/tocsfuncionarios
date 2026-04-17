"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

export async function upsertPerson(input: {
  id?: string;
  name: string;
  phone: string | null;
  pix_key: string | null;
  default_category: "cozinha" | "atendimento" | null;
  active: boolean;
  notes: string | null;
}): Promise<Result<{ id: string }>> {
  try {
    const { supabase } = await requireUser();
    if (!input.name.trim()) return { ok: false, error: "Nome obrigatório." };

    if (input.id) {
      const { error } = await supabase
        .from("extras_people")
        .update({
          name: input.name.trim(),
          phone: input.phone?.trim() || null,
          pix_key: input.pix_key?.trim() || null,
          default_category: input.default_category,
          active: input.active,
          notes: input.notes?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.id);
      if (error) return { ok: false, error: error.message };
      revalidatePath("/extras/pessoas");
      revalidatePath("/extras");
      return { ok: true, data: { id: input.id } };
    }

    const { data, error } = await supabase
      .from("extras_people")
      .insert({
        name: input.name.trim(),
        phone: input.phone?.trim() || null,
        pix_key: input.pix_key?.trim() || null,
        default_category: input.default_category,
        active: input.active,
        notes: input.notes?.trim() || null,
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    revalidatePath("/extras/pessoas");
    revalidatePath("/extras");
    return { ok: true, data: { id: data.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro" };
  }
}

export async function createShift(input: {
  person_id: string;
  work_date: string; // YYYY-MM-DD
  category: "cozinha" | "atendimento";
  value: number;
  value_override_reason: string | null;
  default_value: number;
}): Promise<Result<{ id: string }>> {
  try {
    const { supabase, user } = await requireUser();
    if (!input.person_id) return { ok: false, error: "Selecione a pessoa." };
    if (input.value < 0) return { ok: false, error: "Valor inválido." };

    const overridden = input.value !== input.default_value;
    if (overridden && !input.value_override_reason?.trim()) {
      return {
        ok: false,
        error: "Justificativa obrigatória quando o valor é diferente do padrão.",
      };
    }

    const { data, error } = await supabase
      .from("extras_shifts")
      .insert({
        person_id: input.person_id,
        work_date: input.work_date,
        category: input.category,
        value: input.value,
        value_was_overridden: overridden,
        value_override_reason: overridden
          ? input.value_override_reason?.trim() || null
          : null,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    revalidatePath("/extras");
    revalidatePath("/");
    return { ok: true, data: { id: data.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro" };
  }
}

export async function markShiftPaid(input: {
  shift_id: string;
  paid_amount: number;
  payment_method: "dinheiro" | "pix";
  payment_pix_reason: string | null;
  paid_by_unit_id: string;
}): Promise<Result> {
  try {
    const { supabase, user } = await requireUser();
    if (input.paid_amount <= 0)
      return { ok: false, error: "Informe o valor pago." };
    if (input.payment_method === "pix" && !input.payment_pix_reason?.trim()) {
      return {
        ok: false,
        error: "Pagamento em PIX exige justificativa.",
      };
    }

    const { error } = await supabase
      .from("extras_shifts")
      .update({
        paid: true,
        paid_at: new Date().toISOString(),
        paid_amount: input.paid_amount,
        payment_method: input.payment_method,
        payment_pix_reason:
          input.payment_method === "pix"
            ? input.payment_pix_reason?.trim() || null
            : null,
        paid_by_unit_id: input.paid_by_unit_id,
        paid_by_user: user.id,
      })
      .eq("id", input.shift_id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/extras");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro" };
  }
}

export async function deleteShift(shiftId: string): Promise<Result> {
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase
      .from("extras_shifts")
      .delete()
      .eq("id", shiftId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/extras");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro" };
  }
}
