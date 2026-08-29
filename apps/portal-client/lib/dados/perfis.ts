import type { ModuleKey } from "@/types/types";

/** Sigla e nome de cada módulo, para o menu e os selos de acesso. */
export const MODULES: Record<ModuleKey, { initials: string; name: string }> = {
  dashboard: { initials: "DS", name: "Dashboard" },
  sales: { initials: "VD", name: "Vendas" },
  products: { initials: "PR", name: "Produtos" },
  stock: { initials: "ET", name: "Estoque" },
  register: { initials: "CX", name: "Caixa" },
  costs: { initials: "CU", name: "Custos" },
  reports: { initials: "RL", name: "Relatórios" },
  fiscal: { initials: "NF", name: "Nota Fiscal" },
  settings: { initials: "CF", name: "Configurações" },
  support: { initials: "SP", name: "Suporte" },
};

/** A ordem do menu lateral, agrupada pelo que a pessoa vem fazer no portal. */
export const GROUPS: { title: string; items: ModuleKey[] }[] = [
  { title: "Operação", items: ["dashboard", "sales", "register"] },
  { title: "Catálogo", items: ["products", "stock"] },
  { title: "Gestão", items: ["costs", "reports", "fiscal"] },
  { title: "Sistema", items: ["settings", "support"] },
];

/**
 * Módulos que um tipo de acesso pode liberar.
 *
 * `dashboard` e `config` ficam de fora porque todo mundo os tem — não são
 * permissão, são o mínimo para a pessoa conseguir usar o portal. `suporte`
 * idem: quem trabalha no negócio precisa poder pedir ajuda.
 */
export const PERMISSION_MODULES: ModuleKey[] = [
  "sales",
  "products",
  "stock",
  "register",
  "costs",
  "reports",
  // Quem vê a nota vê o CNPJ do negócio e o histórico fiscal inteiro. Não é
  // tela de balconista por padrão — por isso é permissão, e não item base.
  "fiscal",
];
