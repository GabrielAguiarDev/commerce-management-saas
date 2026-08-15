import { redirect } from "next/navigation";
import { RedefinirSenhaView } from "@/components/views/RedefinirSenhaView";
import { createClient, supabaseConfigurado } from "@/lib/supabase/server";

/**
 * A tela da nova senha só existe para quem acabou de vir do link do e-mail.
 *
 * A checagem é aqui, no SERVIDOR, e não no middleware: o `proxy.ts` trata esta
 * rota como pública — precisa tratar, porque a sessão dela é recém-nascida —,
 * então quem diz "sem sessão, volte ao começo" é esta página.
 *
 * Sem sessão a pessoa vai para `/esqueci-senha`, não para o login: quem digita
 * este endereço na mão, ou volta a ele um dia depois com o link já vencido,
 * está tentando trocar a senha. Vale também para quem chegou pelo convite com o
 * link vencido: é de `/esqueci-senha` que sai um link novo, e ele leva de volta
 * para cá — a conta existe desde o convite, mesmo sem senha nunca definida.
 *
 * SOBRE `?primeiro_acesso=1`: quem chega por CONVITE está definindo a primeira
 * senha, e "criar NOVA senha" seria mentira para essa pessoa. Quem põe o
 * parâmetro é `app/auth/confirmar/route.ts`, ao reconhecer um link `invite`.
 * Ele muda a REDAÇÃO e nada mais — não é permissão, não abre porta nenhuma:
 * quem manda é a sessão conferida logo acima, e forjar o parâmetro na barra de
 * endereços só troca palavras na tela de quem já está autenticado.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ primeiro_acesso?: string }>;
}) {
  if (!supabaseConfigurado()) redirect("/esqueci-senha");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/esqueci-senha");

  const { primeiro_acesso } = await searchParams;

  return <RedefinirSenhaView email={user.email ?? ""} firstAccess={primeiro_acesso === "1"} />;
}
