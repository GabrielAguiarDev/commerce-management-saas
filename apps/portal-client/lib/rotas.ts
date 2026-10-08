import type { ModuleKey } from "@/types/types";

/**
 * Uma rota por módulo. O design guardava a tela num estado (`telaVendas`,
 * `telaCaixa`…); aqui quem guarda é a URL, como no portal-admin — assim o
 * botão "voltar" do navegador funciona e cada tela pode ser um link de verdade.
 */
export const ROUTES: Record<ModuleKey, string> = {
  dashboard: "/",
  sales: "/vendas",
  products: "/produtos",
  stock: "/estoque",
  register: "/caixa",
  costs: "/custos",
  reports: "/relatorios",
  settings: "/configuracoes",
  /** A mensalidade da plataforma — só o dono do negócio chega aqui. */
  billing: "/assinatura",
  support: "/suporte",
  /**
   * A lista de documentos emitidos. O CADASTRO fiscal continua em
   * Configurações › Dados fiscais — é configuração, não operação; aqui é o
   * dia a dia: o que saiu, o que foi recusado e por quê.
   */
  fiscal: "/notas",
};

/** O PDV é uma tela independente, aberta a partir de qualquer módulo. */
export const POS_ROUTE = "/nova-venda";

export function ticketRoute(id: string): string {
  return `/suporte/${id}`;
}

/** Qual módulo a rota atual representa — é o que acende o item do menu. */
export function moduleFromRoute(pathname: string): ModuleKey | null {
  if (pathname === ROUTES.dashboard) return "dashboard";

  const found = (Object.keys(ROUTES) as ModuleKey[]).find(
    (k) => k !== "dashboard" && (pathname === ROUTES[k] || pathname.startsWith(ROUTES[k] + "/")),
  );
  return found ?? null;
}

/** O id do chamado numa rota /suporte/1084, ou `null` fora dela. */
export function ticketFromRoute(pathname: string): string | null {
  const m = /^\/suporte\/([^/]+)$/.exec(pathname);
  return m ? m[1] : null;
}
