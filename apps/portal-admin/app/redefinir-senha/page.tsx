import { redirect } from "next/navigation";
import { RedefinirSenhaView } from "@/components/views/RedefinirSenhaView";
import { ROUTES } from "@/lib/rotas";
import { createClient, supabaseConfigurado } from "@/lib/supabase/server";

/**
 * A tela da nova senha só existe para quem acabou de vir do link do e-mail.
 *
 * A checagem é aqui, no SERVIDOR, e não no `proxy.ts`: o middleware trata esta
 * rota como pública — precisa tratar, porque a sessão dela é recém-nascida —,
 * então quem diz "sem sessão, volte ao começo" é esta página. Sem isto o
 * formulário apareceria para qualquer visitante, que digitaria duas senhas para
 * ver um erro no fim; era esse o comportamento antigo, quando a tela era um
 * estado interno do `LoginView` alcançável por um botão.
 *
 * Sem sessão a pessoa vai para `/esqueci-senha`, não para o login: quem digita
 * este endereço na mão, ou volta a ele um dia depois com o link já vencido,
 * está tentando trocar a senha. É de lá que ela pede outro.
 */
export default async function Page() {
  if (!supabaseConfigurado()) redirect(ROUTES.esqueciSenha);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(ROUTES.esqueciSenha);

  return <RedefinirSenhaView email={user.email ?? ""} />;
}
