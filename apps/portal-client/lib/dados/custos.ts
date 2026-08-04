import type { Custo, TipoCusto } from "@/types/types";

/**
 * Categorias sugeridas.
 *
 * `costs.category` é texto livre, então esta lista é só um ponto de partida —
 * a tela junta estas com as que o cliente já usou.
 */
export const CATS_CUSTO = [
  "Ingredientes",
  "Materiais",
  "Contas",
  "Pessoal",
  "Transporte",
  "Outros",
];

export const SUGESTOES_CUSTO = [
  "Compra de mercadoria",
  "Conta de luz",
  "Aluguel",
  "Material de limpeza",
];

/** `costs.type` e `costs.origin`. */
export const TIPO_CUSTO_DB: Record<TipoCusto, string> = { fixo: "fixed", variavel: "variable" };
export const ORIGEM_MANUAL = "manual";
export const ORIGEM_ESTOQUE = "stock";

export function tipoCustoDoBanco(v: string | null): TipoCusto {
  return v === "fixed" ? "fixo" : "variavel";
}

export const TIPO_CUSTO_ESTILO: Record<TipoCusto, { nome: string; cor: string; bg: string }> = {
  fixo: { nome: "Fixo", cor: "var(--petrol)", bg: "var(--surface3)" },
  variavel: { nome: "Variável", cor: "var(--warn)", bg: "var(--warn-soft)" },
};

/**
 * Custo fixo é mensal. Num relatório de 7 dias, cobrar o aluguel inteiro faria
 * a semana parecer um desastre — então ele entra rateado pelos dias do período.
 */
export function rateioFixo(custos: Custo[], dias: number): number {
  const mensal = custos
    .filter((c) => c.tipo === "fixo" && c.d <= 30)
    .reduce((a, c) => a + c.valor, 0);
  return (mensal / 30) * dias;
}

/** As categorias que este cliente já usou, somadas às sugeridas. */
export function categoriasDeCusto(custos: Custo[]): string[] {
  const usadas = custos.map((c) => c.categoria).filter(Boolean);
  return Array.from(new Set([...CATS_CUSTO, ...usadas])).sort((a, b) => a.localeCompare(b, "pt-BR"));
}
