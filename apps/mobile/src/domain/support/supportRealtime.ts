import { supabase } from '@services/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { toMessageAPI, type SupportMessageRow } from './supportApi';
import type { TicketMessageAPI } from './supportApiTypes';

/**
 * FRONTEIRA DE TEMPO REAL do suporte.
 *
 * ⚠️ ÚNICO ARQUIVO DESTE DOMÍNIO QUE ABRE CANAL — a mesma regra do
 * `supportApi.ts` para as consultas.
 *
 * BROADCAST DO BANCO, não `postgres_changes` (desde 29/09/2026). Um trigger
 * publica cada mensagem e cada mudança de chamado no tópico privado
 * `support:tenant:<tenant_id>`, com a linha no payload (ver
 * `20260929000000_support_broadcast.sql`). A autorização acontece UMA vez, na
 * entrada do canal — a policy de `realtime.messages` confere se a sessão é
 * membro ativo daquele negócio —, e não a cada evento para cada inscrito, que é
 * o que fazia o `postgres_changes` escalar mal.
 *
 * UM CANAL POR SESSÃO, compartilhado. O `supabase.channel(topic)` devolve o
 * canal que já existe com aquele tópico — e o tópico agora é fixo por negócio.
 * Se a conversa aberta e o shell tivessem cada um o "seu" canal, fechar a
 * conversa derrubaria o do shell. Aqui o canal é aberto pelo primeiro ouvinte e
 * fechado quando o último sai; a conversa filtra pelo `ticket_id` do payload.
 *
 * A MENSAGEM DO PAYLOAD passa pelo mesmo `toMessageAPI` do SELECT, e dali pelo
 * mesmo adapter: uma tradução só da linha, qualquer que seja o caminho por onde
 * ela chegou.
 *
 * Ver `docs/architecture/suporte-tempo-real.md`.
 */

/** Mensagem nova, já no contrato do app. */
export interface SupportMessageEvent {
  ticketId: string;
  /** `support_messages.sender_side` — decide se marca como lida. */
  senderSide: string;
  message: TicketMessageAPI;
}

export interface SupportListener {
  onMessage?: (event: SupportMessageEvent) => void;
  /** Chamado aberto, mudou de status ou de `last_message_at`. */
  onTicketChange?: () => void;
  /**
   * O canal VOLTOU a `SUBSCRIBED` depois de uma queda.
   *
   * O Realtime não reenvia o que se perdeu enquanto o aparelho estava sem
   * rede: quem ouve relê pelo caminho de sempre. Não é chamado na PRIMEIRA
   * inscrição — ali a consulta acabou de rodar.
   */
  onReconnect?: () => void;
}

export function supportTopic(tenantId: string): string {
  return `support:tenant:${tenantId}`;
}

interface SharedChannel {
  tenantId: string;
  channel: RealtimeChannel;
  listeners: Set<SupportListener>;
}

let shared: SharedChannel | null = null;

/** O payload vem do banco, mas passa por rede: nada de confiar na forma. */
function parseMessage(payload: unknown): SupportMessageEvent | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const row = payload as Partial<Record<keyof SupportMessageRow, unknown>>;
  const strings = ['id', 'ticket_id', 'body', 'sender_side', 'created_at'] as const;
  if (!strings.every((key) => typeof row[key] === 'string')) return null;
  const attachment = typeof row.attachment_url === 'string' ? row.attachment_url : null;

  const message = toMessageAPI({
    id: row.id as string,
    ticket_id: row.ticket_id as string,
    body: row.body as string,
    sender_side: row.sender_side as string,
    created_at: row.created_at as string,
    attachment_url: attachment,
  });
  return { ticketId: message.ticket_id, senderSide: row.sender_side as string, message };
}

function open(tenantId: string): SharedChannel {
  const listeners = new Set<SupportListener>();
  let subscribedBefore = false;
  const each = (fn: (listener: SupportListener) => void) => {
    for (const listener of [...listeners]) fn(listener);
  };
  const ticketChanged = () => each((l) => l.onTicketChange?.());

  const channel = supabase
    .channel(supportTopic(tenantId), { config: { private: true } })
    .on('broadcast', { event: 'message_created' }, ({ payload }) => {
      const event = parseMessage(payload);
      if (event) each((l) => l.onMessage?.(event));
    })
    .on('broadcast', { event: 'ticket_created' }, ticketChanged)
    .on('broadcast', { event: 'ticket_updated' }, ticketChanged);

  channel.subscribe((status) => {
    if (status !== 'SUBSCRIBED') return;
    if (subscribedBefore) each((l) => l.onReconnect?.());
    subscribedBefore = true;
  });

  return { tenantId, channel, listeners };
}

/**
 * Ouve o suporte do negócio. Devolve a função de parar de ouvir.
 *
 * Trocar de negócio (outro login no mesmo processo) fecha o canal anterior: a
 * sessão nova não tem permissão nele, e ele só ocuparia a cota.
 */
export function subscribeToSupport(tenantId: string, listener: SupportListener): () => void {
  if (shared && shared.tenantId !== tenantId) closeSupportChannels();
  shared ??= open(tenantId);

  const current = shared;
  current.listeners.add(listener);

  return () => {
    current.listeners.delete(listener);
    if (current.listeners.size === 0 && shared === current) {
      shared = null;
      void supabase.removeChannel(current.channel);
    }
  };
}

/**
 * FECHA o canal do suporte — chamado no logout.
 *
 * Sem isto o websocket da conta anterior continua de pé até o processo morrer:
 * uma conexão a mais na cota, e um canal que o Realtime Inspector do painel
 * mostra como sessão ativa de quem já saiu.
 */
export function closeSupportChannels(): void {
  if (!shared) return;
  const current = shared;
  shared = null;
  current.listeners.clear();
  void supabase.removeChannel(current.channel);
}
