export function brl(n: number | string | null | undefined): string {
  const v = typeof n === "number" ? n : Number(n ?? 0);
  return (isNaN(v) ? 0 : v).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function parseNumberBR(v: string): number {
  if (!v) return 0;
  const cleaned = v.replace(/\./g, "").replace(",", ".").trim();
  const n = Number(cleaned);
  return isNaN(n) ? 0 : n;
}

export function todayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export function dayOfWeekPt(date: Date = new Date()): string {
  const names = [
    "domingo",
    "segunda-feira",
    "terça-feira",
    "quarta-feira",
    "quinta-feira",
    "sexta-feira",
    "sábado",
  ];
  return names[date.getDay()];
}

export function formatDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d + (d.length === 10 ? "T12:00:00" : "")) : d;
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
