import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createClient, supabaseConfigurado } from "@/lib/supabase/server";

/**
 * O destino do link do e-mail de redefinição de senha.
 *
 * O template do Supabase aponta para cá:
 *   `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery`
 * e o `{{ .RedirectTo }}` é o que a Server Action mandou em `redirectTo` —
 * `NEXT_PUBLIC_SITE_URL` + esta rota.
 *
 * O que acontece aqui é a troca do token de uso único por uma SESSÃO: o
 * `verifyOtp` grava o cookie na resposta, e é por isso que a tela seguinte já
 * encontra a pessoa autenticada e pode chamar `updateUser`.
 *
 * ATENÇÃO ao `proxy.ts`: esta rota é visitada por quem AINDA NÃO TEM sessão —
 * o cookie só nasce no meio dela. Se o middleware não a tratasse como pública,
 * mandaria a pessoa para o login antes deste código rodar, e o fluxo inteiro
 * morreria calado, sempre com a mesma cara de "link inválido". Ver a lista
 * `PUBLIC_ROUTES` lá.
 *
 * `redirect()` do `next/navigation`, e não um `NextResponse.redirect` montado à
 * mão: é ele que carrega para a resposta os cookies que o `verifyOtp` acabou de
 * gravar via `next/headers`. Uma resposta nova sairia sem a sessão, e a tela de
 * nova senha devolveria a pessoa para o começo.
 *
 * SOBRE O OUTRO FORMATO DE LINK (`?code=...`): existe e NÃO é aceito aqui, de
 * propósito. É o que o template PADRÃO do Supabase gera quando o customizado
 * não está no ar, e trocá-lo por sessão seria um `exchangeCodeForSession`. O
 * problema é que o `code` não diz de que tipo de e-mail ele veio: aceitá-lo
 * aqui abriria a mesma porta para um link de CONVITE (`inviteUserByEmail`, em
 * `portal-admin/app/clientes/actions.ts`), que hoje nem manda `redirectTo` e
 * cai no Site URL do projeto. Um endereço que existe para recuperação de senha
 * passaria a criar sessão para um fluxo que ninguém revisou para isso. Se o
 * template padrão voltar, o sintoma é um "link inválido" com `code` na lista de
 * chaves logada abaixo — o conserto é o template, não esta rota.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type");

  /**
   * Um único destino para toda falha — link velho, já usado, adulterado ou sem
   * parâmetro. A tela de login explica o que fazer. Não separamos os casos: a
   * diferença não muda o que a pessoa precisa fazer (pedir outro link), e
   * contaria a um curioso se aquele token já existiu.
   */
  const INVALID = "/login?erro=link_invalido";

  // `recovery` e nada mais. Este endpoint existe para uma coisa só, e aceitar
  // outros tipos de OTP aqui abriria uma porta de sessão que ninguém pediu.
  //
  // O log lista só as CHAVES da query, nunca os valores: um `token_hash` ou um
  // `code` no log do servidor é uma sessão de graça para quem lê o log. As
  // chaves bastam para o diagnóstico — é por elas que se vê um `code` sozinho
  // (template padrão de volta) ou um `type` que não é `recovery`.
  if (!tokenHash || type !== "recovery") {
    console.error(
      "[auth/confirmar] link não reconhecido — chaves recebidas:",
      [...params.keys()].join(", ") || "(nenhuma)",
    );
    redirect(INVALID);
  }

  if (!supabaseConfigurado()) {
    console.error("[auth/confirmar] Supabase não configurado neste ambiente");
    redirect(INVALID);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });

  if (error) {
    console.error("[auth/confirmar] verifyOtp falhou:", error.message);
    redirect(INVALID);
  }

  redirect("/redefinir-senha");
}
