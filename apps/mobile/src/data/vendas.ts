import type { DailySummaryAPI, SaleAPI } from '@domain/sales/salesApiTypes';

import { ID_ACARAJE, ID_PETSHOP, ID_SEM_APP } from './tenants';

/**
 * Vendas mock no formato cru da API.
 *
 * `created_at` sai em ISO com fuso -03:00 justamente para o adapter ter algo
 * real para converter — as horas exibidas (10:52, 10:20, 09:47) são as do
 * protótipo quando lidas em horário de Brasília.
 */

const DIA = '2026-07-26';

function venda(
  id: string,
  tenantId: string,
  hora: string,
  itens: { id: string; nome: string; qtd: number; unit: number }[],
  pagamento: string,
): SaleAPI {
  return {
    id,
    tenant_id: tenantId,
    created_at: `${DIA}T${hora}:00.000-03:00`,
    total_cents: itens.reduce((s, i) => s + i.unit * i.qtd, 0),
    payment_method: pagamento,
    items: itens.map((i) => ({
      product_id: i.id,
      product_name: i.nome,
      qty: i.qtd,
      unit_price_cents: i.unit,
    })),
    is_synced: true,
  };
}

export const VENDAS_API: Record<string, SaleAPI[]> = {
  [ID_PETSHOP]: [
    venda(
      'sal_p1',
      ID_PETSHOP,
      '10:52',
      [{ id: 'prd_c1', nome: 'Ração premium 15kg', qtd: 1, unit: 18990 }],
      'Cartão de crédito',
    ),
    venda(
      'sal_p2',
      ID_PETSHOP,
      '10:20',
      [
        { id: 'prd_c2', nome: 'Banho & tosa', qtd: 1, unit: 7000 },
        { id: 'prd_c7', nome: 'Shampoo', qtd: 1, unit: 3200 },
      ],
      'Pix',
    ),
    venda(
      'sal_p3',
      ID_PETSHOP,
      '09:47',
      [
        { id: 'prd_c5', nome: 'Sachê gato', qtd: 3, unit: 450 },
        { id: 'prd_c4', nome: 'Areia 4kg', qtd: 1, unit: 2850 },
      ],
      'Dinheiro',
    ),
  ],
  [ID_ACARAJE]: [
    venda(
      'sal_a1',
      ID_ACARAJE,
      '11:42',
      [{ id: 'prd_s1', nome: 'Acarajé completo', qtd: 2, unit: 1200 }],
      'Pix',
    ),
    venda(
      'sal_a2',
      ID_ACARAJE,
      '11:31',
      [
        { id: 'prd_s2', nome: 'Abará', qtd: 1, unit: 1000 },
        { id: 'prd_s6', nome: 'Água', qtd: 1, unit: 300 },
      ],
      'Dinheiro',
    ),
    venda(
      'sal_a3',
      ID_ACARAJE,
      '11:18',
      [{ id: 'prd_s4', nome: 'Combo acarajé + refri', qtd: 1, unit: 1600 }],
      'Dinheiro',
    ),
  ],
  [ID_SEM_APP]: [],
};

export const RESUMO_DIA_API: Record<string, DailySummaryAPI> = {
  [ID_PETSHOP]: {
    date: DIA,
    gross_cents: 127440,
    profit_cents: 51120,
    sale_count: 18,
    item_count: 31,
    top_product_name: 'Ração premium 15kg',
    top_product_qty: 4,
  },
  [ID_ACARAJE]: {
    date: DIA,
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
    date: DIA,
    gross_cents: null,
    profit_cents: null,
    sale_count: null,
    item_count: null,
    top_product_name: null,
    top_product_qty: null,
  },
};
