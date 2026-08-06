import type { TicketAPI, TicketCreateAPI, TicketMessageAPI } from './supportApiTypes';
import type { Chamado, MensagemDoChamado, NovoChamado, StatusChamado } from './supportTypes';

const ROTULO: Record<StatusChamado, string> = {
  respondido: 'Respondido',
  em_andamento: 'Em andamento',
  resolvido: 'Resolvido',
};

/**
 * Enum do banco → status de domínio.
 *
 * Status desconhecido cai em "em andamento" e não quebra a lista: um chamado
 * com estado novo no servidor precisa continuar aparecendo, ainda que com o
 * rótulo genérico, até o app ser atualizado.
 */
function toStatus(raw: string): StatusChamado {
  if (raw === 'answered') return 'respondido';
  if (raw === 'resolved') return 'resolvido';
  return 'em_andamento';
}

export function toChamado(raw: TicketAPI): Chamado {
  const status = toStatus(raw.status);
  return {
    id: raw.id,
    assunto: raw.subject,
    resumo: raw.summary ?? '',
    status,
    statusRotulo: ROTULO[status],
    naoLida: raw.has_unread === true,
  };
}

/** `from_support` vira `minha` invertido: a tela pensa "é minha bolha?". */
export function toMensagem(raw: TicketMessageAPI): MensagemDoChamado {
  return {
    id: raw.id,
    texto: raw.body,
    minha: !raw.from_support,
    quando: raw.created_label,
  };
}

export function toChamadoPayload(tenantId: string, novo: NovoChamado): TicketCreateAPI {
  return {
    tenant_id: tenantId,
    subject: novo.assunto.trim(),
    category: novo.categoria,
    body: novo.descricao.trim(),
  };
}

/** Quantos chamados têm mensagem não lida — o badge vermelho da tela "Mais". */
export function contarNaoLidos(chamados: readonly Chamado[]): number {
  return chamados.filter((c) => c.naoLida).length;
}
