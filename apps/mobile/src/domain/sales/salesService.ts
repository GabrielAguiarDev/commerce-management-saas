import { totalCents } from './cart';
import * as queue from './offlineQueueApi';
import {
  encodeFailure,
  toPendingSale,
  toQueuedSalePayload,
  toSaleCreateFromQueue,
} from './offlineQueueAdapter';
import * as api from './salesApi';
import { toDailySummary, toSaleCreatePayload, toSale } from './salesAdapter';
import {
  SaleError,
  type CartItem,
  type DailySummary,
  type PendingSale,
  type Sale,
  type SyncSummary,
} from './salesTypes';
import { classifySyncError, isDuplicate } from './syncErrors';
import { uuidV4 } from '@utils/uuid';

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
 * O resultado de fechar uma venda.
 *
 * A tela precisa saber POR ONDE ela foi para escolher a confirmação certa: a
 * venda que subiu diz "registrada"; a que ficou no aparelho precisa dizer isso
 * com todas as letras, ou o vendedor vai embora achando que está no sistema.
 */
export type CheckoutResult =
  | { queued: false; sale: Sale }
  | { queued: true; pending: PendingSale };

/**
 * FINALIZA A VENDA — online ou não.
 *
 * A bifurcação está aqui, e só aqui. `online` entra como argumento (não é lido
 * de um store) porque service não conhece React nem estado global: quem sabe da
 * conexão é o useCase, que passa o valor. É isso que mantém esta função
 * testável no node.
 *
 * ⚠️ OFFLINE NÃO TENTA A REDE. Poderia parecer mais esperto tentar e cair na
 * fila só se falhasse, mas não é: sem rede, o Supabase leva dezenas de segundos
 * até desistir, e nesse tempo o balcão fica parado com um botão girando. A fila
 * responde no tempo de um INSERT local.
 *
 * ⚠️ NÃO SE VALIDA ESTOQUE AQUI. O saldo que o app conhece offline é o do
 * último momento em que houve internet, e barrar uma venda por um número velho
 * é impedir dinheiro de entrar por causa de um palpite. Quem decide de verdade
 * é o gatilho do banco, na sincronização — e se recusar, a venda volta para a
 * fila com o motivo à vista.
 */
export async function checkoutSale(
  tenantId: string,
  items: readonly CartItem[],
  paymentMethod: string,
  online: boolean,
): Promise<CheckoutResult> {
  if (items.length === 0) throw new SaleError('empty_cart');
  if (!paymentMethod.trim()) throw new SaleError('no_payment_method');

  if (!online) {
    const payload = toQueuedSalePayload(
      uuidV4(),
      new Date().toISOString(),
      tenantId,
      items,
      paymentMethod,
    );

    try {
      await queue.enqueue(payload);
    } catch (e) {
      // Falhar aqui é o pior caso da feature inteira: sem rede E sem conseguir
      // gravar no aparelho, a venda não existe em lugar nenhum. Vira erro de
      // verdade, com a tela mantendo o carrinho montado, em vez de uma
      // confirmação que mentiria.
      return normalize(e);
    }

    return {
      queued: true,
      pending: toPendingSale({
        sale: {
          local_id: payload.id,
          tenant_id: payload.tenant_id,
          payment_method: payload.payment_method,
          total_cents: payload.total_cents,
          sold_at: payload.sold_at,
          status: 'pending',
          error_message: null,
        },
        items: payload.items.map((i) => ({
          local_id: payload.id,
          product_id: i.product_id || null,
          product_name: i.product_name,
          qty: i.qty,
          unit_price_cents: i.unit_price_cents,
        })),
      }),
    };
  }

  try {
    const raw = await api.recordSale(toSaleCreatePayload(tenantId, items, paymentMethod));
    return { queued: false, sale: toSale(raw) };
  } catch (e) {
    return normalize(e);
  }
}

/** As vendas que este aparelho tem guardadas e ainda não estão no sistema. */
export async function listPendingSales(tenantId: string): Promise<PendingSale[]> {
  const rows = await queue.listQueue(tenantId);
  const now = new Date();
  return rows.map((row) => toPendingSale(row, now));
}

export async function countPendingSales(tenantId: string): Promise<number> {
  return queue.countQueued(tenantId);
}

/** Descarta uma venda da fila. Usado pela tela de pendentes. */
export async function discardPendingSale(localId: string): Promise<void> {
  await queue.dequeue(localId);
}

/**
 * SINCRONIZA A FILA — uma venda de cada vez.
 *
 * UMA A UMA, e não em lote, por três razões que valem o custo em requisições:
 * cada venda tem um destino próprio (uma pode ser recusada por estoque sem
 * afetar as outras); o erro que volta pertence a UMA venda, e é o que a tela
 * mostra; e a fila fica sempre num estado consistente, mesmo se o app for
 * fechado no meio — o que já subiu já saiu da fila.
 *
 * A venda que dá certo SAI da fila. A que falha FICA, marcada com o motivo, e
 * é reenviada na próxima vez. Nada é apagado por ter dado errado — descartar é
 * decisão do usuário, na tela de pendentes.
 */
export async function syncPendingSales(tenantId: string): Promise<SyncSummary> {
  const rows = await queue.listQueue(tenantId);

  let synced = 0;
  let failed = 0;

  for (const row of rows) {
    const payload = toSaleCreateFromQueue(row);

    try {
      await api.recordSale(payload);
      await queue.dequeue(payload.id);
      synced += 1;
    } catch (error) {
      if (isDuplicate(error)) {
        // Esta venda já está no sistema: a tentativa anterior chegou e só a
        // resposta se perdeu. Resta descobrir se ela chegou INTEIRA — ver
        // `saleHasItems`.
        try {
          if (!(await api.saleHasItems(payload.id))) {
            await api.completeSaleItems(payload);
          }
          await queue.dequeue(payload.id);
          synced += 1;
          continue;
        } catch (repairError) {
          await queue.markStatus(
            payload.id,
            'error',
            encodeFailure(classifySyncError(repairError)),
          );
          failed += 1;
          continue;
        }
      }

      await queue.markStatus(payload.id, 'error', encodeFailure(classifySyncError(error)));
      failed += 1;
    }
  }

  return { synced, failed };
}

export { totalCents };
