import { getDatabase } from '@services/database';

import type { QueuedSaleCreate } from './salesApiTypes';
import type {
  OfflineSaleItemRow,
  OfflineSaleRow,
  PendingSaleStatus,
  QueuedSaleRow,
} from './offlineQueueTypes';

/**
 * FRONTEIRA DO BANCO LOCAL das vendas.
 *
 * ⚠️ ÚNICO ARQUIVO DESTE DOMÍNIO QUE FALA COM O SQLITE — o irmão local do
 * `salesApi`, que é o único a falar com o Supabase. As duas fronteiras devolvem
 * o MESMO formato de contrato (`*ApiTypes`), e é isso que permite ao service
 * escolher entre "manda agora" e "guarda para depois" sem que adapter, useCase
 * ou tela saibam que existe um banco no aparelho.
 *
 * Aqui não há regra de negócio: nada decide se a venda vai para a fila. Isso é
 * do service. Aqui só se grava, lê, marca e apaga.
 */

/**
 * ENFILEIRA UMA VENDA.
 *
 * A venda e os itens entram numa TRANSAÇÃO só. É a propriedade que justifica o
 * SQLite neste app: ou a venda entra inteira, com todos os itens, ou não entra
 * nada. Uma venda gravada pela metade — o cabeçalho sem os itens — subiria
 * depois como uma venda de R$ 0,00 e sem baixa de estoque, que é pior do que a
 * venda não ter sido salva: ela MENTE sobre o que aconteceu no balcão.
 *
 * `withExclusiveTransactionAsync` e não `withTransactionAsync`: só o que está
 * dentro do escopo participa da transação. Se uma venda for fechada enquanto a
 * sincronização roda, as duas não se atropelam.
 */
export async function enqueue(payload: QueuedSaleCreate): Promise<void> {
  const db = getDatabase();

  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(
      `INSERT INTO offline_sales
         (local_id, tenant_id, payment_method, total_cents, sold_at, status, error_message)
       VALUES (?, ?, ?, ?, ?, 'pending', NULL)`,
      payload.id,
      payload.tenant_id,
      payload.payment_method,
      payload.total_cents,
      payload.sold_at,
    );

    for (const item of payload.items) {
      await tx.runAsync(
        `INSERT INTO offline_sale_items
           (local_id, product_id, product_name, qty, unit_price_cents)
         VALUES (?, ?, ?, ?, ?)`,
        payload.id,
        // String vazia viraria uma FK inválida lá na frente, quando esta venda
        // subir: o produto avulso guarda `null` e sobrevive pelo nome.
        item.product_id || null,
        item.product_name,
        item.qty,
        item.unit_price_cents,
      );
    }
  });
}

/**
 * A FILA INTEIRA do negócio, da venda mais antiga para a mais nova.
 *
 * A ordem não é estética: é a ordem em que as vendas serão enviadas, e vender
 * é uma sequência de fatos no tempo. Se o estoque não der para todas, quem tem
 * de passar é quem vendeu primeiro.
 *
 * O filtro por `tenant_id` existe porque o mesmo aparelho pode trocar de conta.
 * Sem ele, a fila de um negócio apareceria — e subiria — na sessão de outro.
 *
 * DUAS consultas em vez de um JOIN: o JOIN repetiria a venda uma vez por item e
 * a remontagem em JS ficaria mais frágil que as duas leituras.
 */
export async function listQueue(tenantId: string): Promise<QueuedSaleRow[]> {
  const db = getDatabase();

  const sales = await db.getAllAsync<OfflineSaleRow>(
    `SELECT local_id, tenant_id, payment_method, total_cents, sold_at, status, error_message
       FROM offline_sales
      WHERE tenant_id = ?
      ORDER BY sold_at ASC`,
    tenantId,
  );

  if (sales.length === 0) return [];

  const items = await db.getAllAsync<OfflineSaleItemRow>(
    `SELECT i.local_id, i.product_id, i.product_name, i.qty, i.unit_price_cents
       FROM offline_sale_items i
       JOIN offline_sales s ON s.local_id = i.local_id
      WHERE s.tenant_id = ?
      ORDER BY i.id ASC`,
    tenantId,
  );

  const byLocalId = new Map<string, OfflineSaleItemRow[]>();
  for (const item of items) {
    const bucket = byLocalId.get(item.local_id);
    if (bucket) bucket.push(item);
    else byLocalId.set(item.local_id, [item]);
  }

  return sales.map((sale) => ({ sale, items: byLocalId.get(sale.local_id) ?? [] }));
}

/**
 * Quantas vendas esperam para subir — as pendentes E as com erro.
 *
 * As com erro contam de propósito: elas continuam sendo vendas que aconteceram
 * e não estão no sistema. Escondê-las da contagem deixaria o app dizendo "tudo
 * certo" com dinheiro real fora do caixa.
 */
export async function countQueued(tenantId: string): Promise<number> {
  const db = getDatabase();

  const row = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) AS total FROM offline_sales WHERE tenant_id = ?',
    tenantId,
  );

  return row?.total ?? 0;
}

export async function markStatus(
  localId: string,
  status: PendingSaleStatus,
  errorMessage: string | null,
): Promise<void> {
  const db = getDatabase();

  await db.runAsync(
    'UPDATE offline_sales SET status = ?, error_message = ? WHERE local_id = ?',
    status,
    errorMessage,
    localId,
  );
}

/**
 * Tira a venda da fila.
 *
 * Serve aos dois caminhos: a venda que SUBIU (já está no Supabase, manter aqui
 * seria uma segunda verdade) e a que o usuário decidiu descartar na tela de
 * pendentes. Os itens vão junto pelo `ON DELETE CASCADE` — que só funciona com
 * o `PRAGMA foreign_keys = ON` que `services/database` liga na abertura.
 */
export async function dequeue(localId: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM offline_sales WHERE local_id = ?', localId);
}
