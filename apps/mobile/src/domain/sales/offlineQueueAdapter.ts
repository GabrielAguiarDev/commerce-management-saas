import type { QueuedSaleRow } from './offlineQueueTypes';
import type { QueuedSaleCreate, SaleItemAPI } from './salesApiTypes';
import type { CartItem, PendingSale, SyncFailure } from './salesTypes';

/**
 * TRADUÇÃO DA FILA LOCAL — linhas do SQLite ⇄ modelo de domínio.
 *
 * O irmão local do `salesAdapter`. Nenhuma tela sabe que a fila mora numa
 * tabela, e nenhuma consulta SQL sabe o que é uma `PendingSale`.
 */

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** `HH:mm` da hora local em que a venda foi feita. */
function localTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--:--';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * "hoje", "ontem" ou "12/08".
 *
 * A lista de vendas do Início não precisa disto — ela é sempre do dia. A fila
 * precisa: ela sobrevive ao fim do expediente, e uma linha marcada só "14:32"
 * numa fila com vendas de dois dias diferentes é uma armadilha.
 */
export function relativeDay(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(d, now)) return 'hoje';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return 'ontem';

  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

function summarize(items: { qty: number; product_name: string }[]): string {
  return items.map((i) => `${i.qty}× ${i.product_name}`).join(' · ');
}

/**
 * A mensagem guardada no banco volta a ser um `SyncFailure`.
 *
 * O SQLite guarda o erro como TEXTO (`código|detalhe`) em vez de duas colunas:
 * o par é sempre lido e escrito junto, e uma coluna a mais no schema é uma
 * migração a mais no aparelho de quem já instalou.
 */
export function encodeFailure(failure: SyncFailure): string {
  return `${failure.code}|${failure.detail ?? ''}`;
}

export function decodeFailure(raw: string | null): SyncFailure | null {
  if (!raw) return null;

  const separator = raw.indexOf('|');
  // Sem separador é registro de uma versão anterior do app (ou linha mexida à
  // mão): trata como detalhe puro, sem inventar um código.
  if (separator === -1) return { code: 'unknown', detail: raw };

  const code = raw.slice(0, separator);
  const detail = raw.slice(separator + 1);

  return {
    code: (code as SyncFailure['code']) || 'unknown',
    detail: detail.trim() ? detail : null,
  };
}

export function toPendingSale(row: QueuedSaleRow, now?: Date): PendingSale {
  return {
    localId: row.sale.local_id,
    time: localTime(row.sale.sold_at),
    day: relativeDay(row.sale.sold_at, now),
    items: row.items.map((i) => ({
      productId: i.product_id ?? '',
      name: i.product_name,
      quantity: i.qty,
      unitPriceCents: i.unit_price_cents,
    })),
    itemsSummary: summarize(row.items),
    paymentMethod: row.sale.payment_method,
    totalCents: row.sale.total_cents,
    status: row.sale.status,
    failure: decodeFailure(row.sale.error_message),
  };
}

/**
 * A venda da fila vira o MESMO payload que o Supabase recebe.
 *
 * É a peça que cumpre a promessa da feature: a venda offline não tem caminho
 * próprio de escrita no servidor. Ela vira um `SaleCreateAPI` comum e entra
 * pelo `recordSale` de sempre — passando pelos gatilhos de estoque como
 * qualquer venda. Ela só chega atrasada.
 */
export function toSaleCreateFromQueue(row: QueuedSaleRow): QueuedSaleCreate {
  const items: SaleItemAPI[] = row.items.map((i) => ({
    product_id: i.product_id ?? '',
    product_name: i.product_name,
    qty: i.qty,
    unit_price_cents: i.unit_price_cents,
  }));

  return {
    id: row.sale.local_id,
    sold_at: row.sale.sold_at,
    tenant_id: row.sale.tenant_id,
    payment_method: row.sale.payment_method,
    total_cents: row.sale.total_cents,
    items,
  };
}

/** O carrinho vira uma venda pronta para a fila. */
export function toQueuedSalePayload(
  localId: string,
  soldAt: string,
  tenantId: string,
  items: readonly CartItem[],
  paymentMethod: string,
): QueuedSaleCreate {
  return {
    id: localId,
    sold_at: soldAt,
    tenant_id: tenantId,
    payment_method: paymentMethod,
    total_cents: items.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0),
    items: items.map((i) => ({
      product_id: i.productId,
      product_name: i.name,
      qty: i.quantity,
      unit_price_cents: i.unitPriceCents,
    })),
  };
}
