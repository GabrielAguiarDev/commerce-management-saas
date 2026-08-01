import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Mantém a sessão do admin viva entre requisições.
 *
 * Server Components não escrevem cookies, então é aqui que o token é renovado.
 * Sem isto, a Server Action de cadastro veria `getUser()` vazio depois de um
 * tempo e recusaria a operação, mesmo com o admin logado.
 *
 * Segurança: usa apenas a chave pública. A `service_role` não entra no
 * middleware — ele roda em toda requisição, inclusive de quem não está logado.
 */
export async function middleware(request: NextRequest) {
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
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Roda em tudo, menos assets estáticos e imagens.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
