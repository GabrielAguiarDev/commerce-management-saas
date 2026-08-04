import type { ModuloKey } from "@/types/types";

/** Sigla e nome de cada módulo, para o menu e os selos de acesso. */
export const MODULOS: Record<ModuloKey, { sigla: string; nome: string }> = {
  dashboard: { sigla: "DS", nome: "Dashboard" },
  vendas: { sigla: "VD", nome: "Vendas" },
  produtos: { sigla: "PR", nome: "Produtos" },
  estoque: { sigla: "ET", nome: "Estoque" },
  caixa: { sigla: "CX", nome: "Caixa" },
  custos: { sigla: "CU", nome: "Custos" },
  relatorios: { sigla: "RL", nome: "Relatórios" },
  config: { sigla: "CF", nome: "Configurações" },
  suporte: { sigla: "SP", nome: "Suporte" },
};

/** A ordem do menu lateral, agrupada pelo que a pessoa vem fazer no portal. */
export const GRUPOS: { titulo: string; itens: ModuloKey[] }[] = [
  { titulo: "Operação", itens: ["dashboard", "vendas", "caixa"] },
  { titulo: "Catálogo", itens: ["produtos", "estoque"] },
  { titulo: "Gestão", itens: ["custos", "relatorios"] },
  { titulo: "Sistema", itens: ["config", "suporte"] },
];

/**
 * Módulos que um tipo de acesso pode liberar.
 *
 * `dashboard` e `config` ficam de fora porque todo mundo os tem — não são
 * permissão, são o mínimo para a pessoa conseguir usar o portal. `suporte`
 * idem: quem trabalha no negócio precisa poder pedir ajuda.
 */
export const MODULOS_PERM: ModuloKey[] = [
  "vendas",
  "produtos",
  "estoque",
  "caixa",
  "custos",
  "relatorios",
];
