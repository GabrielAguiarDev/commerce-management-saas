/**
 * Every URL in the admin, in one place. The sidebar highlights from these and
 * the modal's "discard and leave" stores one as its destination.
 */
export const ROUTES = {
  overview: "/",
  customers: "/clientes",
  novoCliente: "/clientes/novo",
  financeiro: "/financeiro",
  support: "/suporte",
  plans: "/planos",
  modules: "/modulos",
  settings: "/configuracoes",
  login: "/login",
  /** Importação de catálogo, sempre dentro da ficha de um cliente. */
  importarProdutos: (id: string) => `${ROUTES.customers}/${id}/importar`,
} as const;

export function customerHref(id: string): string {
  return `${ROUTES.customers}/${id}`;
}

/**
 * Customer id when the path is a customer record, otherwise null.
 *
 * O id é o UUID do tenant. O segmento "novo" é a rota de cadastro, não um id,
 * então fica de fora.
 */
export function customerIdFromRoute(pathname: string): string | null {
  const m = /^\/customers\/([^/]+)\/?$/.exec(pathname);
  if (!m || m[1] === "novo") return null;
  return decodeURIComponent(m[1]);
}

/**
 * Whether a sidebar entry should read as current. `/clientes` stays lit while
 * you are inside a customer record.
 */
export function isActiveRoute(pathname: string, href: string): boolean {
  if (href === ROUTES.overview) return pathname === ROUTES.overview;
  return pathname === href || pathname.startsWith(href + "/");
}
