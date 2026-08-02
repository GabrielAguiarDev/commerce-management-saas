import type { Plano } from "@/types/types";

/**
 * Regras de plano — as que sobraram em código depois que a oferta virou dado.
 *
 * O catálogo de planos (nome, preço, descrição, módulos inclusos) mora na
 * tabela `plans` e é lido por `lib/planosBanco.ts`. O catálogo de módulos mora
 * em `modules` e é lido por `lib/modulos.ts`. Este arquivo não guarda mais
 * nenhum dos dois: só as funções que interpretam essa oferta, e um punhado de
 * apresentação que o banco não tem onde guardar.
 *
 * As chaves são as mesmas da tabela `modules`.
 */

// =====================================================================
// APRESENTAÇÃO
// =====================================================================

/** As duas letras do ícone de cada módulo. Decisão de interface, sem coluna. */
export const SIGLA_MODULO: Record<string, string> = {
  sales: "VD",
  products: "PR",
  stock: "ES",
  cash: "CX",
  costs: "CT",
  reports: "RL",
  support: "SP",
  app: "AP",
};

// =====================================================================
// REGRAS
// =====================================================================

/**
 * Decide os módulos que serão ativados, a partir da composição do plano.
 *
 * É o coração da regra, e existe como função pura de propósito: a interface
 * chama com o plano que veio do provider (para mostrar) e a Server Action
 * chama com a linha que ela mesma leu de `plans` (para gravar). As duas nunca
 * discordam, e a Action nunca depende do que o navegador afirmou.
 *
 * Num plano de pacote fechado, `escolhidos` é ignorado: mesmo que alguém
 * forjasse a requisição marcando módulos extras, o pacote do plano prevalece.
 */
export function resolverModulos(
  ehCustom: boolean,
  modulosDoPlano: readonly string[],
  escolhidos: readonly string[] = [],
): string[] {
  if (!ehCustom) return [...modulosDoPlano];
  // Customizado: só o que foi marcado, sem repetição.
  return [...new Set(escolhidos)];
}

/** Plano de pacote fechado — a grade de módulos fica só de leitura. */
export function ehPlanoFixo(plano: Plano | undefined): boolean {
  return plano?.tipo === "fixo";
}

export function planoPorChave(planos: Plano[], k: string): Plano | undefined {
  return planos.find((p) => p.k === k);
}

/** Atalho para a interface, que trabalha com o formato de tela. */
export function modulosDoPlano(plano: Plano | undefined, escolhidos: readonly string[] = []) {
  if (!plano) return [];
  return resolverModulos(plano.tipo === "custom", plano.mods, escolhidos);
}

/**
 * Completa o plano customizado com todos os módulos do catálogo.
 *
 * `plans.custom.module_keys` é um array vazio no banco — e está certo: "sob
 * medida" não tem composição fixa. Só que o cartão da tela de Planos ficaria
 * anunciando "0 módulos inclusos", o que lê como erro. Aqui ele passa a
 * mostrar o catálogo inteiro, que é o que o admin de fato pode escolher.
 */
export function planosComCatalogo(planos: Plano[], chavesDoBanco: string[]): Plano[] {
  return planos.map((p) =>
    p.tipo === "custom" && p.mods.length === 0 ? { ...p, mods: chavesDoBanco } : p,
  );
}
