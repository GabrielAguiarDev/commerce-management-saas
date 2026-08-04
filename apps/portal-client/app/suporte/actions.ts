"use server";

import { revalidatePath } from "next/cache";
import { AUTOR_DB, STATUS_DB } from "@/lib/dados/chamados";
import { exigirCliente, type ResultadoAcao } from "@/lib/sessao";

/** Abre um chamado com a primeira mensagem já dentro. */
export async function abrirChamado(dados: {
  assunto: string;
  categoria: string;
  descricao: string;
  anexo: string;
}): Promise<ResultadoAcao> {
  const sessao = await exigirCliente("abrir um chamado");
  if (!sessao.ok) return sessao;

  if (dados.assunto.trim().length < 5) {
    return { ok: false, mensagem: "Escreva um assunto com pelo menos 5 letras." };
  }
  if (dados.descricao.trim().length < 15) {
    return { ok: false, mensagem: "Conte com um pouco mais de detalhe — ajuda a resolver mais rápido." };
  }

  const { supabase, tenantId, usuarioId } = sessao;
  const agora = new Date().toISOString();

  const { data: chamado, error } = await supabase
    .from("support_tickets")
    .insert({
      tenant_id: tenantId,
      opened_by: usuarioId,
      subject: dados.assunto.trim(),
      category: dados.categoria,
      status: STATUS_DB.aberto,
      last_message_at: agora,
    })
    .select("id")
    .single();

  if (error || !chamado) {
    return { ok: false, mensagem: error?.message ?? "Não foi possível abrir o chamado." };
  }

  const { error: erroMsg } = await supabase.from("support_messages").insert({
    ticket_id: chamado.id,
    tenant_id: tenantId,
    sender_id: usuarioId,
    sender_side: AUTOR_DB.cliente,
    body: dados.descricao.trim(),
    attachment_url: dados.anexo || null,
    // A mensagem é DO cliente: quem ainda não leu é o suporte.
    read_by_recipient: false,
  });

  if (erroMsg) return { ok: false, mensagem: erroMsg.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Responder devolve a bola: o chamado sai de "aguardando você". */
export async function responderChamado(
  chamadoId: string,
  texto: string,
  anexo: string,
): Promise<ResultadoAcao> {
  const sessao = await exigirCliente("responder um chamado");
  if (!sessao.ok) return sessao;

  if (!texto.trim()) return { ok: false, mensagem: "Escreva a sua resposta." };

  const { supabase, tenantId, usuarioId } = sessao;
  const agora = new Date().toISOString();

  const { error } = await supabase.from("support_messages").insert({
    ticket_id: chamadoId,
    tenant_id: tenantId,
    sender_id: usuarioId,
    sender_side: AUTOR_DB.cliente,
    body: texto.trim(),
    attachment_url: anexo || null,
    read_by_recipient: false,
  });

  if (error) return { ok: false, mensagem: error.message };

  await supabase
    .from("support_tickets")
    .update({ status: STATUS_DB.andamento, last_message_at: agora })
    .eq("id", chamadoId)
    .eq("status", STATUS_DB.aguardando);

  await supabase
    .from("support_tickets")
    .update({ last_message_at: agora })
    .eq("id", chamadoId);

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function mudarStatusChamado(
  chamadoId: string,
  status: "resolvido" | "andamento",
): Promise<ResultadoAcao> {
  const sessao = await exigirCliente("mudar o status de um chamado");
  if (!sessao.ok) return sessao;

  const { supabase, tenantId, usuarioId } = sessao;
  const agora = new Date().toISOString();

  const { error } = await supabase
    .from("support_tickets")
    .update({ status: STATUS_DB[status], last_message_at: agora })
    .eq("id", chamadoId);

  if (error) return { ok: false, mensagem: error.message };

  // O registro de "resolvido"/"reaberto" é uma mensagem de sistema, para a
  // conversa continuar contando a história inteira sozinha.
  await supabase.from("support_messages").insert({
    ticket_id: chamadoId,
    tenant_id: tenantId,
    sender_id: usuarioId,
    sender_side: AUTOR_DB.sistema,
    body:
      status === "resolvido"
        ? "Chamado marcado como resolvido por você."
        : "Chamado reaberto por você.",
    read_by_recipient: true,
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Abrir a conversa já conta como ler: o selo "nova resposta" some. */
export async function marcarChamadoLido(chamadoId: string): Promise<ResultadoAcao> {
  const sessao = await exigirCliente("abrir um chamado");
  if (!sessao.ok) return sessao;

  const { error } = await sessao.supabase
    .from("support_messages")
    .update({ read_by_recipient: true })
    .eq("ticket_id", chamadoId)
    .eq("sender_side", AUTOR_DB.suporte)
    .eq("read_by_recipient", false);

  if (error) return { ok: false, mensagem: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
