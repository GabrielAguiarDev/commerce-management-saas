import * as api from './supportApi';
import { toTicket, toTicketPayload, toMessage } from './supportAdapter';
import {
  SupportError,
  type Ticket,
  type TicketMessage,
  type NewTicket,
} from './supportTypes';

/** AS REGRAS do suporte. */

function normalize(error: unknown): never {
  if (error instanceof SupportError) throw error;
  throw new SupportError('network', error instanceof Error ? error.message : undefined);
}

export async function listTickets(tenantId: string): Promise<Ticket[]> {
  try {
    return (await api.listTickets(tenantId)).map(toTicket);
  } catch (e) {
    return normalize(e);
  }
}

export async function listMessages(ticketId: string): Promise<TicketMessage[]> {
  try {
    return (await api.listMessages(ticketId)).map(toMessage);
  } catch (e) {
    return normalize(e);
  }
}

export async function markAsRead(tenantId: string, ticketId: string): Promise<void> {
  try {
    await api.markAsRead(tenantId, ticketId);
  } catch {
    // Falhar em marcar como lido não pode impedir a leitura do chamado.
  }
}

export function validateNewTicket(novo: NewTicket): SupportError | null {
  if (!novo.assunto.trim()) return new SupportError('subject_required');
  if (!novo.description.trim()) return new SupportError('description_required');
  return null;
}

export async function openTicket(tenantId: string, novo: NewTicket): Promise<Ticket> {
  const invalido = validateNewTicket(novo);
  if (invalido) throw invalido;

  try {
    return toTicket(await api.createTicket(toTicketPayload(tenantId, novo)));
  } catch (e) {
    return normalize(e);
  }
}

export async function reply(ticketId: string, text: string): Promise<TicketMessage> {
  if (!text.trim()) throw new SupportError('description_required');
  try {
    return toMessage(await api.reply({ ticket_id: ticketId, body: text.trim() }));
  } catch (e) {
    return normalize(e);
  }
}
