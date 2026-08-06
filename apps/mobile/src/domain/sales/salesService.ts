import { totalCents } from './cart';
import * as api from './salesApi';
import { toDailySummary, toSaleCreatePayload, toSale } from './salesAdapter';
import { SaleError, type CartItem, type DailySummary, type Sale } from './salesTypes';

/** AS REGRAS das vendas. */

function normalize(error: unknown): never {
  if (error instanceof SaleError) throw error;
  throw new SaleError('network', error instanceof Error ? error.message : undefined);
}

export async function listDailySales(tenantId: string): Promise<Sale[]> {
  try {
    return (await api.listDailySales(tenantId)).map(toSale);
  } catch (e) {
    return normalize(e);
  }
}

const EMPTY_SUMMARY: DailySummary = {
  totalCents: 0,
  profitCents: 0,
  saleCount: 0,
  soldItems: 0,
  averageTicketCents: 0,
  maisVendido: null,
};

export async function getDailySummary(tenantId: string): Promise<DailySummary> {
  try {
    const raw = await api.fetchDailySummary(tenantId);
    // Negócio sem venda hoje não é erro — é um dia que ainda vai começar.
    return raw ? toDailySummary(raw) : EMPTY_SUMMARY;
  } catch (e) {
    return normalize(e);
  }
}

/**
 * Finaliza a venda.
 *
 * `online` entra como argumento (não é lido de um store aqui dentro) porque
 * service não conhece React nem estado global: quem sabe da conexão é o
 * useCase, que passa o valor. É isso que mantém esta função testável no node.
 */
export async function checkoutSale(
  tenantId: string,
  items: readonly CartItem[],
  paymentMethod: string,
  online: boolean,
): Promise<Sale> {
  if (items.length === 0) throw new SaleError('empty_cart');
  if (!paymentMethod.trim()) throw new SaleError('no_payment_method');

  try {
    const raw = await api.recordSale(
      toSaleCreatePayload(tenantId, items, paymentMethod, online),
    );
    return toSale(raw);
  } catch (e) {
    return normalize(e);
  }
}

export { totalCents };
