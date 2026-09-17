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
 * Custos fixos lançados no período. Cada mês de uma série é um lançamento real
 * no banco, então basta somar — ratear pelos dias contaria a mesma despesa
 * por uma segunda regra.
 */
export function fixedTotal(costs: Cost[], days: number): number {
  return costs.filter((c) => c.type === "fixed" && c.d < days).reduce((a, c) => a + c.amount, 0);
}

/** `YYYY-MM-01` -> `competência 09/2026`. */
export function competenceLabel(competence: string | null): string | null {
  if (!competence) return null;
  const [year, month] = competence.split("-");
  return year && month ? `competência ${month}/${year}` : null;
}

/** As categorias que este cliente já usou, somadas às sugeridas. */
export function costCategories(costs: Cost[]): string[] {
  const inUse = costs.map((c) => c.category).filter(Boolean);
  return Array.from(new Set([...COST_CATEGORIES, ...inUse])).sort((a, b) => a.localeCompare(b, "pt-BR"));
}
