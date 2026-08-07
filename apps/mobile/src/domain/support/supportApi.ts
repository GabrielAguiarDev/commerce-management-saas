import { SENDER_SIDE, TICKET_STATUS } from '@domain/shared/dbEnums';
import { supabase } from '@services/supabase';
import { relativeLabel } from '@utils/dates';

import type {
  TicketAPI,
  TicketCreateAPI,
  TicketMessageAPI,
  TicketReplyAPI,
} from './supportApiTypes';

/**
 * FRONTEIRA DE REDE do suporte.
 *
 * ⚠️ ÚNICO ARQUIVO DESTE DOMÍNIO QUE FALA COM O SUPABASE.
 */

/**
 * Os chamados do negócio, com a última mensagem servindo de resumo.
 *
 * "Não lido" é uma mensagem DO SUPORTE que o cliente ainda não leu — a mesma
 * definição do portal. Ela alimenta o badge da tela "Mais", então precisa
 * significar exatamente a mesma coisa nos dois lugares.
 */
export async function listTickets(tenantId: string): Promise<TicketAPI[]> {
  void tenantId; // O RLS já isola pelo tenant do usuário logado.

  const { data, error } = await supabase
    .from('support_tickets')
    .select(
      'id, tenant_id, subject, status, last_message_at, created_at, support_messages(body, sender_side, read_by_recipient, created_at)',
    )
    .order('last_message_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((t) => {
    const messages = [...(t.support_messages ?? [])].sort((a, b) =>
      String(a.created_at).localeCompare(String(b.created_at)),
    );
    const last = messages[messages.length - 1];

    return {
      id: t.id,
      tenant_id: t.tenant_id,
      subject: t.subject,
      // O resumo da lista é a última mensagem da conversa. Um chamado sem
      // mensagem nenhuma é possível (criado e a inserção da mensagem falhou),
      // e o texto diz isso em vez de aparecer em branco.
      summary: last?.body ?? 'Aguardando nossa análise',
      status: toAppStatus(t.status),
      has_unread: messages.some(
        (m) => m.sender_side === SENDER_SIDE.support && !m.read_by_recipient,
      ),
      updated_at: t.last_message_at ?? t.created_at,
    };
  });
}

/**
 * Status do banco → status do app.
 *
 * `waiting_client` ("aguardando você", no portal) é o que o app chama de
 * `answered`: o suporte respondeu e a bola está com o cliente. `open` e
 * `in_progress` colapsam em "em andamento" — a diferença entre "recebido" e
 * "sendo tratado" é do painel do suporte, e não muda nada para quem espera.
 */
function toAppStatus(status: string | null): string {
  if (status === TICKET_STATUS.waitingClient) return 'answered';
  if (status === TICKET_STATUS.resolved) return 'resolved';
  return 'in_progress';
}

export async function listMessages(ticketId: string): Promise<TicketMessageAPI[]> {
  const { data, error } = await supabase
    .from('support_messages')
    .select('id, ticket_id, body, sender_side, created_at')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((m) => ({
    id: m.id,
    ticket_id: m.ticket_id,
    body: m.body,
    from_support: m.sender_side === SENDER_SIDE.support,
    created_label: relativeLabel(m.created_at),
  }));
}

/**
 * Abrir o chamado marca as mensagens do suporte como lidas.
 *
 * Só as DO SUPORTE: `read_by_recipient` nas mensagens do próprio cliente não
 * quer dizer nada aqui (o destinatário delas é o suporte, e quem as marca é o
 * outro lado). Sem o filtro, o app estaria dizendo ao painel que o suporte já
 * leu o que o cliente acabou de escrever.
 */
export async function markAsRead(tenantId: string, ticketId: string): Promise<void> {
  void tenantId;

  const { error } = await supabase
    .from('support_messages')
    .update({ read_by_recipient: true })
    .eq('ticket_id', ticketId)
    .eq('sender_side', SENDER_SIDE.support)
    .eq('read_by_recipient', false);

  if (error) throw error;
}

/**
 * ABRIR UM CHAMADO — duas escritas, como a venda.
 *
 * O PostgREST não tem transação entre chamadas: se a mensagem falhar, o chamado
 * fica sem corpo. O tratamento apaga o chamado órfão, porque um chamado vazio
 * na fila do suporte é ruído que ninguém sabe responder.
 */
export async function createTicket(payload: TicketCreateAPI): Promise<TicketAPI> {
  const now = new Date().toISOString();

  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .insert({
      tenant_id: payload.tenant_id,
      subject: payload.subject,
      category: payload.category || null,
      status: TICKET_STATUS.open,
      last_message_at: now,
      created_at: now,
    })
    .select('id, tenant_id, subject, status, last_message_at')
    .single();

  if (error) throw error;

  const { error: messageError } = await supabase.from('support_messages').insert({
    tenant_id: payload.tenant_id,
    ticket_id: ticket.id,
    sender_side: SENDER_SIDE.client,
    body: payload.body,
    read_by_recipient: false,
    created_at: now,
  });

  if (messageError) {
    await supabase.from('support_tickets').delete().eq('id', ticket.id);
    throw messageError;
  }

  return {
    id: ticket.id,
    tenant_id: ticket.tenant_id,
    subject: ticket.subject,
    summary: payload.body,
    status: ticket.status,
    has_unread: false,
    updated_at: ticket.last_message_at,
  };
}

export async function reply(payload: TicketReplyAPI): Promise<TicketMessageAPI> {
  const now = new Date().toISOString();

  // `support_messages.tenant_id` é obrigatório e o payload não o traz — a tela
  // de conversa só conhece o chamado. Lê-lo do próprio chamado é mais seguro do
  // que carregá-lo pela assinatura: garante que a mensagem nasça no mesmo
  // tenant do chamado, e o RLS recusaria qualquer outro de todo jeito.
  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .select('tenant_id')
    .eq('id', payload.ticket_id)
    .single();

  if (ticketError) throw ticketError;

  const { data, error } = await supabase
    .from('support_messages')
    .insert({
      tenant_id: ticket.tenant_id,
      ticket_id: payload.ticket_id,
      sender_side: SENDER_SIDE.client,
      body: payload.body,
      read_by_recipient: false,
      created_at: now,
    })
    .select('id, ticket_id, body, sender_side, created_at')
    .single();

  if (error) throw error;

  // Sobe o chamado para o topo da lista. Sem isto, a resposta do cliente ficaria
  // enterrada e o `order('last_message_at')` mentiria sobre o que é recente.
  await supabase
    .from('support_tickets')
    .update({ last_message_at: now })
    .eq('id', payload.ticket_id);

  return {
    id: data.id,
    ticket_id: data.ticket_id,
    body: data.body,
    from_support: false,
    created_label: relativeLabel(data.created_at),
  };
}

/* -------------------------------------------------------------------------- */
/* Contato externo da plataforma                                               */
/* -------------------------------------------------------------------------- */

/**
 * O número de WhatsApp da plataforma.
 *
 * Vem de `platform_settings` (chave `whatsapp_contact`), mas **não é lido da
 * tabela**: ela tem política `is_platform_admin` e um usuário de tenant recebe
 * ZERO LINHAS dela — 200, não 403. A leitura passa pela função
 * `platform_whatsapp_contact()`, que é SECURITY DEFINER e expõe SÓ esse valor.
 *
 * Por que função e não uma policy na tabela: `platform_settings` é um chaveiro
 * genérico (guarda também `trial_days`, `default_modules`,
 * `inactivity_notify`). Abrir a tabela, ainda que filtrando por chave, cria uma
 * superfície que precisa ser revista a cada chave nova. A função expõe um valor
 * e mais nada. Ver `supabase/migrations/20260807000000_platform_whatsapp_contact.sql`.
 *
 * ⚠️ `null` é um desfecho ESPERADO, não uma falha excepcional: a migration pode
 * não ter sido aplicada ainda, ou a chave pode não estar cadastrada. Quem chama
 * TEM de ter caminho alternativo — é o que sustenta o fallback do botão.
 */
export async function fetchWhatsAppContact(): Promise<string | null> {
  const { data, error } = await supabase.rpc('platform_whatsapp_contact');

  if (error) throw error;

  // A função já devolve TEXTO (`value #>> '{}'`), então não há JSON para
  // desembrulhar aqui — se voltasse o jsonb cru, o número viria com aspas
  // dentro e o link do WhatsApp sairia quebrado.
  return typeof data === 'string' && data.trim() !== '' ? data : null;
}
