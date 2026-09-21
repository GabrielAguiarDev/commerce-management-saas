import { logActivity } from '@domain/shared/activityLog';
import { COST_ORIGIN, COST_TYPES, stockMovementFromDb } from '@domain/shared/dbEnums';
import { supabase } from '@services/supabase';
import { daysAgoISO, relativeLabel, todayDateOnly } from '@utils/dates';
import { centsToReal } from '@utils/money';

import type { StockMovementAPI, StockMovementCreateAPI } from './stockApiTypes';
import { currentMessages } from '@i18n/active';

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
      product_name: product?.name ?? currentMessages().stock.removedProduct,
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
 * ┌─ A COMPRA VIRA DESPESA AQUI, À MÃO ────────────────────────────────────┐
 * │ `apply_stock_movement` grava o movimento e ajusta o saldo — e SÓ. Ela   │
 * │ não mexe em `products.cost` nem lança nada em `costs`, e não deveria    │
 * │ mesmo: nem toda entrada é compra (devolução de estorno também entra     │
 * │ por ela, e aquilo não é dinheiro saindo).                               │
 * │                                                                        │
 * │ Quem sabe que ISTO é uma compra é esta função, porque só ela recebeu o  │
 * │ custo unitário. As duas escritas abaixo são as mesmas que o portal faz  │
 * │ em `app/estoque/actions.ts` — e são o motivo de o sheet ter passado a   │
 * │ pedir o custo: até 29/08/2026 o app registrava a entrada e NÃO lançava  │
 * │ a despesa, enquanto o portal lançava. O mesmo negócio tinha dois lucros │
 * │ diferentes conforme onde a mercadoria fosse dada entrada.               │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * ⚠️ ELAS NÃO DERRUBAM A MOVIMENTAÇÃO. O saldo já está ajustado quando estas
 * linhas rodam; estourar aqui faria a tela dizer que a entrada falhou sobre um
 * estoque que já subiu, e o dono lançaria tudo de novo.
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
    // O custo vai junto para o HISTÓRICO do movimento. Quem lança a despesa é
    // o `registerPurchase` abaixo — a função do banco não faz isso.
    p_unit_cost: payload.unit_cost_cents === null ? null : centsToReal(payload.unit_cost_cents),
  });

  if (error) throw error;

  if (payload.delta > 0 && (payload.unit_cost_cents ?? 0) > 0) {
    await registerPurchase(payload);
  }

  logActivity('stock.moved', {
    entityId: payload.product_id,
    summary: `${payload.product_name}: ${payload.delta > 0 ? '+' : ''}${payload.delta}`,
    metadata: { type: dbType, delta: payload.delta, origin: 'app' },
  });

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

/**
 * O lado FINANCEIRO de uma entrada de mercadoria.
 *
 * Duas escritas, na ordem que importa se a segunda falhar:
 *
 *  1. `products.cost` passa a ser o último custo pago. É o número que a margem
 *     dos relatórios usa daqui para a frente.
 *  2. A compra entra em `costs` como custo VARIÁVEL, com `origin: 'stock'`.
 *
 * O `origin` não é enfeite: é ele que impede o custo de ser excluído solto na
 * tela de Custos. Apagá-lo sozinho deixaria a compra sem despesa e o lucro
 * inflado — quem corrige é a reversão da movimentação.
 *
 * NADA AQUI LANÇA EXCEÇÃO. Ver o cabeçalho de `createStockMovement`: o estoque
 * já subiu, e falhar agora faria a tela mentir sobre o que aconteceu. O preço
 * é uma compra sem despesa registrada; o preço da alternativa é o dono dar
 * entrada duas vezes na mesma mercadoria.
 */
async function registerPurchase(payload: StockMovementCreateAPI): Promise<void> {
  const unitCost = centsToReal(payload.unit_cost_cents ?? 0);

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (payload.product_id) {
      await supabase.from('products').update({ cost: unitCost }).eq('id', payload.product_id);
    }

    await supabase.from('costs').insert({
      tenant_id: payload.tenant_id,
      user_id: user?.id ?? null,
      description: `Compra — ${payload.product_name}`,
      type: COST_TYPES.variable,
      category: 'Materiais',
      // Arredondado em CENTAVOS antes de virar reais: `10 * 3.33` em ponto
      // flutuante dá 9.99999..., e `costs.amount` é numeric sem escala — o
      // valor entraria no banco com a sujeira inteira.
      amount: centsToReal(Math.round((payload.unit_cost_cents ?? 0) * payload.delta)),
      is_recurring: false,
      origin: COST_ORIGIN.stock,
      cost_date: todayDateOnly(),
    });
  } catch {
    // Silêncio proposital — ver o cabeçalho.
  }
}
