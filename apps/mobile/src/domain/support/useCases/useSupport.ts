import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { Linking } from 'react-native';

import { useSessionStore } from '@store/sessionStore';

import * as service from '../supportService';
import { whatsappLink } from '../whatsapp';
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

/**
 * O CANAL EXTERNO de suporte, pronto para o botão da tela de bloqueio.
 *
 * Devolve `abrir()` em vez de a URL: montar o link e abrir o WhatsApp são a
 * mesma decisão, e espalhá-la faria a próxima tela que precisar do canal
 * remontar o link do seu jeito.
 *
 * `abrir()` resolve para `false` quando não deu — número ausente (RLS ou chave
 * não cadastrada) ou o sistema recusou a URL. Quem mostra o aviso é a TELA, não
 * este hook: `useCases` não conhece toast, e um domínio que importa a store de
 * UI é a camada vazando.
 */
export function useSupportWhatsApp() {
  const { data, isPending } = useQuery({
    queryKey: [...suporteKeys.all, 'whatsapp'] as const,
    queryFn: () => service.getWhatsAppContact(),
    // Contato da plataforma muda praticamente nunca. Uma hora de cache evita
    // reconsultar a cada vez que a tela de bloqueio monta.
    staleTime: 60 * 60 * 1000,
    // O service já engole o erro e devolve `null`; repetir não ajudaria.
    retry: false,
  });

  const phone = data ?? null;

  const abrir = useCallback(async (): Promise<boolean> => {
    if (!phone) return false;

    const url = whatsappLink(phone);
    try {
      // `canOpenURL` antes de abrir: sem WhatsApp instalado, o iOS pode recusar
      // em silêncio e o toque não faria absolutamente nada — o pior desfecho,
      // porque a pessoa fica achando que o botão está quebrado.
      //
      // O link é `https://wa.me/...` de propósito, e não o esquema `whatsapp://`:
      // no navegador ele redireciona para a loja ou para o WhatsApp Web, então
      // quem não tem o app instalado ainda chega a algum lugar.
      if (!(await Linking.canOpenURL(url))) return false;
      await Linking.openURL(url);
      return true;
    } catch {
      return false;
    }
  }, [phone]);

  return { abrir, carregando: isPending, disponivel: phone !== null };
}
