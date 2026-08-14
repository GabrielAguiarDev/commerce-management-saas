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
 * está tentando trocar a senha. É de lá que ela pede outro.
 */
export default async function Page() {
  if (!supabaseConfigurado()) redirect("/esqueci-senha");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/esqueci-senha");

  return <RedefinirSenhaView email={user.email ?? ""} />;
}
