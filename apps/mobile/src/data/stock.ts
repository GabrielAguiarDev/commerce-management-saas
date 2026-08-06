import type { StockMovementAPI } from '@domain/stock/stockApiTypes';

import { ID_PETSHOP } from './tenants';

/** Movimentações mock no formato cru da API. Só o plano com `stock` tem. */
export const MOVEMENTS_API: Record<string, StockMovementAPI[]> = {
  [ID_PETSHOP]: [
    {
      id: 'mov_1',
      tenant_id: ID_PETSHOP,
      product_id: 'prd_c5',
      product_name: 'Sachê gato salmão',
      delta: -3,
      reason: 'sale',
      actor_name: null,
      happened_label: 'há 12 min',
    },
    {
      id: 'mov_2',
      tenant_id: ID_PETSHOP,
      product_id: 'prd_c4',
      product_name: 'Areia higiênica 4kg',
      delta: 20,
      reason: 'purchase',
      actor_name: null,
      happened_label: 'yesterday',
    },
    {
      id: 'mov_3',
      tenant_id: ID_PETSHOP,
      product_id: 'prd_c7',
      product_name: 'Shampoo neutro 500ml',
      delta: -1,
      reason: 'loss',
      actor_name: 'Maria',
      happened_label: 'yesterday',
    },
    {
      id: 'mov_4',
      tenant_id: ID_PETSHOP,
      product_id: 'prd_c1',
      product_name: 'Ração premium 15kg',
      delta: -1,
      reason: 'sale',
      actor_name: null,
      happened_label: 'yesterday',
    },
  ],
};
