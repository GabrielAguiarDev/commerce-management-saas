/**
 * REGRA COMERCIAL — fonte única da verdade sobre planos e módulos.
 *
 * Tudo o que define "o que cada plano libera", "quanto custa" e "como cada
 * módulo se chama" está neste arquivo. Para mudar a oferta, mude AQUI: nem a
 * Server Action nem a interface guardam essa regra por conta própria.
 *
 * As chaves são as mesmas da tabela `modules` do banco (em inglês).
 */

export type Plano = "free" | "paid" | "custom";

export const PLANOS: Plano[] = ["free", "paid", "custom"];

export const ROTULO_PLANO: Record<Plano, string> = {
  free: "Gratuito",
  paid: "Pago",
  custom: "Customizado",
};

// =====================================================================
// APRESENTAÇÃO DOS MÓDULOS
//
// O catálogo em si (chave, nome, descrição, se é módulo de acesso) vive na
// tabela `modules` e é lido por `lib/modulos.ts`. O que sobra aqui é o que o
// banco não guarda: as duas letras do ícone, que são decisão de interface.
//
// As chaves são as mesmas da tabela `modules`.
// =====================================================================

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
// PACOTES POR PLANO
//
// Gratuito e Pago têm pacote FECHADO: o admin vê quais módulos vêm, mas não
// escolhe. Só o Customizado permite montar a combinação livremente.
// =====================================================================

export const PACOTES_FIXOS: Record<"free" | "paid", readonly string[]> = {
  // Gratuito: o essencial para o comércio começar a operar.
  free: ["sales", "products", "costs"],

  // Pago: todos os módulos de função, mais o acesso ao app mobile.
  paid: ["sales", "products", "stock", "cash", "costs", "reports", "support", "app"],
};

/**
 * Sugestão inicial ao abrir o plano Customizado. É só um ponto de partida —
 * o admin liga e desliga o que quiser a partir daí.
 */
export const SUGESTAO_CUSTOM: readonly string[] = PACOTES_FIXOS.paid;

/** Planos de pacote fechado (grade só de leitura na interface). */
export function ehPlanoFixo(plano: Plano): plano is "free" | "paid" {
  return plano === "free" || plano === "paid";
}

/**
 * Decide os módulos que serão ativados. É a função que aplica a regra —
 * chamada tanto pela interface (para mostrar) quanto pela Server Action (para
 * gravar), então as duas nunca discordam.
 *
 * Num plano fixo, `escolhidos` é ignorado de propósito: mesmo que alguém
 * forjasse a requisição marcando módulos extras, o pacote do plano prevalece.
 *
 * Não filtra mais contra uma lista de chaves em código: o catálogo agora vem
 * da tabela `modules`, e é o banco que rejeita uma chave inválida — tanto na
 * `admin_create_tenant` quanto na `admin_update_tenant`, que conferem cada
 * chave contra `modules` e falham a transação inteira se alguma não existir.
 * Duplicar a lista aqui só recriaria a divergência que acabamos de eliminar.
 */
export function modulosDoPlano(plano: Plano, escolhidos: readonly string[] = []): string[] {
  if (ehPlanoFixo(plano)) return [...PACOTES_FIXOS[plano]];
  // Customizado: só o que foi marcado, sem repetição.
  return [...new Set(escolhidos)];
}

// =====================================================================
// PREÇO
// =====================================================================

/**
 * Mensalidade padrão em reais. `custom` é `null` porque o valor é negociado
 * caso a caso e vem do formulário.
 */
export const MENSALIDADE_PADRAO: Record<Plano, number | null> = {
  free: 0,
  paid: 89,
  custom: null,
};

export function ehPlanoValido(v: unknown): v is Plano {
  return typeof v === "string" && (PLANOS as string[]).includes(v);
}
