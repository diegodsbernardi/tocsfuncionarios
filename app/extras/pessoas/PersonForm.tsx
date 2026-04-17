"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertPerson } from "../actions";

type Props = {
  initial?: {
    id: string;
    name: string;
    phone: string | null;
    default_category: "cozinha" | "atendimento" | null;
    active: boolean;
    notes: string | null;
  };
  onDone?: () => void;
};

export function PersonForm({ initial, onDone }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [category, setCategory] = useState<"cozinha" | "atendimento" | "">(
    initial?.default_category ?? "",
  );
  const [active, setActive] = useState(initial?.active ?? true);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await upsertPerson({
        id: initial?.id,
        name,
        phone: phone || null,
        default_category: (category || null) as
          | "cozinha"
          | "atendimento"
          | null,
        active,
        notes: notes || null,
      });
      if (!res.ok) {
        setError(res.error);
      } else {
        if (!initial) {
          setName("");
          setPhone("");
          setCategory("");
          setActive(true);
          setNotes("");
        }
        router.refresh();
        onDone?.();
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl bg-white p-4 shadow">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        {initial ? "Editar pessoa" : "Novo extra"}
      </h2>

      <Field label="Nome">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand"
        />
      </Field>

      <Field label="Telefone">
        <input
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(00) 00000-0000"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand"
        />
      </Field>

      <Field label="Setor padrão">
        <select
          value={category}
          onChange={(e) =>
            setCategory(e.target.value as "cozinha" | "atendimento" | "")
          }
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-brand"
        >
          <option value="">—</option>
          <option value="cozinha">Cozinha</option>
          <option value="atendimento">Atendimento</option>
        </select>
      </Field>

      <Field label="Observações">
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand"
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="h-4 w-4"
        />
        Ativo (aparece na lista de escolha ao lançar)
      </label>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-brand py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
      >
        {isPending ? "Salvando..." : initial ? "Salvar alterações" : "Cadastrar"}
      </button>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}
