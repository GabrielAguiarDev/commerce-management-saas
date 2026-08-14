import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const LOGIN = "/login";

/**
 * As rotas que existem JUSTAMENTE para quem ainda não tem sessão.
 *
 * `/auth/confirmar` é a que não pode faltar: é o destino do link do e-mail de
 * senha, e quem clica nele chega sem cookie nenhum — a sessão só nasce lá
 * dentro, quando o `verifyOtp` troca o token. Fora desta lista, o middleware
 * mandaria a pessoa para o login antes de o handler rodar, e o fluxo morreria
 * calado: o e-mail chega, o link funciona, e mesmo assim a tela sempre diz
 * "link inválido".
 *
 * `/redefinir-senha` também entra, e por um motivo diferente: quem chega nela
 * TEM sessão, mas ela precisa continuar acessível se o cookie já tiver
 * expirado — quem decide o que fazer nesse caso é a própria página, que manda
 * de volta para `/esqueci-senha` em vez de para o login.
 */
const PUBLIC_ROUTES = [LOGIN, "/esqueci-senha", "/auth/confirmar", "/redefinir-senha"];

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
export async function proxy(request: NextRequest) {
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
  const isPublic = PUBLIC_ROUTES.includes(request.nextUrl.pathname);

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

  if (!user) return isPublic ? response : redirect(LOGIN);

  // Logado — falta saber se este usuário é de um comércio. A consulta passa
  // pelo RLS com a sessão dele, que enxerga apenas o próprio perfil.
  //
  // As duas recusas abaixo poupam as rotas públicas: numa delas a pessoa pode
  // estar no meio da troca de senha, e trocar a própria senha não depende de
  // ter um negócio ligado à conta. Para o `/login` o efeito é o de sempre —
  // seguir e deixar a tela explicar o `?erro=`.
  const { data: perfil } = await supabase
    .from("profiles")
    .select("tenant_id, is_platform_admin")
    .eq("id", user.id)
    .single();

  if (perfil?.is_platform_admin) {
    // Admin da plataforma entrou no portal errado: a tela de login explica.
    return isPublic ? response : redirect(LOGIN, "e-admin");
  }

  if (!perfil?.tenant_id) {
    return isPublic ? response : redirect(LOGIN, "sem-negocio");
  }

  return inLogin ? redirect("/") : response;
}

export const config = {
  matcher: [
    /**
     * Roda em tudo, menos assets estáticos, imagens e os arquivos do PWA.
     *
     * Os do PWA precisam ficar de fora por um motivo específico: eles são
     * pedidos por quem ainda não tem sessão (o navegador busca o manifesto na
     * tela de login) e pelo próprio service worker, que não segue redirecionamento
     * como uma aba faria. Passando por aqui, cada um receberia o HTML do login
     * no lugar do arquivo:
     *   - `serwist/`           o `/serwist/sw.js`, o worker em si;
     *   - `manifest.webmanifest` sem ele o navegador não oferece a instalação;
     *   - `offline.html`       a tela servida quando não há nada em cache;
     *   - `icons/`            os ícones do app instalado.
     */
    "/((?!_next/static|_next/image|favicon.ico|serwist/|manifest.webmanifest|offline.html|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
