import type { CatalogModule, ModuleKey } from "@/types/types";

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

/* -------------------------------------------------------------------------- */
/* Catálogo — o que existe para vender, ativo ou não                           */
/* -------------------------------------------------------------------------- */

/**
 * A ordem em que vale a pena sugerir um módulo que o cliente ainda não tem.
 *
 * É uma lista, e não um sorteio, por duas razões: o cartão não pode trocar de
 * módulo a cada render (piscaria a cada navegação), e a sugestão é uma decisão
 * comercial — quem edita esta lista está escolhendo o que oferecer primeiro.
 *
 * `dashboard`, `settings` e `support` ficam de fora: todo cliente já os tem.
 */
export const SUGGESTION_ORDER: ModuleKey[] = [
  "register",
  "stock",
  "costs",
  "reports",
  "products",
  "sales",
];

/**
 * A frase de cada módulo quando `modules.description` não vem.
 *
 * O nome preferencial é sempre o do banco. Isto aqui é a rede de segurança
 * para o caso de o RLS do tenant não alcançar a tabela `modules` — o cartão
 * sai completo do mesmo jeito, em vez de sair sem texto.
 */
const FALLBACK_CATALOG: Record<ModuleKey, { name: string; benefit: string }> = {
  dashboard: { name: "Dashboard", benefit: "O resumo do seu negócio." },
  sales: { name: "Vendas", benefit: "Registre cada venda e veja o dia fechar sozinho." },
  products: { name: "Produtos", benefit: "Seu catálogo com preço, custo e margem em um lugar." },
  stock: { name: "Estoque", benefit: "Saiba o que está acabando antes do cliente perguntar." },
  register: { name: "Caixa", benefit: "Abra e feche o caixa com a conferência já pronta." },
  costs: { name: "Custos", benefit: "Lance suas despesas e veja o lucro de verdade." },
  reports: { name: "Relatórios", benefit: "Compare períodos e descubra o que mais vende." },
  settings: { name: "Configurações", benefit: "Os dados e a equipe do seu negócio." },
  support: { name: "Suporte", benefit: "Fale com a nossa equipe direto pelo portal." },
};

interface CatalogRow {
  key: string;
  name: string | null;
  description: string | null;
  is_access: boolean | null;
}

/**
 * Monta o catálogo a partir de `modules`, com o código como reserva.
 *
 * A tabela `modules` é a fonte da verdade: é lá que o nome de um módulo muda
 * sem ninguém precisar publicar o portal. Mas o portal do cliente nunca leu
 * essa tabela — quem lia era o painel administrativo, com um usuário de
 * plataforma. Se o RLS do tenant não alcançar `modules`, a consulta volta
 * vazia e o catálogo sai daqui de dentro, com os mesmos módulos e os mesmos
 * nomes. O cartão de sugestão funciona nos dois casos; o que muda é só quem
 * escreveu o texto.
 */
export function moduleCatalog(rows: CatalogRow[] | null | undefined): CatalogModule[] {
  const fromDb = new Map<ModuleKey, CatalogRow>();

  for (const l of rows ?? []) {
    if (l.is_access) continue; // 'app' e afins não são tela do portal.
    const k = DB_TO_PORTAL[l.key];
    if (k) fromDb.set(k, l);
  }

  return SUGGESTION_ORDER.map((k) => {
    const l = fromDb.get(k);
    const reserva = FALLBACK_CATALOG[k];
    return {
      key: k,
      name: l?.name ?? reserva.name,
      benefit: l?.description ?? reserva.benefit,
    };
  });
}

/**
 * O módulo que vale sugerir a quem tem `active`, ou `null` se não sobrou nenhum.
 *
 * Determinístico de propósito: o primeiro da `SUGGESTION_ORDER` que o cliente
 * ainda não tem. Dois renders seguidos devolvem o mesmo módulo, e dois clientes
 * com o mesmo plano veem a mesma oferta.
 */
export function suggestedModule(
  catalog: CatalogModule[],
  active: ModuleKey[],
): CatalogModule | null {
  const on = new Set(active);
  return catalog.find((m) => !on.has(m.key)) ?? null;
}
