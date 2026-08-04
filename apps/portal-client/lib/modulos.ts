import type { ModuloKey } from "@/types/types";

/**
 * A ponte entre as chaves do banco (`modules.key`, em inglês) e as do portal.
 *
 * Não é um mapeamento 1-para-1 de propósito:
 *
 * - `dashboard` e `config` NÃO existem como módulo no banco. São o mínimo que
 *   todo cliente enxerga — o resumo do próprio negócio e os seus dados. Vender
 *   isso separadamente deixaria alguém sem tela nenhuma ao entrar.
 * - `app` existe no banco mas é módulo de ACESSO (`is_access = true`): libera o
 *   aplicativo mobile, não uma tela do portal. Por isso nunca vira item de menu.
 */
const DB_PARA_PORTAL: Record<string, ModuloKey> = {
  sales: "vendas",
  products: "produtos",
  stock: "estoque",
  cash: "caixa",
  costs: "custos",
  reports: "relatorios",
  support: "suporte",
};

/** O caminho inverso, para quando a interface precisa perguntar pelo banco. */
export const PORTAL_PARA_DB: Partial<Record<ModuloKey, string>> = Object.fromEntries(
  Object.entries(DB_PARA_PORTAL).map(([db, portal]) => [portal, db]),
) as Partial<Record<ModuloKey, string>>;

/** Módulos que todo cliente tem, sem depender do plano. */
export const MODULOS_BASE: ModuloKey[] = ["dashboard", "config"];

/**
 * Converte as linhas de `v_active_modules` na lista que o menu e as telas leem.
 *
 * A ordem é a do menu, não a do banco: assim a barra lateral sai estável
 * independentemente de como a consulta voltou.
 */
const ORDEM: ModuloKey[] = [
  "dashboard",
  "vendas",
  "caixa",
  "produtos",
  "estoque",
  "custos",
  "relatorios",
  "config",
  "suporte",
];

export function modulosDoTenant(linhas: { key: string; is_access: boolean | null }[]): ModuloKey[] {
  const ativos = new Set<ModuloKey>(MODULOS_BASE);

  for (const l of linhas) {
    if (l.is_access) continue; // 'app' e afins não são tela do portal.
    const k = DB_PARA_PORTAL[l.key];
    if (k) ativos.add(k);
  }

  return ORDEM.filter((k) => ativos.has(k));
}
