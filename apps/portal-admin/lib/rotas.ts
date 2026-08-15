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
  /** Pede o link de recuperação por e-mail. */
  esqueciSenha: "/esqueci-senha",
  /** Escolhe a nova senha, já com a sessão criada pelo link. */
  redefinirSenha: "/redefinir-senha",
  /** O destino do link do e-mail: troca o token por sessão. */
  authConfirmar: "/auth/confirmar",
  /** Importação de catálogo, sempre dentro da ficha de um cliente. */
  importarProdutos: (id: string) => `${ROUTES.customers}/${id}/importar`,
} as const;

/**
 * As rotas que existem JUSTAMENTE para quem ainda não tem sessão.
 *
 * `/auth/confirmar` é a que não pode faltar: é o destino do link do e-mail de
 * senha, e quem clica nele chega sem cookie nenhum — a sessão só nasce lá
 * dentro, quando o `verifyOtp` troca o token. Fora desta lista, o `proxy.ts`
 * mandaria a pessoa para o login antes de o handler rodar, e o fluxo morreria
 * calado: o e-mail chega, o link funciona, e mesmo assim a tela sempre diz
 * "link inválido".
 *
 * `/redefinir-senha` também entra, e por um motivo diferente: quem chega nela
 * TEM sessão, mas ela precisa continuar acessível se o cookie já tiver
 * expirado — quem decide o que fazer nesse caso é a própria página, que manda
 * de volta para `/esqueci-senha` em vez de para o login.
 *
 * É a mesma lista que o `AdminShell` usa para saber que a tela ocupa a janela
 * inteira, sem barra lateral nem cabeçalho.
 */
export const PUBLIC_ROUTES: string[] = [
  ROUTES.login,
  ROUTES.esqueciSenha,
  ROUTES.authConfirmar,
  ROUTES.redefinirSenha,
];

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
