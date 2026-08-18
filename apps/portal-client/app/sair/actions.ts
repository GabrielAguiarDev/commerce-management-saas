"use server";

import { redirect } from "next/navigation";
import { createClient, supabaseConfigurado } from "@/lib/supabase/server";

/**
 * Encerra a sessão.
 *
 * Roda no servidor para que o cookie seja apagado na resposta — fazer isso só
 * no navegador deixaria o token válido para a próxima requisição de servidor.
 *
 * A CHECAGEM DE CREDENCIAL não é zelo excessivo. Sem elas, `createServerClient`
 * ESTOURA ("Your project's URL and Key are required…"), e este era o único
 * caminho do portal que quebrava assim: o `proxy.ts` sai de cena sem
 * credenciais, e `requireCustomer` devolve `{ ok: false }` — os dois deixam o
 * portal navegável e vazio. Só o botão "Sair" derrubava a página com erro de
 * servidor, justamente no ambiente em que a pessoa mais precisa dele para
 * escapar de uma tela quebrada.
 *
 * Sem banco não há sessão para encerrar, então sair é só ir para o login.
 */
export async function signOut() {
  if (supabaseConfigurado()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  redirect("/login");
}
