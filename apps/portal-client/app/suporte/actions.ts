"use server";

import { revalidatePath } from "next/cache";
import { isOwnPath } from "@/lib/buckets";
import { logActivity } from "@/lib/historico";
import { AUTHOR_DB, STATUS_DB } from "@/lib/dados/chamados";
import { requireCustomer, type ActionResult } from "@/lib/sessao";

/** Abre um chamado com a primeira mensagem já dentro. */
export async function openTicket(data: {
  subject: string;
  category: string;
  description: string;
  attachment: string;
}): Promise<ActionResult> {
  const session = await requireCustomer("abrir um chamado", "support");
  if (!session.ok) return session;

  if (data.subject.trim().length < 5) {
    return { ok: false, message: "Escreva um assunto com pelo menos 5 letras." };
  }
  if (data.description.trim().length < 15) {
    return { ok: false, message: "Conte com um pouco mais de detalhe — ajuda a resolver mais rápido." };
  }

  const { supabase, tenantId, userId } = session;
  const now = new Date().toISOString();

  // O caminho do anexo vem do navegador, e uma Server Action é um endpoint
  // HTTP como outro qualquer — ver `isOwnPath`.
  if (data.attachment && !isOwnPath(data.attachment, tenantId)) {
    return { ok: false, message: "Esse anexo não pertence a este negócio." };
  }

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

  await logActivity(supabase, "ticket.opened", {
    entityId: ticket.id,
    summary: data.subject.trim(),
    metadata: { category: data.category },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Responder devolve a bola: o chamado sai de "aguardando você". */
export async function replyToTicket(
  chamadoId: string,
  text: string,
  attachment: string,
): Promise<ActionResult> {
  const session = await requireCustomer("responder um chamado", "support");
  if (!session.ok) return session;

  if (!text.trim()) return { ok: false, message: "Escreva a sua resposta." };

  const { supabase, tenantId, userId } = session;
  const now = new Date().toISOString();

  if (attachment && !isOwnPath(attachment, tenantId)) {
    return { ok: false, message: "Esse anexo não pertence a este negócio." };
  }

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
  const session = await requireCustomer("mudar o status de um chamado", "support");
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

/**
 * Abrir a conversa já conta como ler: o selo "nova resposta" some.
 *
 * Marca tudo que não é do cliente — `'support'`, `'admin'` (equipe da
 * plataforma) e `'system'`. As do cliente ficam de fora: quem as lê é o
 * suporte, e o trigger `guard_support_message_write` recusa essa escrita.
 */
export async function markTicketRead(chamadoId: string): Promise<ActionResult> {
  const session = await requireCustomer("abrir um chamado", "support");
  if (!session.ok) return session;

  const { error } = await session.supabase
    .from("support_messages")
    .update({ read_by_recipient: true })
    .eq("ticket_id", chamadoId)
    .neq("sender_side", AUTHOR_DB.customer)
    .eq("read_by_recipient", false);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
