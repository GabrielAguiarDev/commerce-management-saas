import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createClient, supabaseConfigurado } from "@/lib/supabase/server";

/**
 * O destino dos links de e-mail que criam sessão sem senha: a redefinição
 * (`recovery`) e o CONVITE de primeiro acesso (`invite`).
 *
 * Os templates do Supabase apontam para cá:
 *   `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery`
 *   `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=invite`
 * e o `{{ .RedirectTo }}` é o que o outro lado mandou em `redirectTo`:
 *   - recuperação: `NEXT_PUBLIC_SITE_URL` + esta rota, de `app/esqueci-senha`;
 *   - convite: `NEXT_PUBLIC_PORTAL_CLIENTE_URL` + esta rota, mandado pelo
 *     CONSOLE ao cadastrar o cliente (`portal-admin/app/clientes/actions.ts`).
 *
 * OS DOIS TERMINAM NA MESMA TELA, e é isso que junta os fluxos: quem recupera
 * troca a senha; quem foi convidado define a PRIMEIRA. A diferença aparece só
 * na redação, por `?primeiro_acesso=1` na ida para `/redefinir-senha` — ver
 * `app/redefinir-senha/page.tsx`.
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
 * SOBRE O OUTRO FORMATO DE LINK (`?code=...`): existe e continua NÃO sendo
 * aceito aqui, de propósito. É o que o template PADRÃO do Supabase gera quando
 * o customizado não está no ar, e trocá-lo por sessão seria um
 * `exchangeCodeForSession`. O problema é que o `code` não diz de que tipo de
 * e-mail ele veio — e isso não melhorou por esta rota passar a aceitar dois
 * tipos: aceitar `code` seria criar sessão a partir de QUALQUER e-mail que o
 * projeto dispare, inclusive os que ninguém revisou para isso. O que decide o
 * que entra aqui é o `type` explícito, conferido contra a lista fechada abaixo.
 * Se o template padrão voltar, o sintoma é um "link inválido" com `code` na
 * lista de chaves logada abaixo — o conserto é o template, não esta rota.
 */

/**
 * Os únicos tipos de OTP que viram sessão aqui.
 *
 * A lista é FECHADA e o valor da query é conferido contra ela antes de chegar
 * ao `verifyOtp` — o tipo cru nunca é repassado. Um `type` livre transformaria
 * este endereço em um trocador genérico de token por sessão, para qualquer
 * e-mail que o projeto saiba disparar (`email_change`, `magiclink`, `signup`),
 * e o alcance desta rota deixaria de ser decidido por este arquivo.
 */
const ACCEPTED = ["recovery", "invite"] as const;
type AcceptedType = (typeof ACCEPTED)[number];

function acceptedType(value: string | null): AcceptedType | null {
  return ACCEPTED.includes(value as AcceptedType) ? (value as AcceptedType) : null;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = acceptedType(params.get("type"));

  /**
   * Um único destino para toda falha — link velho, já usado, adulterado ou sem
   * parâmetro. A tela de login explica o que fazer. Não separamos os casos: a
   * diferença não muda o que a pessoa precisa fazer (pedir outro link), e
   * contaria a um curioso se aquele token já existiu.
   */
  const INVALID = "/login?erro=link_invalido";

  // `recovery` ou `invite`, e nada mais. Aceitar outros tipos de OTP aqui
  // abriria uma porta de sessão que ninguém pediu.
  //
  // O log lista só as CHAVES da query, nunca os valores: um `token_hash` ou um
  // `code` no log do servidor é uma sessão de graça para quem lê o log. As
  // chaves bastam para o diagnóstico — é por elas que se vê um `code` sozinho
  // (template padrão de volta) ou um `type` fora da lista.
  if (!tokenHash || !type) {
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
  // O tipo vai como veio no link — mas já filtrado pela lista fechada acima.
  // Trocar um token de convite dizendo `recovery` (ou o contrário) faz o
  // Supabase recusar o token, e um convite válido viraria "link inválido".
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    console.error("[auth/confirmar] verifyOtp falhou:", error.message);
    redirect(INVALID);
  }

  // Quem veio do convite está criando a PRIMEIRA senha, não trocando a antiga.
  // Só a redação da tela muda; o que ela faz é o mesmo nos dois casos.
  redirect(type === "invite" ? "/redefinir-senha?primeiro_acesso=1" : "/redefinir-senha");
}
