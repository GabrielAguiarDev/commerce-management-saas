import type { Plan } from "@/types/types";

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
export const MODULE_INITIALS: Record<string, string> = {
  sales: "VD",
  products: "PR",
  stock: "ES",
  cash: "CX",
  costs: "CT",
  reports: "RL",
  support: "SP",
  fiscal: "NF",
  app: "AP",
};

// =====================================================================
// EM BREVE
// =====================================================================

/**
 * Módulos que existem no catálogo mas ainda NÃO podem ser vendidos.
 *
 * `fiscal` está aqui desde 25/08/2026. O caminho inteiro da NFC-e está escrito
 * — banco, Edge Functions, telas —, mas nenhuma nota foi emitida: falta o
 * certificado digital A1, o credenciamento na SEFAZ e a conta na Focus NFe, e
 * nenhum dos três depende de código. Ver `docs/fiscal/fase-2-emissao.md`.
 *
 * Enquanto a chave estiver nesta lista, o módulo aparece no catálogo com a
 * etiqueta "Em breve" e some de todo lugar em que se ESCOLHE módulo: a grade
 * do cadastro, a ficha do cliente, a composição dos planos e os padrões da
 * plataforma. Ligar de volta é tirar a chave daqui — uma linha.
 */
export const COMING_SOON_MODULES: readonly string[] = ["fiscal"];

export function isComingSoon(k: string): boolean {
  return COMING_SOON_MODULES.includes(k);
}

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
 *
 * Em qualquer um dos dois casos, módulos em `COMING_SOON_MODULES` saem da lista.
 */
export function resolveModules(
  ehCustom: boolean,
  planModules: readonly string[],
  picked: readonly string[] = [],
): string[] {
  // O filtro de "em breve" fica AQUI, e não na interface: esta função é o
  // ponto por onde passam as duas escritas de módulo de um cliente (cadastro e
  // ficha). Um plano antigo que ainda carregue a chave no `module_keys`, ou uma
  // requisição forjada, morre neste ponto em vez de ligar uma tela inacabada.
  const vendavel = (k: string) => !isComingSoon(k);

  if (!ehCustom) return planModules.filter(vendavel);
  // Customizado: só o que foi marcado, sem repetição.
  return [...new Set(picked)].filter(vendavel);
}

/** Plano de pacote fechado — a grade de módulos fica só de leitura. */
export function isFixedPlan(plan: Plan | undefined): boolean {
  return plan?.type === "fixed";
}

export function planByKey(plans: Plan[], k: string): Plan | undefined {
  return plans.find((p) => p.k === k);
}

/** Atalho para a interface, que trabalha com o formato de tela. */
export function planModules(plan: Plan | undefined, picked: readonly string[] = []) {
  if (!plan) return [];
  return resolveModules(plan.type === "custom", plan.mods, picked);
}

/**
 * Completa o plano customizado com todos os módulos do catálogo.
 *
 * `plans.custom.module_keys` é um array vazio no banco — e está certo: "sob
 * medida" não tem composição fixa. Só que o cartão da tela de Planos ficaria
 * anunciando "0 módulos inclusos", o que lê como erro. Aqui ele passa a
 * mostrar o catálogo inteiro, que é o que o admin de fato pode escolher.
 */
export function plansWithCatalog(plans: Plan[], chavesDoBanco: string[]): Plan[] {
  return plans.map((p) =>
    p.type === "custom" && p.mods.length === 0 ? { ...p, mods: chavesDoBanco } : p,
  );
}
