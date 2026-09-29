import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { Linking } from 'react-native';

import { useSessionStore } from '@store/sessionStore';

import { isFromSupportTeam } from '../senderSide';
import * as service from '../supportService';
import { subscribeToSupport } from '../supportRealtime';
import { whatsappLink } from '../whatsapp';
import type { NewTicket, TicketMessage } from '../supportTypes';

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

/* -------------------------------------------------------------------------- */
/* TEMPO REAL                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * A CONVERSA ABERTA acompanha o chamado ao vivo.
 *
 * A mensagem nova vem INTEIRA no evento (broadcast do banco) e entra direto no
 * cache da conversa, sem ida ao banco — passando pelo mesmo adapter do SELECT
 * (`service.messageFromEvent`). O canal é o do negócio, compartilhado com o
 * shell; aqui só entra o que é deste chamado.
 *
 * Se a conversa ainda não está em cache (primeira carga em andamento), o
 * evento é ignorado: a consulta que está rodando já vai trazê-la.
 *
 * MARCAR COMO LIDA: se a resposta chega com a conversa na frente da pessoa, o
 * badge do "Mais" não pode acender por uma mensagem que ela está lendo. Só as
 * da equipe (`'support'`/`'admin'`) — a própria resposta do cliente volta pelo
 * mesmo canal, e marcá-la seria uma escrita que o trigger
 * `guard_support_message_write` recusa.
 *
 * RECONEXÃO relê a conversa: o que chegou com o aparelho sem rede não é
 * reenviado.
 */
export function useTicketLive(ticketId: string | undefined) {
  const tenantId = useSessionStore((s) => s.tenantId);
  const client = useQueryClient();
  const { mutate: markAsRead } = useMarkAsRead();

  useEffect(() => {
    if (!ticketId || !tenantId) return;
    const key = suporteKeys.mensagens(ticketId);

    return subscribeToSupport(tenantId, {
      onMessage: (event) => {
        if (event.ticketId !== ticketId) return;
        client.setQueryData<TicketMessage[]>(key, (conversation) =>
          service.appendMessage(conversation, service.messageFromEvent(event.message)),
        );
        if (isFromSupportTeam(event.senderSide)) markAsRead(ticketId);
      },
      onReconnect: () => void client.invalidateQueries({ queryKey: key }),
    });
  }, [ticketId, tenantId, client, markAsRead]);
}

/**
 * O ATENDIMENTO do negócio, ao vivo — a lista de chamados e o badge do "Mais".
 *
 * A lista é relida (e não montada do evento): a ordem, o resumo e o "não lida"
 * dependem de várias mensagens, e quem define isso é a consulta da lista. É
 * uma leitura só por evento, e só nos aparelhos daquele negócio.
 *
 * Monte UMA vez, no shell autenticado (`app/(app)/_layout.tsx`). O canal é
 * compartilhado de qualquer forma (ver `supportRealtime`), mas cada montagem é
 * um ouvinte a mais relendo a lista.
 */
export function useSupportLive() {
  const tenantId = useSessionStore((s) => s.tenantId);
  const client = useQueryClient();

  useEffect(() => {
    if (!tenantId) return;
    const rereadList = () => {
      void client.invalidateQueries({ queryKey: suporteKeys.tickets(tenantId) });
    };

    return subscribeToSupport(tenantId, {
      onMessage: rereadList,
      onTicketChange: rereadList,
      onReconnect: () => void client.invalidateQueries({ queryKey: suporteKeys.all }),
    });
  }, [tenantId, client]);
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
    // A mensagem gravada volta na resposta do insert: entra direto na conversa.
    // O eco dela pelo canal é ignorado pelo `id` (`appendMessage`).
    onSuccess: (message) =>
      client.setQueryData<TicketMessage[]>(suporteKeys.mensagens(ticketId ?? ''), (conversation) =>
        service.appendMessage(conversation, message),
      ),
  });
}

/**
 * O CANAL EXTERNO de suporte, pronto para as telas de fora do shell (bloqueio e
 * falha na abertura) — as que não alcançam o suporte in-app.
 *
 * Devolve `abrir()` em vez de a URL: montar o link e abrir o WhatsApp são a
 * mesma decisão, e espalhá-la faria a próxima tela que precisar do canal
 * remontar o link do seu jeito.
 *
 * `abrir(message)` troca a mensagem pré-digitada; sem ela vai o pedido de
 * ativação do app (`upgradeMessage()`).
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

  const abrir = useCallback(async (message?: string): Promise<boolean> => {
    if (!phone) return false;

    const url = whatsappLink(phone, message);
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
