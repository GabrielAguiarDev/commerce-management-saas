"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useAdmin } from "@/components/AdminProvider";
import { PUBLIC_ROUTES } from "@/lib/rotas";
import { customerById } from "@/lib/state";
import { createClient } from "@/lib/supabase/client";

/**
 * Resposta do cliente — e chamado novo — chegando ao console SOZINHOS.
 *
 * Antes disto a fila só mudava com um F5: os chamados são lidos uma vez por
 * navegação, no layout raiz (`listTickets` → `AdminProvider initialTickets`), e
 * nada mandava ler de novo. Quem atende ficava recarregando a tela para saber se
 * alguém respondeu.
 *
 * A REGRA: o evento não traz a mensagem, ele só avisa que algo mudou. Quem
 * recebe chama `router.refresh()`, o layout relê por `lib/chamados.ts` e o
 * `AdminProvider` ressincroniza pela assinatura que ele já mantém (a lista de
 * chamados entra nela por `id:status:messages.length`). Montar a mensagem a
 * partir do payload criaria uma segunda forma de exibi-la — e o vocabulário do
 * banco é traduzido num lugar só, que é `lib/chamados.ts`.
 *
 * SEM FILTRO, de propósito e por um motivo diferente do portal do cliente: quem
 * abre o console é `is_platform_admin()`, e as policies de `support_tickets` e
 * `support_messages` deixam esse papel ler TODOS os tenants. Então o canal
 * recebe o movimento da plataforma inteira, que é exatamente a fila que este
 * console existe para mostrar. Ver `20260928000000_support_realtime.sql`.
 *
 * Ver `docs/architecture/suporte-tempo-real.md`.
 */

/**
 * A pausa que agrupa os eventos.
 *
 * Um chamado novo chega como dois eventos (o chamado e a primeira mensagem), e
 * uma conversa movimentada chega em rajada. Sem a pausa, cada evento dispararia
 * um `router.refresh()`, e cada refresh é o layout raiz inteiro — sete leituras,
 * incluindo clientes, financeiro e catálogos.
 */
const DEBOUNCE_MS = 300;

export function SupportLive() {
  const router = useRouter();
  const pathname = usePathname();
  const { s, a } = useAdmin();
  const { L, toast } = a;

  /**
   * O que o evento precisa consultar, num ref — e não nas dependências do
   * efeito.
   *
   * A lista de clientes vem do layout e muda a cada refresh; o dicionário muda
   * ao trocar o idioma. Qualquer um deles como dependência derrubaria e
   * reabriria o websocket justamente quando um chamado novo acabou de chegar.
   */
  const latest = useRef({ state: s, L, toast });
  useEffect(() => {
    latest.current = { state: s, L, toast };
  }, [s, L, toast]);

  /**
   * As telas de acesso ficam de fora — é a mesma lista que o `proxy.ts` deixa
   * passar sem sessão. Sem sessão não há token no websocket, e o canal não
   * receberia evento nenhum.
   */
  const inConsole = !PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    if (!inConsole) return;

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

    /**
     * Chamado NOVO: o aviso, porque quem atende pode estar em qualquer tela.
     *
     * O nome do negócio sai da lista de clientes que o console já tem em mão —
     * nenhuma consulta a mais, e nada além do `tenant_id` é lido do payload. Um
     * cliente cadastrado depois da última carga ainda não está nessa lista; aí
     * vale o aviso sem nome, que continua dizendo o que importa.
     */
    const onNewTicket = (row: Record<string, unknown>) => {
      const tenantId = typeof row.tenant_id === "string" ? row.tenant_id : null;
      const { state, L: labels, toast: notify } = latest.current;
      const name = tenantId ? customerById(state, tenantId)?.name : undefined;

      notify(name ? `${labels.toastNovoChamado} ${name}` : labels.toastNovoChamadoSemNome);
      reread();
    };

    const channel = supabase
      .channel("support-live")
      // A resposta do cliente na conversa.
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages" },
        reread,
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_tickets" },
        (payload) => onNewTicket(payload.new as Record<string, unknown>),
      )
      // O chamado mudando de status ou de `last_message_at` — o que reordena a
      // fila e move o contador de "abertos" da barra lateral.
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "support_tickets" },
        reread,
      )
      // A RECONEXÃO refaz a leitura: o Realtime não reenvia o que aconteceu
      // enquanto a aba estava sem rede ou dormindo. A PRIMEIRA inscrição não
      // conta — o layout acabou de carregar a fila.
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        if (subscribedBefore) reread();
        subscribedBefore = true;
      });

    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [inConsole, router]);

  return null;
}
