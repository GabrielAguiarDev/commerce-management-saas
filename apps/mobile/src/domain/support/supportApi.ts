import { CHAMADOS_API, MENSAGENS_API } from '@data/suporte';
import { esperar } from '@services/mockLatency';

import type { TicketAPI, TicketCreateAPI, TicketMessageAPI, TicketReplyAPI } from './supportApiTypes';

/**
 * FRONTEIRA DE REDE do suporte.
 * ⚠️ ÚNICO ARQUIVO DESTE DOMÍNIO QUE MUDA COM O SUPABASE.
 */

export async function listarChamados(tenantId: string): Promise<TicketAPI[]> {
  await esperar();
  return CHAMADOS_API[tenantId] ?? [];
}

export async function listarMensagens(chamadoId: string): Promise<TicketMessageAPI[]> {
  await esperar();
  return MENSAGENS_API[chamadoId] ?? [];
}

/** Abrir o chamado marca como lido — no servidor real seria um `update`. */
export async function marcarComoLido(tenantId: string, chamadoId: string): Promise<void> {
  await esperar(60);
  const lista = CHAMADOS_API[tenantId] ?? [];
  CHAMADOS_API[tenantId] = lista.map((t) =>
    t.id === chamadoId ? { ...t, has_unread: false } : t,
  );
}

export async function criarChamado(payload: TicketCreateAPI): Promise<TicketAPI> {
  await esperar(320);

  const novo: TicketAPI = {
    id: `tkt_${Date.now().toString(36)}`,
    tenant_id: payload.tenant_id,
    subject: payload.subject,
    summary: 'Aguardando nossa análise',
    status: 'in_progress',
    has_unread: false,
    updated_at: new Date().toISOString(),
  };

  CHAMADOS_API[payload.tenant_id] = [novo, ...(CHAMADOS_API[payload.tenant_id] ?? [])];
  MENSAGENS_API[novo.id] = [
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

export async function responder(payload: TicketReplyAPI): Promise<TicketMessageAPI> {
  await esperar(200);

  const mensagem: TicketMessageAPI = {
    id: `msg_${Date.now().toString(36)}`,
    ticket_id: payload.ticket_id,
    body: payload.body,
    from_support: false,
    created_label: 'agora',
  };

  MENSAGENS_API[payload.ticket_id] = [...(MENSAGENS_API[payload.ticket_id] ?? []), mensagem];
  return mensagem;
}
