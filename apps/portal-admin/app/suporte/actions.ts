"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TicketStatus } from "@/types/types";

/**
 * Ações do Suporte: responder um chamado e mudar o status.
 *
 * POR QUE SERVER ACTION E NÃO ESCRITA DIRETO DO NAVEGADOR: quem escreve aqui é
 * o suporte da plataforma, e essa identidade precisa ser conferida no servidor.
 * O navegador só chama a função; a checagem de `is_platform_admin` abaixo é a
 * única que um chamador não consegue pular.
 *
 * POR QUE O CLIENTE DE SERVIDOR (com sessão) E NÃO A `service_role`: gravar uma
 * mensagem não é operação privilegiada — o RLS já autoriza o admin a escrever
 * nos chamados de qualquer tenant. Furar o RLS aqui só perderia proteção.
 *
 * ┌─ SUPOSIÇÕES SOBRE O SCHEMA ────────────────────────────────────────────┐
 * │ `status` e `sender_side` são texto livre no PostgREST, então os valores │
 * │ abaixo vêm dos defaults da tabela ('open', 'normal') e do vocabulário   │
 * │ do portal do cliente. Se houver um CHECK com outros valores, a gravação │
 * │ falha e a mensagem do banco aparece na tela — não grava errado calado.  │
 * └────────────────────────────────────────────────────────────────────────┘
 */

/** Tradução inversa da leitura em `lib/chamados.ts`. */
const TO_DB: Record<TicketStatus, string> = {
  open: "open",
  inProgress: "in_progress",
  resolved: "resolved",
};

export type ActionResult = { ok: true } | { ok: false; message: string };

/** Confirma que quem chamou é admin da plataforma. Devolve o id do usuário. */
async function requireAdmin(): Promise<
  { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; userId: string } | ActionResult
> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { ok: false, message: "Supabase não configurado neste ambiente." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "Sessão expirada. Entre novamente para continuar." };

  const { data: perfil, error } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .single();

  if (error || !perfil?.is_platform_admin) {
    return { ok: false, message: "Você não tem permissão para responder chamados." };
  }

  return { ok: true, supabase, userId: user.id };
}

/**
 * Grava a resposta do suporte e reabre o chamado, se ele não estiver resolvido.
 *
 * Não é transacional: se o UPDATE do chamado falhar depois do INSERT, a
 * mensagem fica gravada e o carimbo de última atividade desatualizado. É o
 * defeito aceitável aqui — o oposto (perder a resposta já escrita) seria pior,
 * e o carimbo se corrige na resposta seguinte.
 */
export async function replyToTicket(
  chamadoId: string,
  text: string,
): Promise<ActionResult> {
  const corpo = text.trim();
  if (!corpo) return { ok: false, message: "Escreva uma resposta antes de enviar." };

  const auth = await requireAdmin();
  if (!("supabase" in auth)) return auth;
  const { supabase, userId } = auth;

  // `support_messages.tenant_id` é obrigatório e precisa ser o do chamado —
  // ler daqui evita confiar num id vindo do navegador.
  const { data: ticket, error: erroLeitura } = await supabase
    .from("support_tickets")
    .select("tenant_id, status")
    .eq("id", chamadoId)
    .single();

  if (erroLeitura || !ticket) {
    return { ok: false, message: "Chamado não encontrado." };
  }

  const { error: erroInsert } = await supabase.from("support_messages").insert({
    ticket_id: chamadoId,
    tenant_id: ticket.tenant_id,
    sender_id: userId,
    sender_side: "admin",
    body: corpo,
  });

  if (erroInsert) {
    console.error("[responderChamado] falha ao gravar mensagem:", erroInsert.message);
    return { ok: false, message: `Não foi possível enviar a resposta: ${erroInsert.message}` };
  }

  // Responder reabre o trabalho no chamado, a menos que ele já esteja fechado.
  const newStatus =
    ticket.status === TO_DB.resolved ? ticket.status : TO_DB.inProgress;

  const { error: erroUpdate } = await supabase
    .from("support_tickets")
    .update({ status: newStatus, last_message_at: new Date().toISOString() })
    .eq("id", chamadoId);

  if (erroUpdate) {
    // A resposta já foi enviada — não é o caso de dizer que falhou.
    console.error("[responderChamado] mensagem gravada, chamado não atualizado:", erroUpdate.message);
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setTicketStatus(
  chamadoId: string,
  status: TicketStatus,
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!("supabase" in auth)) return auth;

  const { error } = await auth.supabase
    .from("support_tickets")
    .update({ status: TO_DB[status] })
    .eq("id", chamadoId);

  if (error) {
    console.error("[mudarStatusChamado] falha ao atualizar:", error.message);
    return { ok: false, message: `Não foi possível atualizar o chamado: ${error.message}` };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
