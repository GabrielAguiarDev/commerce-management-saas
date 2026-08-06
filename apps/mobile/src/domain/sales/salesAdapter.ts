
import type { DailySummaryAPI, SaleAPI, SaleCreateAPI, SaleItemAPI } from './salesApiTypes';
import type { CartItem, DailySummary, Sale } from './salesTypes';

/**
 * Hora local em `HH:mm`.
 *
 * Fica no adapter porque converter fuso é tradução de contrato: o servidor
 * manda UTC, o balconista pensa em hora do balcão. Se isso vivesse na tela,
 * cada lista formataria de um jeito.
 */
function localTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--:--';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function resumir(items: SaleItemAPI[]): string {
  return items.map((i) => `${i.qty}× ${i.product_name}`).join(' · ');
}

/**
 * `SaleAPI` → `Venda`.
 *
 * Renomeia, deriva `hora` e `resumoItens` (campos compostos que a lista usa
 * direto) e inverte a semântica de `is_synced` para `pendenteDeSincronia` —
 * porque a tela pergunta "está pendente?", não "está sincronizada?". Nulo é
 * tratado como sincronizada: o servidor antigo não mandava a coluna.
 */
export function toSale(raw: SaleAPI): Sale {
  return {
    id: raw.id,
    time: localTime(raw.created_at),
    items: raw.items.map((i) => ({
      productId: i.product_id,
      name: i.product_name,
      quantity: i.qty,
      unitPriceCents: i.unit_price_cents,
    })),
    itemsSummary: resumir(raw.items),
    paymentMethod: raw.payment_method,
    totalCents: raw.total_cents,
    pendingSync: raw.is_synced === false,
  };
}

/**
 * `DailySummaryAPI` → `ResumoDoDia`.
 *
 * O ticket médio NÃO vem do servidor: é derivado aqui, porque é razão entre
 * dois campos que já vieram. Duplicar o cálculo no backend seria mais um lugar
 * para as duas contas discordarem. Divisão por zero vira zero, não `NaN`.
 */
export function toDailySummary(raw: DailySummaryAPI): DailySummary {
  const total = raw.gross_cents ?? 0;
  const sales = raw.sale_count ?? 0;

  return {
    totalCents: total,
    profitCents: raw.profit_cents ?? 0,
    saleCount: sales,
    soldItems: raw.item_count ?? 0,
    averageTicketCents: sales > 0 ? Math.round(total / sales) : 0,
    maisVendido: raw.top_product_name
      ? {
          name: raw.top_product_name,
          quantity: raw.top_product_qty ?? 0,
        }
      : null,
  };
}

export function toSaleCreatePayload(
  tenantId: string,
  items: readonly CartItem[],
  paymentMethod: string,
  online: boolean,
): SaleCreateAPI {
  return {
    tenant_id: tenantId,
    payment_method: paymentMethod,
    total_cents: items.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0),
    items: items.map((i) => ({
      product_id: i.productId,
      product_name: i.name,
      qty: i.quantity,
      unit_price_cents: i.unitPriceCents,
    })),
    is_synced: online,
  };
}
