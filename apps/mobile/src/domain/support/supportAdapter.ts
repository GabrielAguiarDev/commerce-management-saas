import type { TicketAPI, TicketCreateAPI, TicketMessageAPI } from './supportApiTypes';
import type { Ticket, TicketMessage, NewTicket, TicketStatus } from './supportTypes';

const LABEL: Record<TicketStatus, string> = {
  answered: 'Respondido',
  in_progress: 'Em andamento',
  resolved: 'Resolvido',
};

/**
 * Enum do banco → status de domínio.
 *
 * Status desconhecido cai em "em andamento" e não quebra a lista: um chamado
 * com estado novo no servidor precisa continuar aparecendo, ainda que com o
 * rótulo genérico, até o app ser atualizado.
 */
function toStatus(raw: string): TicketStatus {
  if (raw === 'answered') return 'answered';
  if (raw === 'resolved') return 'resolved';
  return 'in_progress';
}

export function toTicket(raw: TicketAPI): Ticket {
  const status = toStatus(raw.status);
  return {
    id: raw.id,
    assunto: raw.subject,
    summary: raw.summary ?? '',
    status,
    statusRotulo: LABEL[status],
    naoLida: raw.has_unread === true,
  };
}

/** `from_support` vira `minha` invertido: a tela pensa "é minha bolha?". */
export function toMessage(raw: TicketMessageAPI): TicketMessage {
  return {
    id: raw.id,
    text: raw.body,
    minha: !raw.from_support,
    quando: raw.created_label,
  };
}

export function toTicketPayload(tenantId: string, novo: NewTicket): TicketCreateAPI {
  return {
    tenant_id: tenantId,
    subject: novo.assunto.trim(),
    category: novo.category,
    body: novo.description.trim(),
  };
}

/** Quantos chamados têm mensagem não lida — o badge vermelho da tela "Mais". */
export function countUnread(tickets: readonly Ticket[]): number {
  return tickets.filter((c) => c.naoLida).length;
}
