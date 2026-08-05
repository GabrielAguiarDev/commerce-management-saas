import type { Cost, CostType } from "@/types/types";

/**
 * Categorias sugeridas.
 *
 * `costs.category` é texto livre, então esta lista é só um ponto de partida —
 * a tela junta estas com as que o cliente já usou.
 */
export const COST_CATEGORIES = [
  "Ingredientes",
  "Materiais",
  "Contas",
  "Pessoal",
  "Transporte",
  "Outros",
];

export const COST_SUGGESTIONS = [
  "Compra de mercadoria",
  "Conta de luz",
  "Aluguel",
  "Material de limpeza",
];

/** `costs.type` e `costs.origin`. */
export const COST_TYPE_DB: Record<CostType, string> = { fixed: "fixed", variable: "variable" };
export const MANUAL_ORIGIN = "manual";
export const STOCK_ORIGIN = "stock";

export function costTypeFromDb(v: string | null): CostType {
  return v === "fixed" ? "fixed" : "variable";
}

export const COST_TYPE_STYLE: Record<CostType, { name: string; color: string; bg: string }> = {
  fixed: { name: "Fixo", color: "var(--petrol)", bg: "var(--surface3)" },
  variable: { name: "Variável", color: "var(--warn)", bg: "var(--warn-soft)" },
};

/**
 * Custo fixo é mensal. Num relatório de 7 dias, cobrar o aluguel inteiro faria
 * a semana parecer um desastre — então ele entra rateado pelos dias do período.
 */
export function fixedShare(costs: Cost[], days: number): number {
  const monthly = costs
    .filter((c) => c.type === "fixed" && c.d <= 30)
    .reduce((a, c) => a + c.amount, 0);
  return (monthly / 30) * days;
}

/** As categorias que este cliente já usou, somadas às sugeridas. */
export function costCategories(costs: Cost[]): string[] {
  const inUse = costs.map((c) => c.category).filter(Boolean);
  return Array.from(new Set([...COST_CATEGORIES, ...inUse])).sort((a, b) => a.localeCompare(b, "pt-BR"));
}
