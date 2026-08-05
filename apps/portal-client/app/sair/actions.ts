"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Encerra a sessão.
 *
 * Roda no servidor para que o cookie seja apagado na resposta — fazer isso só
 * no navegador deixaria o token válido para a próxima requisição de servidor.
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
