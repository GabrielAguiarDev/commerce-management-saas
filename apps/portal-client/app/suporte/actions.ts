"use server";

import { revalidatePath } from "next/cache";
import { AUTHOR_DB, STATUS_DB } from "@/lib/dados/chamados";
import { requireCustomer, type ActionResult } from "@/lib/sessao";

/** Abre um chamado com a primeira mensagem já dentro. */
export async function openTicket(data: {
  subject: string;
  category: string;
  description: string;
  attachment: string;
}): Promise<ActionResult> {
  const session = await requireCustomer("abrir um chamado");
  if (!session.ok) return session;

  if (data.subject.trim().length < 5) {
    return { ok: false, message: "Escreva um assunto com pelo menos 5 letras." };
  }
  if (data.description.trim().length < 15) {
    return { ok: false, message: "Conte com um pouco mais de detalhe — ajuda a resolver mais rápido." };
  }

  const { supabase, tenantId, userId } = session;
  const now = new Date().toISOString();

  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .insert({
      tenant_id: tenantId,
      opened_by: userId,
      subject: data.subject.trim(),
      category: data.category,
      status: STATUS_DB.open,
      last_message_at: now,
    })
    .select("id")
    .single();

  if (error || !ticket) {
    return { ok: false, message: error?.message ?? "Não foi possível abrir o chamado." };
  }

  const { error: erroMsg } = await supabase.from("support_messages").insert({
    ticket_id: ticket.id,
    tenant_id: tenantId,
    sender_id: userId,
    sender_side: AUTHOR_DB.customer,
    body: data.description.trim(),
    attachment_url: data.attachment || null,
    // A mensagem é DO cliente: quem ainda não leu é o suporte.
    read_by_recipient: false,
  });

  if (erroMsg) return { ok: false, message: erroMsg.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Responder devolve a bola: o chamado sai de "aguardando você". */
export async function replyToTicket(
  chamadoId: string,
  text: string,
  attachment: string,
): Promise<ActionResult> {
  const session = await requireCustomer("responder um chamado");
  if (!session.ok) return session;

  if (!text.trim()) return { ok: false, message: "Escreva a sua resposta." };

  const { supabase, tenantId, userId } = session;
  const now = new Date().toISOString();

  const { error } = await supabase.from("support_messages").insert({
    ticket_id: chamadoId,
    tenant_id: tenantId,
    sender_id: userId,
    sender_side: AUTHOR_DB.customer,
    body: text.trim(),
    attachment_url: attachment || null,
    read_by_recipient: false,
  });

  if (error) return { ok: false, message: error.message };

  await supabase
    .from("support_tickets")
    .update({ status: STATUS_DB.inProgress, last_message_at: now })
    .eq("id", chamadoId)
    .eq("status", STATUS_DB.waiting);

  await supabase
    .from("support_tickets")
    .update({ last_message_at: now })
    .eq("id", chamadoId);

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setTicketStatus(
  chamadoId: string,
  status: "resolved" | "inProgress",
): Promise<ActionResult> {
  const session = await requireCustomer("mudar o status de um chamado");
  if (!session.ok) return session;

  const { supabase, tenantId, userId } = session;
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("support_tickets")
    .update({ status: STATUS_DB[status], last_message_at: now })
    .eq("id", chamadoId);

  if (error) return { ok: false, message: error.message };

  // O registro de "resolvido"/"reaberto" é uma mensagem de sistema, para a
  // conversa continuar contando a história inteira sozinha.
  await supabase.from("support_messages").insert({
    ticket_id: chamadoId,
    tenant_id: tenantId,
    sender_id: userId,
    sender_side: AUTHOR_DB.system,
    body:
      status === "resolved"
        ? "Chamado marcado como resolvido por você."
        : "Chamado reaberto por você.",
    read_by_recipient: true,
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Abrir a conversa já conta como ler: o selo "nova resposta" some. */
export async function markTicketRead(chamadoId: string): Promise<ActionResult> {
  const session = await requireCustomer("abrir um chamado");
  if (!session.ok) return session;

  const { error } = await session.supabase
    .from("support_messages")
    .update({ read_by_recipient: true })
    .eq("ticket_id", chamadoId)
    .eq("sender_side", AUTHOR_DB.support)
    .eq("read_by_recipient", false);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
