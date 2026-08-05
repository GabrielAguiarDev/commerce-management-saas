import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const LOGIN = "/login";

/**
 * Mantém a sessão do admin viva entre requisições E barra a entrada de quem
 * não é admin da plataforma.
 *
 * Server Components não escrevem cookies, então é aqui que o token é renovado.
 * Sem isto, a Server Action de cadastro veria `getUser()` vazio depois de um
 * tempo e recusaria a operação, mesmo com o admin logado.
 *
 * A proteção fica aqui porque este é o único lugar que enxerga o caminho pedido
 * antes de qualquer tela renderizar — nenhuma página do painel chega a existir
 * para quem não passou por esta checagem. Ela não substitui o RLS nem a
 * autorização das Server Actions: é a primeira camada, não a única.
 *
 * Segurança: usa apenas a chave pública. A `service_role` não entra no
 * middleware — ele roda em toda requisição, inclusive de quem não está logado.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Enquanto o .env.local não estiver preenchido, o middleware sai de cena em
  // vez de derrubar todas as rotas — o painel segue navegável com os dados de
  // exemplo. Assim que as credenciais existirem, a renovação de sessão passa a
  // valer sozinha. (A Server Action de cadastro continua exigindo sessão real:
  // sem credenciais ela recusa a operação, que é o comportamento correto.)
  if (!url || !anonKey) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Renova o token. NÃO coloque lógica entre criar o cliente e esta chamada.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const inLogin = request.nextUrl.pathname === LOGIN;

  /**
   * Redireciona preservando os cookies que o `setAll` acabou de gravar em
   * `response`. Um `NextResponse.redirect` novo nasce sem eles — e perder o
   * token recém-renovado jogaria o usuário num laço de logins.
   */
  const redirect = (destination: string, error?: string) => {
    const url = request.nextUrl.clone();
    url.pathname = destination;
    url.search = error ? `erro=${error}` : "";
    const out = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => out.cookies.set(c));
    return out;
  };

  if (!user) {
    return inLogin ? response : redirect(LOGIN);
  }

  // Logado — falta saber se é o admin da plataforma. A consulta passa pelo RLS
  // com a sessão do próprio usuário, que enxerga apenas o seu perfil.
  const { data: perfil } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .single();

  if (!perfil?.is_platform_admin) {
    // Dono de comércio logando no painel errado: fica na tela de login, que
    // explica o motivo, em vez de ver o painel vazio por conta do RLS.
    return inLogin ? response : redirect(LOGIN, "nao-admin");
  }

  // Admin já logado não precisa da tela de login.
  return inLogin ? redirect("/") : response;
}

export const config = {
  matcher: [
    // Roda em tudo, menos assets estáticos e imagens.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
