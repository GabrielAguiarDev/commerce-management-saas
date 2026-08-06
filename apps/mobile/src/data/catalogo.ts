import type { ProductAPI } from '@domain/catalog/catalogApiTypes';

import { ID_ACARAJE, ID_PETSHOP, ID_SEM_APP } from './tenants';

/**
 * Catálogo mock no formato cru da API.
 *
 * Os produtos e preços vêm do protótipo (`catalogo()`, linha ~790 do
 * design.html), convertidos para centavos inteiros — o formato em que dinheiro
 * trafega no app inteiro.
 *
 * Repare nos nulos deliberados: serviço tem `stock_qty: null` (não controla
 * estoque) enquanto o sachê de gato tem `stock_qty: 0` (acabou). São estados
 * diferentes, e o adapter precisa continuar sabendo distinguir.
 */

const AGORA = '2026-07-26T09:00:00.000Z';

function produto(p: Partial<ProductAPI> & Pick<ProductAPI, 'id' | 'tenant_id' | 'name'>): ProductAPI {
  return {
    sku: null,
    price_cents: 0,
    cost_cents: null,
    is_service: false,
    is_favorite: true,
    stock_qty: null,
    stock_min: null,
    category: null,
    created_at: AGORA,
    updated_at: null,
    ...p,
  };
}

const PETSHOP: ProductAPI[] = [
  produto({
    id: 'prd_c1',
    tenant_id: ID_PETSHOP,
    name: 'Ração premium cães 15kg',
    sku: '7891',
    price_cents: 18990,
    cost_cents: 13200,
    stock_qty: 8,
    stock_min: 4,
    category: 'Alimentação',
  }),
  produto({
    id: 'prd_c2',
    tenant_id: ID_PETSHOP,
    name: 'Banho & tosa porte médio',
    sku: 'SERV1',
    price_cents: 7000,
    is_service: true,
    category: 'Serviços',
  }),
  produto({
    id: 'prd_c3',
    tenant_id: ID_PETSHOP,
    name: 'Coleira antipulgas',
    sku: '7892',
    price_cents: 4590,
    cost_cents: 2900,
    stock_qty: 3,
    stock_min: 5,
    category: 'Acessórios',
  }),
  produto({
    id: 'prd_c4',
    tenant_id: ID_PETSHOP,
    name: 'Areia higiênica 4kg',
    sku: '7893',
    price_cents: 2850,
    cost_cents: 1750,
    stock_qty: 21,
    stock_min: 6,
    category: 'Higiene',
  }),
  produto({
    id: 'prd_c5',
    tenant_id: ID_PETSHOP,
    name: 'Sachê gato salmão',
    sku: '7894',
    price_cents: 450,
    cost_cents: 260,
    stock_qty: 0,
    stock_min: 12,
    category: 'Alimentação',
  }),
  produto({
    id: 'prd_c6',
    tenant_id: ID_PETSHOP,
    name: 'Brinquedo mordedor',
    sku: '7895',
    price_cents: 1990,
    cost_cents: 900,
    stock_qty: 12,
    stock_min: 4,
    category: 'Acessórios',
  }),
  produto({
    id: 'prd_c7',
    tenant_id: ID_PETSHOP,
    name: 'Shampoo neutro 500ml',
    sku: '7896',
    price_cents: 3200,
    cost_cents: 1600,
    stock_qty: 6,
    stock_min: 3,
    category: 'Higiene',
  }),
  produto({
    id: 'prd_c8',
    tenant_id: ID_PETSHOP,
    name: 'Consulta veterinária',
    sku: 'SERV2',
    price_cents: 12000,
    is_service: true,
    category: 'Serviços',
  }),
];

const ACARAJE: ProductAPI[] = [
  produto({
    id: 'prd_s1',
    tenant_id: ID_ACARAJE,
    name: 'Acarajé completo',
    sku: '001',
    price_cents: 1200,
    cost_cents: 450,
    category: 'Comida',
  }),
  produto({
    id: 'prd_s2',
    tenant_id: ID_ACARAJE,
    name: 'Abará',
    sku: '002',
    price_cents: 1000,
    cost_cents: 380,
    category: 'Comida',
  }),
  produto({
    id: 'prd_s3',
    tenant_id: ID_ACARAJE,
    name: 'Vatapá (porção)',
    sku: '003',
    price_cents: 800,
    cost_cents: 300,
    category: 'Comida',
  }),
  produto({
    id: 'prd_s4',
    tenant_id: ID_ACARAJE,
    name: 'Combo acarajé + refri',
    sku: '004',
    price_cents: 1600,
    cost_cents: 650,
    category: 'Comida',
  }),
  produto({
    id: 'prd_s5',
    tenant_id: ID_ACARAJE,
    name: 'Refrigerante lata',
    sku: '005',
    price_cents: 600,
    cost_cents: 280,
    category: 'Bebidas',
  }),
  produto({
    id: 'prd_s6',
    tenant_id: ID_ACARAJE,
    name: 'Água mineral',
    sku: '006',
    price_cents: 300,
    cost_cents: 110,
    category: 'Bebidas',
  }),
];

/**
 * Mutável de propósito: nesta fase o mock É o banco, e o cadastro rápido
 * precisa deixar o produto disponível para venda na hora, como no protótipo.
 */
export const CATALOGO_API: Record<string, ProductAPI[]> = {
  [ID_PETSHOP]: [...PETSHOP],
  [ID_ACARAJE]: [...ACARAJE],
  [ID_SEM_APP]: [],
};

/**
 * O chip de filtro que muda de nome conforme o ramo — "Serviços" no petshop,
 * "Bebidas" na barraca. É dado do negócio, então mora com o catálogo.
 */
export const CATEGORIA_ESPECIAL: Record<string, string> = {
  [ID_PETSHOP]: 'Serviços',
  [ID_ACARAJE]: 'Bebidas',
  [ID_SEM_APP]: 'Serviços',
};
