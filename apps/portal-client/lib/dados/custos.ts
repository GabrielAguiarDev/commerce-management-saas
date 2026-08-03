import { proximoId } from "@/lib/dados/uid";
import type { Custo, PerfilKey, TipoCusto } from "@/types/types";

/** [tipo, descrição, categoria, valor, dias atrás, repete todo mês] */
type LinhaCusto = [TipoCusto, string, string, number, number, boolean];

const SEED: Record<PerfilKey, LinhaCusto[]> = {
  petshop: [
    ["fixo", "Aluguel da loja", "Contas", 2400, 5, true],
    ["fixo", "Conta de luz", "Contas", 380, 8, true],
    ["fixo", "Internet", "Contas", 120, 8, true],
    ["fixo", "Salário da atendente", "Pessoal", 1650, 5, true],
    ["variavel", "Sacolas e embalagens", "Materiais", 95, 12, false],
    ["variavel", "Combustível das entregas", "Transporte", 180, 3, false],
  ],
  acaraje: [
    ["variavel", "Feijão fradinho", "Ingredientes", 68, 0, false],
    ["variavel", "Dendê", "Ingredientes", 42, 0, false],
    ["variavel", "Camarão seco", "Ingredientes", 90, 1, false],
    ["variavel", "Gás de cozinha", "Ingredientes", 130, 6, false],
    ["fixo", "Aluguel do ponto", "Contas", 450, 5, true],
    ["fixo", "Luz do ponto", "Contas", 90, 8, true],
  ],
};

export const CATS_CUSTO = [
  "Ingredientes",
  "Materiais",
  "Contas",
  "Pessoal",
  "Transporte",
  "Outros",
];

/** Sugestões de descrição no modal, para não começar de campo vazio. */
export const SUGESTOES_CUSTO: Record<PerfilKey, string[]> = {
  petshop: ["Compra de mercadoria", "Conta de luz", "Aluguel", "Material de limpeza"],
  acaraje: ["Feira", "Gás de cozinha", "Dendê", "Embalagens"],
};

export function mkCustos(perfil: PerfilKey): Custo[] {
  const base: Custo[] = (SEED[perfil] || []).map((c) => ({
    id: proximoId(),
    tipo: c[0],
    descricao: c[1],
    categoria: c[2],
    valor: c[3],
    d: c[4],
    recorrente: c[5],
  }));

  // Mês anterior, para o comparativo dos Relatórios. O fixo repete igual; o
  // variável oscila, porque é isso que ele faz na vida real.
  const anterior: Custo[] = base.map((c) => ({
    ...c,
    id: proximoId(),
    d: c.d + 30,
    valor: Math.round(c.valor * (c.tipo === "fixo" ? 1 : 0.92) * 100) / 100,
  }));

  return base.concat(anterior);
}

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

export const TIPO_CUSTO_ESTILO: Record<TipoCusto, { nome: string; cor: string; bg: string }> = {
  fixo: { nome: "Fixo", cor: "var(--petrol)", bg: "var(--surface3)" },
  variavel: { nome: "Variável", cor: "var(--warn)", bg: "var(--warn-soft)" },
};
