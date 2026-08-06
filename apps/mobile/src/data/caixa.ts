import type { CashHistoryAPI, CashShiftAPI } from '@domain/cash/cashApiTypes';

import { ID_PETSHOP } from './tenants';

/**
 * Caixa mock no formato cru da API.
 *
 * Só o Petshop tem o módulo `cash` no plano — por isso só ele tem turno. O
 * mapa vazio para os outros não é esquecimento: é o comportamento certo de um
 * plano sem caixa.
 */

/** Turno em andamento, ou `null` quando o caixa está fechado. */
export const TURNO_ABERTO_API: Record<string, CashShiftAPI | null> = {
  [ID_PETSHOP]: {
    id: 'shf_hoje',
    tenant_id: ID_PETSHOP,
    opened_at: '2026-07-26T08:12:00.000-03:00',
    closed_at: null,
    opening_cents: 15000,
    drawer_cents: 74250,
    method_totals: [
      { method: 'Dinheiro', amount_cents: 59250 },
      { method: 'Pix', amount_cents: 31800 },
      { method: 'Cartão de débito', amount_cents: 21000 },
      { method: 'Cartão de crédito', amount_cents: 15390 },
    ],
  },
};

export const HISTORICO_CAIXA_API: Record<string, CashHistoryAPI[]> = {
  [ID_PETSHOP]: [
    {
      id: 'shf_25',
      date_label: 'Ontem, 25/07',
      period_label: '08:05 → 18:40',
      total_cents: 110230,
      difference_cents: 0,
    },
    {
      id: 'shf_24',
      date_label: 'Quinta, 24/07',
      period_label: '08:12 → 18:20',
      total_cents: 96850,
      difference_cents: -300,
    },
    {
      id: 'shf_23',
      date_label: 'Quarta, 23/07',
      period_label: '08:00 → 17:55',
      total_cents: 124000,
      // Coluna nula (turno antigo, antes da conferência existir): o adapter
      // resolve para 0 em vez de deixar `null` chegar à tela.
      difference_cents: null,
    },
  ],
};
