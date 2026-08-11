import { SALE_STATUS } from '@domain/shared/dbEnums';
import { supabase } from '@services/supabase';
import { startOfTodayISO, todayDateOnly } from '@utils/dates';
import { centsToReal, realToCents } from '@utils/money';

import type { DailySummaryAPI, SaleAPI, SaleCreateAPI } from './salesApiTypes';

/**
 * FRONTEIRA DE REDE das vendas.
 *
 * ⚠️ ÚNICO ARQUIVO DESTE DOMÍNIO QUE FALA COM O SUPABASE.
 *
 * DUAS CONVERSÕES ACONTECEM AQUI E EM NENHUM OUTRO LUGAR:
 *
 *  1. **Dinheiro.** O banco guarda `numeric` em REAIS (`total`, `unit_price`);
 *     o app inteiro trabalha com INTEIRO EM CENTAVOS. A conversão é feita na
 *     fronteira, nos dois sentidos (`realToCents` na leitura, `centsToReal` na
 *     escrita), para que nenhuma camada acima precise saber que existem duas
 *     unidades. Somar reais em float num carrinho de 30 itens faz o total da
 *     tela divergir do recibo — é por isso que a conversão para cents é a
 *     primeira coisa que acontece com um valor que chega.
 *
 *  2. **Nome das colunas.** `sold_at` → `created_at`, `total` → `total_cents`.
 *     O `*ApiTypes` deste app é o contrato que o ADAPTER consome, e mantê-lo
 *     estável foi o que permitiu trocar o mock pelo Supabase sem tocar em
 *     adapter, service, useCases nem tela.
 */

/** As colunas de uma venda com os itens, numa string literal só (ver abaixo). */
const SALE_COLUMNS =
  'id, tenant_id, total, payment_method, status, sold_at, sale_items(product_id, product_name, quantity, unit_price)';

interface SaleRow {
  id: string;
  tenant_id: string;
  total: number | null;
  payment_method: string | null;
  status: string | null;
  sold_at: string;
  sale_items:
    | {
        product_id: string | null;
        product_name: string;
        quantity: number | null;
        unit_price: number | null;
      }[]
    | null;
}

function toSaleAPI(row: SaleRow): SaleAPI {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    created_at: row.sold_at,
    total_cents: realToCents(row.total),
    payment_method: row.payment_method ?? 'cash',
    items: (row.sale_items ?? []).map((i) => ({
      product_id: i.product_id ?? '',
      product_name: i.product_name,
      qty: Number(i.quantity ?? 0),
      unit_price_cents: realToCents(i.unit_price),
    })),
    // Não há venda pendente de sincronia: este app ainda é 100% online. Quando
    // a fase offline entrar, é este campo que passa a significar algo.
    is_synced: true,
  };
}

/**
 * As últimas vendas de HOJE.
 *
 * Estornadas ficam de fora: a lista fica logo abaixo do "vendeu hoje", e uma
 * venda que não entra naquele total não pode aparecer como se tivesse entrado.
 * O histórico completo, com as estornadas riscadas, é tela do portal.
 */
export async function listDailySales(tenantId: string, limite = 3): Promise<SaleAPI[]> {
  void tenantId; // O RLS já isola pelo tenant do usuário logado.

  const { data, error } = await supabase
    .from('sales')
    .select(SALE_COLUMNS)
    .gte('sold_at', startOfTodayISO())
    .eq('status', SALE_STATUS.completed)
    .order('sold_at', { ascending: false })
    .limit(limite);

  if (error) throw error;
  return ((data ?? []) as SaleRow[]).map(toSaleAPI);
}

/**
 * O RESUMO DO DIA — o card principal do Início.
 *
 * Duas leituras, e a divisão entre elas é deliberada:
 *
 *  - `v_daily_sales` dá o faturamento e a contagem de vendas. É a MESMA view
 *    que o portal usa, então o "vendeu hoje" do app e o do navegador não podem
 *    divergir. Refazer essa soma aqui seria criar uma segunda verdade.
 *
 *  - `sale_items` de hoje, com o custo do produto embutido, dá o que a view não
 *    tem: quantos itens saíram, o lucro e o mais vendido. O lucro é
 *    faturamento − custo da mercadoria vendida, com o custo ATUAL do produto —
 *    uma aproximação, e é honesto dizer por quê: o banco não guarda o custo
 *    praticado no momento da venda (só o preço, em `unit_price`). Se o custo do
 *    fornecedor mudou ontem, o lucro de hoje sai calculado com o novo.
 *
 * `v_product_sales` NÃO serve para o mais vendido do dia: ela não tem coluna de
 * data, é um acumulado de todo o período.
 */
export async function fetchDailySummary(tenantId: string): Promise<DailySummaryAPI | null> {
  void tenantId;

  const today = todayDateOnly();

  const [dailyResult, itemsResult] = await Promise.all([
    supabase.from('v_daily_sales').select('day, revenue, sales_count').eq('day', today).maybeSingle(),
    supabase
      .from('sale_items')
      // `!inner` para que o filtro de data e status na venda REMOVA o item, e
      // não apenas devolva o item com a venda nula. Sem `inner`, itens de
      // vendas estornadas entrariam na contagem com `sales: null`.
      .select('product_name, quantity, unit_price, sales!inner(sold_at, status), products(cost)')
      .gte('sales.sold_at', startOfTodayISO())
      .eq('sales.status', SALE_STATUS.completed),
  ]);

  if (dailyResult.error) throw dailyResult.error;
  if (itemsResult.error) throw itemsResult.error;

  const daily = dailyResult.data;
  const items = itemsResult.data ?? [];

  // Nenhuma venda e nenhum item: dia ainda em branco. `null` faz o adapter
  // devolver o resumo zerado, que é o que a tela sabe mostrar.
  if (!daily && items.length === 0) return null;

  let itemCount = 0;
  let costCents = 0;
  const byProduct = new Map<string, number>();

  for (const item of items) {
    const qty = Number(item.quantity ?? 0);
    itemCount += qty;

    const product = (Array.isArray(item.products) ? item.products[0] : item.products) as {
      cost?: number | null;
    } | null;
    costCents += realToCents(product?.cost) * qty;

    byProduct.set(item.product_name, (byProduct.get(item.product_name) ?? 0) + qty);
  }

  let topName: string | null = null;
  let topQty = 0;
  for (const [name, qty] of byProduct) {
    if (qty > topQty) {
      topName = name;
      topQty = qty;
    }
  }

  const grossCents = realToCents(daily?.revenue);

  return {
    date: today,
    gross_cents: grossCents,
    profit_cents: grossCents - costCents,
    sale_count: daily?.sales_count == null ? 0 : Number(daily.sales_count),
    item_count: itemCount,
    top_product_name: topName,
    top_product_qty: topName ? topQty : null,
  };
}

/**
 * REGISTRAR UMA VENDA.
 *
 * ⚠️ A BAIXA DE ESTOQUE NÃO É FEITA AQUI, e isso é intencional. Existe um
 * TRIGGER em `sale_items` que já desconta `products.stock_quantity` e grava o
 * `stock_movements` do tipo `sale` — verificado no banco: inserir um item de 3
 * unidades leva o saldo de 100 para 97 sozinho. Descontar de novo pela
 * aplicação tiraria O DOBRO de cada venda. A primeira versão da integração do
 * portal fez exatamente isso.
 *
 * ⚠️ NÃO É ATÔMICO. São duas escritas em sequência (`sales`, depois
 * `sale_items`) e o PostgREST não tem transação entre chamadas: se a segunda
 * falhar, fica uma venda sem itens. O certo é uma função `create_sale` no
 * banco, que está na lista do que falta criar. Enquanto não existe, o
 * tratamento abaixo apaga a venda órfã — melhor um registro que não existe do
 * que um que mente sobre o que foi vendido.
 *
 * ESTA É A ÚNICA PORTA DE ENTRADA DE VENDA, e é de propósito: a venda offline
 * que sobe da fila passa exatamente por aqui, com o mesmo INSERT e os mesmos
 * gatilhos. Ela não tem caminho privilegiado — só chega atrasada. Um segundo
 * caminho de escrita seria a maneira mais rápida de a baixa de estoque valer
 * para a venda do balcão e não para a que ficou na fila.
 */
async function insertSaleItems(saleId: string, payload: SaleCreateAPI): Promise<unknown | null> {
  const { error } = await supabase.from('sale_items').insert(
    payload.items.map((i) => ({
      tenant_id: payload.tenant_id,
      sale_id: saleId,
      // String vazia viraria uma FK inválida; o produto avulso grava `null` e
      // sobrevive só pelo `product_name`.
      product_id: i.product_id || null,
      product_name: i.product_name,
      quantity: i.qty,
      unit_price: centsToReal(i.unit_price_cents),
      subtotal: centsToReal(i.unit_price_cents * i.qty),
    })),
  );

  return error;
}

/**
 * ESTA VENDA JÁ TEM ITENS LÁ DENTRO?
 *
 * Pergunta que só a fila offline faz, e só quando o INSERT da venda volta com
 * "chave duplicada". Aí existem dois passados possíveis, e eles pedem coisas
 * opostas:
 *
 *  - a venda subiu INTEIRA numa tentativa anterior (a resposta é que se
 *    perdeu) → não há nada a fazer, e reenviar os itens duplicaria a baixa de
 *    estoque;
 *  - a venda subiu PELA METADE (o `sales` entrou, o `sale_items` não, e o app
 *    morreu antes de apagar a órfã) → falta inserir os itens. Sem isso ficaria
 *    para sempre uma venda de valor cheio, sem item nenhum e sem ter tirado
 *    nada do estoque.
 *
 * A resposta separa os dois casos, e é por isso que a duplicata não pode ser
 * tratada como "pronto, subiu" sem olhar.
 */
export async function saleHasItems(saleId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('sale_items')
    .select('sale_id')
    .eq('sale_id', saleId)
    .limit(1);

  if (error) throw error;
  return (data ?? []).length > 0;
}

/**
 * Completa uma venda que ficou sem itens (o segundo caso acima).
 *
 * Não apaga a venda em caso de falha, ao contrário do `recordSale`: aqui a
 * venda JÁ ESTÁ no sistema há um tempo e pode ter sido vista, contada ou
 * conferida por alguém. Apagá-la por conta própria seria pior que deixá-la
 * incompleta e devolver o erro para a fila — que é o que fazemos, mantendo a
 * venda na fila para nova tentativa.
 */
export async function completeSaleItems(payload: SaleCreateAPI & { id: string }): Promise<void> {
  const error = await insertSaleItems(payload.id, payload);
  if (error) throw error;
}

export async function recordSale(payload: SaleCreateAPI): Promise<SaleAPI> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sale, error } = await supabase
    .from('sales')
    .insert({
      // O `id` só vai junto quando quem chama o gerou (a fila offline). No
      // caminho comum a chave fica em branco e o banco a produz, como sempre.
      ...(payload.id ? { id: payload.id } : {}),
      tenant_id: payload.tenant_id,
      user_id: user?.id ?? null,
      total: centsToReal(payload.total_cents),
      payment_method: payload.payment_method,
      status: SALE_STATUS.completed,
      // A venda da fila carrega a hora em que foi FEITA. Carimbar `now()` aqui
      // jogaria um dia inteiro de vendas offline para o minuto em que o
      // vendedor apertou "sincronizar".
      sold_at: payload.sold_at ?? new Date().toISOString(),
    })
    .select('id, sold_at')
    .single();

  if (error) throw error;

  const itemsError = await insertSaleItems(sale.id, payload);

  if (itemsError) {
    await supabase.from('sales').delete().eq('id', sale.id);
    throw itemsError;
  }

  return {
    id: sale.id,
    tenant_id: payload.tenant_id,
    created_at: sale.sold_at,
    total_cents: payload.total_cents,
    payment_method: payload.payment_method,
    items: payload.items,
    is_synced: true,
  };
}
