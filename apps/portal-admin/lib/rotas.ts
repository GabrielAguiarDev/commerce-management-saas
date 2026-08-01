/**
 * Every URL in the admin, in one place. The sidebar highlights from these and
 * the modal's "discard and leave" stores one as its destination.
 */
export const ROTAS = {
  visao: "/",
  clientes: "/clientes",
  novoCliente: "/clientes/novo",
  financeiro: "/financeiro",
  suporte: "/suporte",
  planos: "/planos",
  modulos: "/modulos",
  config: "/configuracoes",
  login: "/login",
} as const;

export function clienteHref(id: string): string {
  return `${ROTAS.clientes}/${id}`;
}

/**
 * Customer id when the path is a customer record, otherwise null.
 *
 * O id é o UUID do tenant. O segmento "novo" é a rota de cadastro, não um id,
 * então fica de fora.
 */
export function clienteIdDaRota(pathname: string): string | null {
  const m = /^\/clientes\/([^/]+)\/?$/.exec(pathname);
  if (!m || m[1] === "novo") return null;
  return decodeURIComponent(m[1]);
}

/**
 * Whether a sidebar entry should read as current. `/clientes` stays lit while
 * you are inside a customer record.
 */
export function rotaAtiva(pathname: string, href: string): boolean {
  if (href === ROTAS.visao) return pathname === ROTAS.visao;
  return pathname === href || pathname.startsWith(href + "/");
}
