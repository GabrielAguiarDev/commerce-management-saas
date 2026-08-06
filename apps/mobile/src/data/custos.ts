import type { CostAPI, MonthSummaryAPI } from '@domain/costs/costsApiTypes';

import { ID_ACARAJE, ID_PETSHOP, ID_SEM_APP } from './tenants';

/** Custos mock no formato cru da API. */
export const CUSTOS_API: Record<string, CostAPI[]> = {
  [ID_PETSHOP]: [
    {
      id: 'cst_p1',
      tenant_id: ID_PETSHOP,
      name: 'Aluguel da loja',
      amount_cents: 280000,
      kind: 'fixed',
      due_label: 'dia 5',
      from_stock: false,
    },
    {
      id: 'cst_p2',
      tenant_id: ID_PETSHOP,
      name: 'Energia elétrica',
      amount_cents: 69000,
      kind: 'variable',
      due_label: '22/07',
      from_stock: false,
    },
    {
      id: 'cst_p3',
      tenant_id: ID_PETSHOP,
      name: 'Compra de areia higiênica',
      amount_cents: 42000,
      kind: 'variable',
      due_label: '25/07',
      from_stock: true,
    },
    {
      id: 'cst_p4',
      tenant_id: ID_PETSHOP,
      name: 'Ração premium (20 un)',
      amount_cents: 264000,
      kind: 'variable',
      due_label: '24/07',
      from_stock: true,
    },
  ],
  [ID_ACARAJE]: [
    {
      id: 'cst_a1',
      tenant_id: ID_ACARAJE,
      name: 'Aluguel do ponto',
      amount_cents: 40000,
      kind: 'fixed',
      due_label: 'dia 5',
      from_stock: false,
    },
    {
      id: 'cst_a2',
      tenant_id: ID_ACARAJE,
      name: 'Gás de cozinha',
      amount_cents: 13000,
      kind: 'variable',
      due_label: '22/07',
      from_stock: false,
    },
    {
      id: 'cst_a3',
      tenant_id: ID_ACARAJE,
      name: 'Compra de camarão seco',
      amount_cents: 26000,
      kind: 'variable',
      due_label: '25/07',
      from_stock: false,
    },
    {
      id: 'cst_a4',
      tenant_id: ID_ACARAJE,
      name: 'Feira da semana',
      amount_cents: 34000,
      kind: 'variable',
      due_label: '24/07',
      from_stock: false,
    },
  ],
  [ID_SEM_APP]: [],
};

export const RESUMO_MES_API: Record<string, MonthSummaryAPI> = {
  [ID_PETSHOP]: {
    month_label: 'Julho',
    range_label: '1 a 26',
    income_cents: 2846000,
    expense_cents: 1498000,
  },
  [ID_ACARAJE]: {
    month_label: 'Julho',
    range_label: '1 a 26',
    income_cents: 984000,
    expense_cents: 312000,
  },
  [ID_SEM_APP]: {
    month_label: 'Julho',
    range_label: '1 a 26',
    income_cents: null,
    expense_cents: null,
  },
};
