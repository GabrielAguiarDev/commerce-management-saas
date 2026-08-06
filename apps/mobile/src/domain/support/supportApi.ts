import { TICKETS_API, MESSAGES_API } from '@data/support';
import { delay } from '@services/mockLatency';

import type { TicketAPI, TicketCreateAPI, TicketMessageAPI, TicketReplyAPI } from './supportApiTypes';

/**
 * FRONTEIRA DE REDE do suporte.
 * ⚠️ ÚNICO ARQUIVO DESTE DOMÍNIO QUE MUDA COM O SUPABASE.
 */

export async function listTickets(tenantId: string): Promise<TicketAPI[]> {
  await delay();
  return TICKETS_API[tenantId] ?? [];
}

export async function listMessages(ticketId: string): Promise<TicketMessageAPI[]> {
  await delay();
  return MESSAGES_API[ticketId] ?? [];
}

/** Abrir o chamado marca como lido — no servidor real seria um `update`. */
export async function markAsRead(tenantId: string, ticketId: string): Promise<void> {
  await delay(60);
  const list = TICKETS_API[tenantId] ?? [];
  TICKETS_API[tenantId] = list.map((t) =>
    t.id === ticketId ? { ...t, has_unread: false } : t,
  );
}

export async function createTicket(payload: TicketCreateAPI): Promise<TicketAPI> {
  await delay(320);

  const novo: TicketAPI = {
    id: `tkt_${Date.now().toString(36)}`,
    tenant_id: payload.tenant_id,
    subject: payload.subject,
    summary: 'Aguardando nossa análise',
    status: 'in_progress',
    has_unread: false,
    updated_at: new Date().toISOString(),
  };

  TICKETS_API[payload.tenant_id] = [novo, ...(TICKETS_API[payload.tenant_id] ?? [])];
  MESSAGES_API[novo.id] = [
    {
      id: `${novo.id}_m1`,
      ticket_id: novo.id,
      body: payload.body,
      from_support: false,
      created_label: 'agora',
    },
  ];

  return novo;
}

export async function reply(payload: TicketReplyAPI): Promise<TicketMessageAPI> {
  await delay(200);

  const message: TicketMessageAPI = {
    id: `msg_${Date.now().toString(36)}`,
    ticket_id: payload.ticket_id,
    body: payload.body,
    from_support: false,
    created_label: 'agora',
  };

  MESSAGES_API[payload.ticket_id] = [...(MESSAGES_API[payload.ticket_id] ?? []), message];
  return message;
}
