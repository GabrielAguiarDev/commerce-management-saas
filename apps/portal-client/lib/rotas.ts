import type { ModuloKey } from "@/types/types";

/**
 * Uma rota por módulo. O design guardava a tela num estado (`telaVendas`,
 * `telaCaixa`…); aqui quem guarda é a URL, como no portal-admin — assim o
 * botão "voltar" do navegador funciona e cada tela pode ser um link de verdade.
 */
export const ROTAS: Record<ModuloKey, string> = {
  dashboard: "/",
  vendas: "/vendas",
  produtos: "/produtos",
  estoque: "/estoque",
  caixa: "/caixa",
  custos: "/custos",
  relatorios: "/relatorios",
  config: "/configuracoes",
  suporte: "/suporte",
};

/** O PDV é filho de Vendas: entra por "Nova venda" e volta para a lista. */
export const ROTA_PDV = "/vendas/nova";

export function rotaChamado(id: string): string {
  return `/suporte/${id}`;
}

/** Qual módulo a rota atual representa — é o que acende o item do menu. */
export function moduloDaRota(pathname: string): ModuloKey | null {
  if (pathname === ROTAS.dashboard) return "dashboard";

  const achado = (Object.keys(ROTAS) as ModuloKey[]).find(
    (k) => k !== "dashboard" && (pathname === ROTAS[k] || pathname.startsWith(ROTAS[k] + "/")),
  );
  return achado ?? null;
}

/** O id do chamado numa rota /suporte/1084, ou `null` fora dela. */
export function chamadoDaRota(pathname: string): string | null {
  const m = /^\/suporte\/([^/]+)$/.exec(pathname);
  return m ? m[1] : null;
}
