"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { markTicketRead } from "@/app/suporte/actions";
import { usePortal } from "@/components/PortalProvider";
import { AUTHOR_DB } from "@/lib/dados/chamados";
import { ticketFromRoute } from "@/lib/rotas";
import { createClient } from "@/lib/supabase/client";

/**
 * Resposta nova do suporte aparece SOZINHA, com a tela aberta.
 *
 * Antes disto a resposta só surgia com um F5 — o portal lê os chamados uma vez
 * por navegação, no layout raiz (`loadPortal` → `PortalProvider` → `d.tickets`),
 * e nada mandava ler de novo.
 *
 * BROADCAST DO BANCO (desde 29/09/2026): um trigger publica cada mensagem e
 * cada mudança de chamado no tópico PRIVADO `support:tenant:<tenant_id>`, e a
 * policy de `realtime.messages` só deixa entrar membro ativo daquele negócio
 * (ver `20260929000000_support_broadcast.sql`). A autorização é feita uma vez,
 * na entrada do canal — não a cada evento, como no `postgres_changes`.
 *
 * O portal usa do payload só o que DECIDE (de qual chamado é, quem escreveu) e
 * chama `router.refresh()`: a página é renderizada no servidor e não há cache
 * no navegador onde pôr a mensagem. O layout relê pelo caminho de sempre, com
 * RLS e os adapters de `lib/dados`.
 *
 * O TOKEN vem do cliente do navegador (`lib/supabase/client.ts`), que carrega a
 * sessão do cookie próprio do portal (`sb-aguiar-client-auth`) — o mesmo cliente
 * de qualquer outro componente cliente, e por isso o canal entra no websocket
 * autenticado como o usuário.
 *
 * Montado no `app/layout.tsx`, ao lado do `AccessRevoked`: uma inscrição por
 * aba, viva em todas as telas, porque o selo de "nova resposta" do menu tem de
 * acender em qualquer uma delas.
 *
 * Ver `docs/architecture/suporte-tempo-real.md`.
 */

/**
 * A pausa que agrupa os eventos.
 *
 * Uma conversa costuma chegar em rajada — a resposta, o `last_message_at` do
 * chamado e o status, três eventos em milissegundos. Sem a pausa, cada um
 * dispararia um `router.refresh()`, e cada refresh é o layout raiz inteiro
 * (sete consultas ao banco). Com ela, a rajada vira um refresh.
 */
const DEBOUNCE_MS = 300;

export function SupportLive() {
  const router = useRouter();
  const pathname = usePathname();
  const { d } = usePortal();

  /**
   * O chamado ABERTO na tela, num ref.
   *
   * Ref, e não dependência do efeito do canal: a rota muda a cada navegação, e
   * como dependência ela derrubaria e reabriria o websocket em cada uma delas.
   * Aqui ela entra na DECISÃO de cada evento, que é assíncrona e sempre posterior
   * ao render — por isso escrever depois de pintar chega em tempo.
   */
  const openTicket = useRef<string | null>(null);
  useEffect(() => {
    openTicket.current = ticketFromRoute(pathname);
  }, [pathname]);

  /**
   * `business.id` é o `tenant_id`, e só existe num retrato lido COM sessão (em
   * `EMPTY_DATA` é string vazia) — o mesmo sinal que a casca usa para saber se o
   * portal carregou. Sem ele não há a quem entregar evento: é o `/login`, ou um
   * ambiente sem credenciais. Abrir canal ali seria um websocket que nunca
   * recebe nada.
   */
  const signedIn = Boolean(d.business.id);

  const tenantId = d.business.id;

  useEffect(() => {
    if (!signedIn) return;

    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let subscribedBefore = false;

    const reread = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        router.refresh();
      }, DEBOUNCE_MS);
    };

    const onMessage = (row: Record<string, unknown>) => {
      const ticketId = typeof row.ticket_id === "string" ? row.ticket_id : null;
      const senderSide = typeof row.sender_side === "string" ? row.sender_side : null;

      // A conversa está na frente da pessoa: o selo "nova resposta" não pode
      // acender por uma mensagem que ela está lendo. Só o que NÃO é do cliente —
      // a própria resposta dele volta por este mesmo canal, e o trigger
      // `guard_support_message_write` recusaria marcá-la.
      const readingIt =
        ticketId !== null && ticketId === openTicket.current && senderSide !== AUTHOR_DB.customer;

      // O refresh vem depois de marcar como lida, e não em paralelo: o layout
      // relê `d.tickets`, e uma leitura que atravessasse o update voltaria com o
      // selo aceso mesmo assim. `markTicketRead` já revalida o layout; o
      // `reread` agrupado é o que garante que a tela busque de novo.
      if (readingIt) void markTicketRead(ticketId).then(reread, reread);
      else reread();
    };

    const channel = supabase
      .channel(`support:tenant:${tenantId}`, { config: { private: true } })
      .on("broadcast", { event: "message_created" }, ({ payload }) =>
        onMessage((payload ?? {}) as Record<string, unknown>),
      )
      // Chamado novo, ou mudando de status e `last_message_at` — o que reordena
      // a lista e troca o rótulo de "Aguardando você".
      .on("broadcast", { event: "ticket_created" }, reread)
      .on("broadcast", { event: "ticket_updated" }, reread)
      // A RECONEXÃO refaz a leitura: o Realtime não reenvia o evento que
      // aconteceu enquanto a aba estava sem rede ou dormindo. A PRIMEIRA
      // inscrição não conta — o layout acabou de carregar os chamados, e
      // refrescar ali seria uma segunda carga completa por aba aberta.
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        if (subscribedBefore) reread();
        subscribedBefore = true;
      });

    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [signedIn, tenantId, router]);

  return null;
}
