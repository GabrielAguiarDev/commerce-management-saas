import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSessionStore } from '@store/sessionStore';

import * as service from '../supportService';
import type { NewTicket } from '../supportTypes';

export const suporteKeys = {
  all: ['support'] as const,
  tickets: (tenantId: string) => [...suporteKeys.all, 'chamados', tenantId] as const,
  mensagens: (ticketId: string) => [...suporteKeys.all, 'mensagens', ticketId] as const,
};

export function useTickets() {
  const tenantId = useSessionStore((s) => s.tenantId);

  return useQuery({
    queryKey: suporteKeys.tickets(tenantId ?? 'sem-tenant'),
    queryFn: () => service.listTickets(tenantId as string),
    enabled: Boolean(tenantId),
    staleTime: 60 * 1000,
  });
}

export function useTicketMessages(ticketId: string | undefined) {
  return useQuery({
    queryKey: suporteKeys.mensagens(ticketId ?? 'sem-chamado'),
    queryFn: () => service.listMessages(ticketId as string),
    enabled: Boolean(ticketId),
    staleTime: 30 * 1000,
  });
}

/** Abrir o chamado marca como lido, o que apaga o badge da tela "Mais". */
export function useMarkAsRead() {
  const tenantId = useSessionStore((s) => s.tenantId);
  const client = useQueryClient();

  return useMutation({
    mutationFn: (ticketId: string) => service.markAsRead(tenantId as string, ticketId),
    onSuccess: () => client.invalidateQueries({ queryKey: suporteKeys.all }),
  });
}

export function useOpenTicket() {
  const tenantId = useSessionStore((s) => s.tenantId);
  const client = useQueryClient();

  return useMutation({
    mutationFn: (novo: NewTicket) => service.openTicket(tenantId as string, novo),
    onSuccess: () => client.invalidateQueries({ queryKey: suporteKeys.all }),
  });
}

export function useReplyToTicket(ticketId: string | undefined) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (text: string) => service.reply(ticketId as string, text),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: suporteKeys.mensagens(ticketId ?? '') }),
  });
}
