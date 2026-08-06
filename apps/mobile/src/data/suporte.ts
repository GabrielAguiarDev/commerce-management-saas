import type { TicketAPI, TicketMessageAPI } from '@domain/support/supportApiTypes';

import { ID_ACARAJE, ID_PETSHOP, ID_SEM_APP } from './tenants';

/** Chamados mock no formato cru da API. */

function chamados(tenantId: string): TicketAPI[] {
  return [
    {
      id: `tkt_${tenantId}_1`,
      tenant_id: tenantId,
      subject: 'Como estornar uma venda errada?',
      summary: 'Suporte respondeu há 2 horas',
      status: 'answered',
      has_unread: true,
      updated_at: '2026-07-26T09:55:00.000-03:00',
    },
    {
      id: `tkt_${tenantId}_2`,
      tenant_id: tenantId,
      subject: 'Quero ativar o módulo de estoque',
      summary: 'Aguardando nossa análise',
      status: 'in_progress',
      has_unread: false,
      updated_at: '2026-07-25T14:10:00.000-03:00',
    },
    {
      id: `tkt_${tenantId}_3`,
      tenant_id: tenantId,
      subject: 'Impressora não conecta',
      summary: 'Resolvido em 22/07',
      status: 'resolved',
      has_unread: false,
      updated_at: '2026-07-22T17:30:00.000-03:00',
    },
  ];
}

export const CHAMADOS_API: Record<string, TicketAPI[]> = {
  [ID_PETSHOP]: chamados(ID_PETSHOP),
  [ID_ACARAJE]: chamados(ID_ACARAJE),
  [ID_SEM_APP]: chamados(ID_SEM_APP),
};

/** A thread do chamado 1; os demais abrem com a mensagem de abertura só. */
export const MENSAGENS_API: Record<string, TicketMessageAPI[]> = Object.fromEntries(
  Object.values(CHAMADOS_API)
    .flat()
    .map((t): [string, TicketMessageAPI[]] => {
      if (t.subject === 'Como estornar uma venda errada?') {
        return [
          t.id,
          [
            {
              id: `${t.id}_m1`,
              ticket_id: t.id,
              body: 'Vendi um produto errado hoje de manhã. Como faço pra corrigir?',
              from_support: false,
              created_label: 'hoje, 08:40',
            },
            {
              id: `${t.id}_m2`,
              ticket_id: t.id,
              body: 'Oi! É bem simples: abra a venda em Início › Últimas vendas, toque nela e escolha "Estornar". O estoque volta sozinho.',
              from_support: true,
              created_label: 'hoje, 09:55',
            },
            {
              id: `${t.id}_m3`,
              ticket_id: t.id,
              body: 'Deu certo, obrigada!',
              from_support: false,
              created_label: 'hoje, 10:02',
            },
          ],
        ];
      }
      return [
        t.id,
        [
          {
            id: `${t.id}_m1`,
            ticket_id: t.id,
            body: t.subject,
            from_support: false,
            created_label: '25/07, 14:10',
          },
        ],
      ];
    }),
);
