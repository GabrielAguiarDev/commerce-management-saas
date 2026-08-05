import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const LOGIN = "/login";

/**
 * Mantém a sessão do dono do comércio viva e barra quem não pode usar o portal.
 *
 * Server Components não escrevem cookies, então é aqui que o token é renovado.
 * Sem isto, uma Server Action veria `getUser()` vazio depois de um tempo e
 * recusaria a operação com o usuário ainda logado na tela.
 *
 * As regras do portal (ver `docs/api/setup-client-supabase.md`, passo 7):
 *   - precisa estar logado;
 *   - o perfil precisa ter `tenant_id` (pertence a um negócio);
 *   - não pode ser admin de plataforma — esse usa o painel admin.
 *
 * Esta é a primeira camada, não a única: o RLS continua valendo em cada
 * consulta, e as Server Actions revalidam a sessão por conta própria.
 *
 * Segurança: só a chave pública entra aqui. O middleware roda em toda
 * requisição, inclusive de quem não está logado.
 */
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Sem credenciais o middleware sai de cena em vez de derrubar todas as rotas.
  // O portal segue navegável (vazio) e volta a exigir login assim que o
  // .env.local existir.
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
  const redirect = (destino: string, error?: string) => {
    const alvo = request.nextUrl.clone();
    alvo.pathname = destino;
    alvo.search = error ? `erro=${error}` : "";
    const out = NextResponse.redirect(alvo);
    response.cookies.getAll().forEach((c) => out.cookies.set(c));
    return out;
  };

  if (!user) return inLogin ? response : redirect(LOGIN);

  // Logado — falta saber se este usuário é de um comércio. A consulta passa
  // pelo RLS com a sessão dele, que enxerga apenas o próprio perfil.
  const { data: perfil } = await supabase
    .from("profiles")
    .select("tenant_id, is_platform_admin")
    .eq("id", user.id)
    .single();

  if (perfil?.is_platform_admin) {
    // Admin da plataforma entrou no portal errado: a tela de login explica.
    return inLogin ? response : redirect(LOGIN, "e-admin");
  }

  if (!perfil?.tenant_id) {
    return inLogin ? response : redirect(LOGIN, "sem-negocio");
  }

  return inLogin ? redirect("/") : response;
}

export const settings = {
  matcher: [
    // Roda em tudo, menos assets estáticos e imagens.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
