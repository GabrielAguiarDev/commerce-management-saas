import { stockMovementFromDb } from '@domain/shared/dbEnums';
import { supabase } from '@services/supabase';
import { daysAgoISO, relativeLabel } from '@utils/dates';

import type { StockMovementAPI, StockMovementCreateAPI } from './stockApiTypes';

/**
 * FRONTEIRA DE REDE das movimentações de estoque.
 *
 * ⚠️ ÚNICO ARQUIVO DESTE DOMÍNIO QUE FALA COM O SUPABASE.
 */

/** 90 dias. A tela de Estoque é operacional, não é o livro do contador. */
const HISTORY_DAYS = 90;

export async function listStockMovements(tenantId: string): Promise<StockMovementAPI[]> {
  void tenantId; // O RLS já isola pelo tenant do usuário logado.

  const { data, error } = await supabase
    .from('stock_movements')
    .select(
      'id, tenant_id, product_id, type, quantity, reason, created_at, products(name), profiles(full_name)',
    )
    .gte('created_at', daysAgoISO(HISTORY_DAYS))
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((m) => {
    const product = (Array.isArray(m.products) ? m.products[0] : m.products) as {
      name?: string;
    } | null;
    const actor = (Array.isArray(m.profiles) ? m.profiles[0] : m.profiles) as {
      full_name?: string;
    } | null;

    return {
      id: m.id,
      tenant_id: m.tenant_id,
      product_id: m.product_id,
      // Produto apagado não pode sumir do histórico: o saldo mudou por causa
      // dele, e uma linha sem nome é pior do que uma linha explícita.
      product_name: product?.name ?? 'Produto removido',
      // O banco já guarda a quantidade ASSINADA (a função `apply_stock_movement`
      // soma o que recebe), então o `delta` do app é a coluna direta.
      delta: Number(m.quantity ?? 0),
      reason: toReason(stockMovementFromDb(m.type), m.reason),
      actor_name: actor?.full_name ?? null,
      happened_label: relativeLabel(m.created_at),
    };
  });
}

/**
 * O `reason` do contrato do app é a ORIGEM ('sale' | 'purchase' | 'loss' |
 * 'manual'), que o adapter transforma em frase. No banco há duas colunas
 * diferentes: `type` (o enum) e `reason` (texto livre digitado pela pessoa).
 *
 * A tradução: baixa por venda é `sale`; entrada é `purchase` (é ela que vira
 * custo variável); saída é `loss`; ajuste é `manual`. O texto livre é
 * descartado aqui porque o modelo de domínio não tem onde guardá-lo — está
 * anotado como perda conhecida em DEVELOPMENT.md.
 */
function toReason(type: string, _freeText: string | null): string {
  switch (type) {
    case 'sale':
      return 'sale';
    case 'in':
      return 'purchase';
    case 'out':
      return 'loss';
    default:
      return 'manual';
  }
}

/**
 * REGISTRA UMA MOVIMENTAÇÃO — movimento + saldo, numa operação só.
 *
 * ⚠️ A ARMADILHA DESTA FUNÇÃO, e o motivo deste comentário ser longo:
 * `apply_stock_movement` IGNORA o `p_type`. Ela simplesmente SOMA o
 * `p_quantity` que recebe — verificado no banco: saldo 10, tipo `out`,
 * quantidade 3, resultado 13. Quem carrega o significado é o SINAL, e quem
 * decide o sinal é quem chama.
 *
 * Por isso o `delta` já chega assinado do `stockAdapter` (que lê "+10" e "−3"
 * do campo) e é passado COMO ESTÁ. O `p_type` vai junto só para o histórico
 * ler depois. Mandar `Math.abs(delta)` com `p_type: 'out'` esperando que a
 * função subtraia é o erro que este parágrafo existe para evitar — e ele
 * aumentaria o estoque em vez de baixá-lo.
 *
 * A função também NÃO atualiza `products.cost` nem lança a despesa em `costs`.
 * O portal faz as duas coisas à mão em `app/estoque/actions.ts`; o app ainda
 * não, porque o sheet de movimentação não pede custo unitário. Anotado como
 * pendência.
 */
export async function createStockMovement(
  payload: StockMovementCreateAPI,
): Promise<StockMovementAPI> {
  if (!payload.product_id) {
    // `apply_stock_movement` exige o produto: sem ele não há saldo para ajustar.
    throw new Error('Movimentação de estoque exige um produto do catálogo.');
  }

  const dbType = payload.delta > 0 ? 'in' : 'out';

  const { error } = await supabase.rpc('apply_stock_movement', {
    p_product_id: payload.product_id,
    p_type: dbType,
    // ASSINADO. Ver o parágrafo acima antes de "corrigir" para um valor absoluto.
    p_quantity: payload.delta,
    p_reason: payload.reason.trim() || null,
    p_sale_id: null,
    p_unit_cost: null,
  });

  if (error) throw error;

  return {
    id: `mov_${Date.now().toString(36)}`,
    tenant_id: payload.tenant_id,
    product_id: payload.product_id,
    product_name: payload.product_name,
    delta: payload.delta,
    reason: payload.delta > 0 ? 'purchase' : 'manual',
    actor_name: null,
    happened_label: 'agora',
  };
}
