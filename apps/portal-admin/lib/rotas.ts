/**
 * Every URL in the admin, in one place. The sidebar highlights from these and
 * the modal's "discard and leave" stores one as its destination.
 */
export const ROTAS = {
  visao: "/",
  clientes: "/clientes",
  financeiro: "/financeiro",
  suporte: "/suporte",
  planos: "/planos",
  modulos: "/modulos",
  config: "/configuracoes",
  login: "/login",
} as const;

export function clienteHref(id: number): string {
  return `${ROTAS.clientes}/${id}`;
}

/** Customer id when the path is a customer record, otherwise null. */
export function clienteIdDaRota(pathname: string): number | null {
  const m = /^\/clientes\/(\d+)\/?$/.exec(pathname);
  return m ? Number(m[1]) : null;
}

/**
 * Whether a sidebar entry should read as current. `/clientes` stays lit while
 * you are inside a customer record.
 */
export function rotaAtiva(pathname: string, href: string): boolean {
  if (href === ROTAS.visao) return pathname === ROTAS.visao;
  return pathname === href || pathname.startsWith(href + "/");
}
