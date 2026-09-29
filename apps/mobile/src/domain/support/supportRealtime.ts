import { supabase } from '@services/supabase';

import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * FRONTEIRA DE TEMPO REAL do suporte.
 *
 * ⚠️ ÚNICO ARQUIVO DESTE DOMÍNIO QUE ABRE CANAL — a mesma regra do
 * `supportApi.ts` para as consultas. Um canal aberto de dentro de uma tela é
 * uma conexão que ninguém consegue contar depois, e a cota do Realtime é por
 * conexão simultânea (200 no plano gratuito).
 *
 * A REGRA QUE VALE AQUI: **o evento não carrega dado para a tela.** Ele só
 * avisa que algo mudou; quem recebe invalida a consulta que já existe e relê
 * pelo caminho de sempre (`supportApi` → `supportService` → adapter). O que o
 * evento diz sobre a linha (`senderSide`) serve para DECIDIR — marcar como
 * lida, e nada mais —, nunca para montar a mensagem. Duas formas de montar a
 * mesma mensagem divergem um dia, e a segunda é a que ninguém testa.
 *
 * NENHUM FILTRO DE TENANT, de propósito: o RLS entrega o evento só a quem
 * conseguiria dar SELECT naquela linha (ver
 * `20260928000000_support_realtime.sql`). É a mesma razão por que nenhuma
 * consulta deste app passa `tenant_id`.
 *
 * Ver `docs/architecture/suporte-tempo-real.md`.
 */

/** O que o evento diz da linha que mudou — e é só isso que ele diz. */
export interface SupportEvent {
  /**
   * `support_messages.sender_side` quando o evento é de mensagem; `null` quando
   * é do chamado (status, `last_message_at`), que não tem lado.
   */
  senderSide: string | null;
}

export interface SupportSubscription {
  /** Algo mudou: releia. */
  onEvent: (event: SupportEvent) => void;
  /**
   * O canal VOLTOU a `SUBSCRIBED` depois de uma queda.
   *
   * O Realtime não reenvia o que se perdeu: o evento que aconteceu enquanto o
   * aparelho estava sem rede não chega depois. Por isso toda reconexão refaz a
   * consulta — é a rede de segurança da fase 1.
   *
   * Não é chamado na PRIMEIRA inscrição: ali a consulta acabou de rodar, e
   * invalidá-la de novo seria uma ida ao banco por montagem de tela.
   */
  onReconnect?: () => void;
}

/**
 * Sequência do tópico, só para garantir nome único.
 *
 * Dois canais com o mesmo tópico na mesma conexão brigam pelo mesmo `join`, e a
 * mesma tela de chamado pode ser empilhada duas vezes (um deep link sobre a
 * conversa já aberta).
 */
let sequence = 0;

/**
 * Os canais que ESTE arquivo abriu.
 *
 * Existe para o logout conseguir fechá-los. É uma lista nossa, e não
 * `supabase.removeAllChannels()`: hoje o suporte é o único a abrir canal, mas a
 * função que apaga tudo continuaria chamando "encerrar os canais do suporte"
 * quando a fase 2 (ou o próximo domínio) trouxer o segundo canal.
 */
const openChannels = new Set<RealtimeChannel>();

/**
 * O esqueleto das duas inscrições: abre o canal, deixa o chamador pendurar os
 * `on(...)` nele e devolve a função de cancelar.
 */
function subscribe(
  topic: string,
  attach: (channel: RealtimeChannel) => RealtimeChannel,
  onReconnect?: () => void,
): () => void {
  sequence += 1;
  const channel = attach(supabase.channel(`${topic}:${sequence}`));
  openChannels.add(channel);

  let subscribedBefore = false;

  channel.subscribe((status) => {
    if (status !== 'SUBSCRIBED') return;
    if (subscribedBefore) onReconnect?.();
    subscribedBefore = true;
  });

  return () => {
    openChannels.delete(channel);
    void supabase.removeChannel(channel);
  };
}

/** `payload.new.sender_side`, sem confiar na forma do payload. */
function senderSideOf(record: unknown): string | null {
  if (typeof record !== 'object' || record === null) return null;
  const side = (record as { sender_side?: unknown }).sender_side;
  return typeof side === 'string' ? side : null;
}

/**
 * A CONVERSA de um chamado: mensagem nova naquele chamado.
 *
 * `filter` no `ticket_id` porque esta inscrição existe enquanto UMA tela está
 * aberta: sem ele, cada resposta de qualquer outro chamado acordaria esta tela
 * para reler a conversa errada.
 */
export function subscribeToTicket(
  ticketId: string,
  handlers: SupportSubscription,
): () => void {
  return subscribe(
    `support:ticket:${ticketId}`,
    (channel) =>
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => handlers.onEvent({ senderSide: senderSideOf(payload.new) }),
      ),
    handlers.onReconnect,
  );
}

/**
 * O ATENDIMENTO do negócio inteiro: a lista de chamados e o badge do "Mais".
 *
 * Duas inscrições no mesmo canal — um canal é uma conexão, e a cota é por
 * conexão:
 *
 *  - INSERT em `support_messages`, que é a resposta chegando;
 *  - UPDATE em `support_tickets`, que é o status e o `last_message_at` mudando
 *    (o que reordena a lista).
 *
 * INSERT em `support_tickets` fica de fora: quem abre chamado pelo lado do
 * cliente é este app ou o portal, e a escrita já invalida a lista.
 */
export function subscribeToTenantSupport(handlers: SupportSubscription): () => void {
  return subscribe(
    'support:tenant',
    (channel) =>
      channel
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'support_messages' },
          (payload) => handlers.onEvent({ senderSide: senderSideOf(payload.new) }),
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'support_tickets' },
          () => handlers.onEvent({ senderSide: null }),
        ),
    handlers.onReconnect,
  );
}

/**
 * FECHA os canais do suporte — chamado no logout.
 *
 * Sem isto o websocket da conta anterior continua de pé até o processo morrer:
 * uma conexão a mais na cota, e um canal que o Realtime Inspector do painel
 * mostra como sessão ativa de quem já saiu. O token dela morre com o
 * `signOut`, então ela não recebe mais nada — ela só não vai embora.
 */
export function closeSupportChannels(): void {
  for (const channel of openChannels) void supabase.removeChannel(channel);
  openChannels.clear();
}
