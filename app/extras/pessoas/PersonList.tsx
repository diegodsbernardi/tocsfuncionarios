"use client";

import { useState } from "react";
import { PersonForm } from "./PersonForm";
import { formatDateTime } from "@/lib/format";

type Person = {
  id: string;
  name: string;
  phone: string | null;
  default_category: "cozinha" | "atendimento" | null;
  active: boolean;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by_name: string | null;
  updated_by_name: string | null;
};

export function PersonList({ people }: { people: Person[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (people.length === 0) {
    return (
      <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow">
        Ninguém cadastrado ainda.
      </p>
    );
  }

  return (
    <section className="space-y-2">
      <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Cadastrados ({people.filter((p) => p.active).length} ativos)
      </h2>
      {people.map((p) => (
        <article
          key={p.id}
          className={`rounded-2xl bg-white p-4 shadow ${!p.active ? "opacity-60" : ""}`}
        >
          {editingId === p.id ? (
            <PersonForm
              initial={{
                id: p.id,
                name: p.name,
                phone: p.phone,
                default_category: p.default_category,
                active: p.active,
                notes: p.notes,
              }}
              onDone={() => setEditingId(null)}
            />
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800">
                  {p.name}
                  {!p.active && (
                    <span className="ml-2 text-xs font-normal text-slate-400">
                      inativo
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500">
                  {p.default_category ?? "setor —"}
                  {p.phone && ` • ${p.phone}`}
                </p>
                {p.notes && (
                  <p className="text-xs text-slate-400">{p.notes}</p>
                )}
                <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">
                  {p.created_by_name
                    ? `cadastrado por ${p.created_by_name}`
                    : "cadastrado"}
                  {p.created_at && ` • ${formatDateTime(p.created_at)}`}
                  {p.updated_at &&
                    p.updated_at !== p.created_at && (
                      <>
                        {" • editado"}
                        {p.updated_by_name &&
                          p.updated_by_name !== p.created_by_name &&
                          ` por ${p.updated_by_name}`}
                        {` em ${formatDateTime(p.updated_at)}`}
                      </>
                    )}
                </p>
              </div>
              <button
                onClick={() => setEditingId(p.id)}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Editar
              </button>
            </div>
          )}
        </article>
      ))}
    </section>
  );
}
