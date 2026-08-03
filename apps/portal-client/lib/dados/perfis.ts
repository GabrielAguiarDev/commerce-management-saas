import type { ModuloKey, Negocio, PerfilKey } from "@/types/types";

/**
 * Dois negócios de exemplo, escolhidos para provar que o portal é modular.
 *
 * O petshop tem o plano completo; a barraca de acarajé tem seis módulos e nem
 * caixa nem estoque. Trocar o perfil no dashboard remonta menu, KPIs e colunas
 * de tabela sem nenhum `if` espalhado pelas telas — quem manda é `modulos`.
 */
export const PERFIS: Record<PerfilKey, Negocio> = {
  petshop: {
    nome: "Pet & Cia",
    sigla: "PC",
    tipo: "Petshop · Centro",
    user: { nome: "Marcela Dias", sigla: "MD" },
    modulos: [
      "dashboard",
      "vendas",
      "produtos",
      "estoque",
      "caixa",
      "custos",
      "relatorios",
      "config",
      "suporte",
    ],
    itemPlaceholder: "Ex.: banho e tosa da Mel",
  },
  acaraje: {
    nome: "Acarajé da Dona Rita",
    sigla: "DR",
    tipo: "Comida de rua · Rio Vermelho",
    user: { nome: "Rita Nascimento", sigla: "RN" },
    modulos: ["dashboard", "vendas", "produtos", "custos", "config", "suporte"],
    itemPlaceholder: "Ex.: 2 acarajés completos",
  },
};

export const PERFIS_LISTA: { chave: PerfilKey; nome: string }[] = [
  { chave: "petshop", nome: "Petshop" },
  { chave: "acaraje", nome: "Acarajé" },
];

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

/** Módulos que um tipo de acesso pode liberar — `dashboard` e `suporte` são de todos. */
export const MODULOS_PERM: ModuloKey[] = [
  "vendas",
  "produtos",
  "estoque",
  "caixa",
  "custos",
  "relatorios",
  "config",
];
