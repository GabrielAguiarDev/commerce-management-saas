"use server";

import { revalidatePath } from "next/cache";
import { requireCustomer, type ActionResult } from "@/lib/sessao";

/**
 * Reenvia um documento recusado.
 *
 * POR QUE ISTO É UMA AÇÃO DA PESSOA, e não da fila automática: rejeição é
 * quase sempre falta de cadastro — NCM ausente, CSOSN errado, CNPJ com dígito
 * trocado. Insistir sozinho nunca conserta nada disso e ainda gasta cota do
 * provedor. Quem reenvia é quem acabou de corrigir, e sabe o que corrigiu.
 *
 * A emissão em si continua sendo da Edge Function: aqui só se pede.
 */
export async function resendDocument(documentId: string): Promise<ActionResult> {
  const session = await requireCustomer("reenviar uma nota");
  if (!session.ok) return session;

  const { supabase } = session;

  // A posse é conferida pela própria policy de select — se o RLS não devolve a
  // linha, ela não é deste tenant. A Edge Function repete a checagem com o JWT
  // de quem chamou; as duas custam pouco e nenhuma delas sozinha bastaria.
  const { data: doc } = await supabase
    .from("fiscal_documents")
    .select("id, status")
    .eq("id", documentId)
    .maybeSingle();

  if (!doc) return { ok: false, message: "Nota não encontrada." };

  // Documento autorizado não se reemite: sairia uma SEGUNDA nota para a mesma
  // venda. Cancelar é outra operação, com prazo e justificativa.
  if (!["pending", "processing", "rejected"].includes(doc.status)) {
    return {
      ok: false,
      message: "Esta nota já foi autorizada. Para desfazê-la, o caminho é o cancelamento.",
    };
  }

  const { error } = await supabase.functions.invoke("fiscal-emit", {
    body: { document_id: documentId },
  });

  if (error) {
    return {
      ok: false,
      message: "Não foi possível falar com o emissor agora. A nota continua na fila.",
    };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
