import type { ModuleKey } from "@/types/types";

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
const DB_TO_PORTAL: Record<string, ModuleKey> = {
  sales: "sales",
  products: "products",
  stock: "stock",
  cash: "register",
  costs: "costs",
  reports: "reports",
  fiscal: "fiscal",
  support: "support",
};

/** O caminho inverso, para quando a interface precisa perguntar pelo banco. */
export const PORTAL_TO_DB: Partial<Record<ModuleKey, string>> = Object.fromEntries(
  Object.entries(DB_TO_PORTAL).map(([db, portal]) => [portal, db]),
) as Partial<Record<ModuleKey, string>>;

/** Módulos que todo cliente tem, sem depender do plano. */
export const BASE_MODULES: ModuleKey[] = ["dashboard", "settings"];

/**
 * Converte as linhas de `v_active_modules` na lista que o menu e as telas leem.
 *
 * A ordem é a do menu, não a do banco: assim a barra lateral sai estável
 * independentemente de como a consulta voltou.
 */
const ORDER: ModuleKey[] = [
  "dashboard",
  "sales",
  "register",
  "products",
  "stock",
  "costs",
  "reports",
  "fiscal",
  "settings",
  "support",
];

export function tenantModules(rows: { key: string; is_access: boolean | null }[]): ModuleKey[] {
  const active = new Set<ModuleKey>(BASE_MODULES);

  for (const l of rows) {
    if (l.is_access) continue; // 'app' e afins não são tela do portal.
    const k = DB_TO_PORTAL[l.key];
    if (k) active.add(k);
  }

  return ORDER.filter((k) => active.has(k));
}
