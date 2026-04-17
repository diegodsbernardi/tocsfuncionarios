// Ordem decrescente (maior valor primeiro) — usada em todas as telas de contagem
export const DENOMINATIONS: number[] = [
  200, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.25, 0.1, 0.05,
];

export function denominationLabel(value: number): string {
  if (value >= 1) return `R$ ${value.toFixed(0)}`;
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

export type DenominationCounts = Record<string, number>;

export function denomKey(value: number): string {
  // Chave estável como string pra usar em JSONB: "200", "0.50", etc.
  return value >= 1 ? value.toFixed(0) : value.toFixed(2);
}

export function totalFromCounts(counts: DenominationCounts): number {
  let sum = 0;
  for (const d of DENOMINATIONS) {
    const qty = counts[denomKey(d)] || 0;
    sum += d * qty;
  }
  return Math.round(sum * 100) / 100;
}

export function emptyCounts(): DenominationCounts {
  const out: DenominationCounts = {};
  for (const d of DENOMINATIONS) out[denomKey(d)] = 0;
  return out;
}
