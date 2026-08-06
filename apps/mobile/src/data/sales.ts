import type { DailySummaryAPI, SaleAPI } from '@domain/sales/salesApiTypes';

import { ID_ACARAJE, ID_PETSHOP, ID_SEM_APP } from './tenants';

/**
 * Vendas mock no formato cru da API.
 *
 * `created_at` sai em ISO com fuso -03:00 justamente para o adapter ter algo
 * real para converter — as horas exibidas (10:52, 10:20, 09:47) são as do
 * protótipo quando lidas em horário de Brasília.
 */

const DAY = '2026-07-26';

function sale(
  id: string,
  tenantId: string,
  time: string,
  items: { id: string; name: string; qtd: number; unit: number }[],
  payment: string,
): SaleAPI {
  return {
    id,
    tenant_id: tenantId,
    created_at: `${DAY}T${time}:00.000-03:00`,
    total_cents: items.reduce((s, i) => s + i.unit * i.qtd, 0),
    payment_method: payment,
    items: items.map((i) => ({
      product_id: i.id,
      product_name: i.name,
      qty: i.qtd,
      unit_price_cents: i.unit,
    })),
    is_synced: true,
  };
}

export const SALES_API: Record<string, SaleAPI[]> = {
  [ID_PETSHOP]: [
    sale(
      'sal_p1',
      ID_PETSHOP,
      '10:52',
      [{ id: 'prd_c1', name: 'Ração premium 15kg', qtd: 1, unit: 18990 }],
      'Cartão de crédito',
    ),
    sale(
      'sal_p2',
      ID_PETSHOP,
      '10:20',
      [
        { id: 'prd_c2', name: 'Banho & tosa', qtd: 1, unit: 7000 },
        { id: 'prd_c7', name: 'Shampoo', qtd: 1, unit: 3200 },
      ],
      'Pix',
    ),
    sale(
      'sal_p3',
      ID_PETSHOP,
      '09:47',
      [
        { id: 'prd_c5', name: 'Sachê gato', qtd: 3, unit: 450 },
        { id: 'prd_c4', name: 'Areia 4kg', qtd: 1, unit: 2850 },
      ],
      'Dinheiro',
    ),
  ],
  [ID_ACARAJE]: [
    sale(
      'sal_a1',
      ID_ACARAJE,
      '11:42',
      [{ id: 'prd_s1', name: 'Acarajé completo', qtd: 2, unit: 1200 }],
      'Pix',
    ),
    sale(
      'sal_a2',
      ID_ACARAJE,
      '11:31',
      [
        { id: 'prd_s2', name: 'Abará', qtd: 1, unit: 1000 },
        { id: 'prd_s6', name: 'Água', qtd: 1, unit: 300 },
      ],
      'Dinheiro',
    ),
    sale(
      'sal_a3',
      ID_ACARAJE,
      '11:18',
      [{ id: 'prd_s4', name: 'Combo acarajé + refri', qtd: 1, unit: 1600 }],
      'Dinheiro',
    ),
  ],
  [ID_SEM_APP]: [],
};

export const DAILY_SUMMARY_API: Record<string, DailySummaryAPI> = {
  [ID_PETSHOP]: {
    date: DAY,
    gross_cents: 127440,
    profit_cents: 51120,
    sale_count: 18,
    item_count: 31,
    top_product_name: 'Ração premium 15kg',
    top_product_qty: 4,
  },
  [ID_ACARAJE]: {
    date: DAY,
    gross_cents: 48600,
    profit_cents: 29800,
    sale_count: 39,
    item_count: 62,
    top_product_name: 'Acarajé completo',
    top_product_qty: 24,
  },
  // Resumo com tudo nulo: é o que um tenant recém-criado devolve, e o adapter
  // precisa continuar entregando zeros em vez de `NaN` na tela.
  [ID_SEM_APP]: {
    date: DAY,
    gross_cents: null,
    profit_cents: null,
    sale_count: null,
    item_count: null,
    top_product_name: null,
    top_product_qty: null,
  },
};
