import { SALE_STATUS } from '@domain/shared/dbEnums';
import { supabase } from '@services/supabase';
import { logActivity } from '@domain/shared/activityLog';
import { startOfTodayISO, todayDateOnly } from '@utils/dates';
import { centsToReal, realToCents } from '@utils/money';

import type { DailySummaryAPI, SaleAPI, SaleCreateAPI, SalesTotalsAPI } from './salesApiTypes';
import type { SalesRange } from './salesHistory';

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
    status: row.status,
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
export async function listDailySales(tenantId: string, limite = 10): Promise<SaleAPI[]> {
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
 * O HISTÓRICO — uma página de vendas de qualquer dia.
 *
 * Três diferenças em relação à consulta de cima, e as três são o que separa
 * "o que vendi hoje" de "o que já vendi":
 *
 *  1. sem recorte de data — a rolagem é que limita, não o calendário;
 *  2. **com as estornadas**. Elas aparecem riscadas e fora dos totais. Uma
 *     venda que sumiu da lista depois de estornada é a maneira mais rápida de
 *     alguém achar que o estorno apagou a venda — e o histórico existe
 *     justamente para provar o contrário ao contador;
 *  3. `range` em vez de `limit`: a tela pede a página seguinte, não uma lista
 *     maior. Pedir 60 para mostrar 30 é o padrão que faz a segunda página
 *     custar o dobro da primeira.
 *
 * Pede-se UM ITEM A MAIS que o tamanho da página, e o service usa esse extra
 * só para responder "tem mais?" — sem uma segunda consulta de contagem.
 */
export async function listSales(
  tenantId: string,
  offset: number,
  limite: number,
  range: SalesRange = { from: null, to: null },
): Promise<SaleAPI[]> {
  void tenantId;

  let query = supabase.from('sales').select(SALE_COLUMNS);

  // `lt` e não `lte` no fim: o `to` que chega já é a meia-noite do dia
  // SEGUINTE. Ver `SalesRange`.
  if (range.from) query = query.gte('sold_at', range.from);
  if (range.to) query = query.lt('sold_at', range.to);

  const { data, error } = await query
    .order('sold_at', { ascending: false })
    .range(offset, offset + limite - 1);

  if (error) throw error;
  return ((data ?? []) as SaleRow[]).map(toSaleAPI);
}

/**
 * O TOTAL DO RECORTE — quantas vendas e quanto deu, no período inteiro.
 *
 * Existe porque o cabeçalho não pode somar o que está na TELA: com 30 vendas
 * carregadas de um mês que tem 300, um total calculado no cliente mostraria um
 * terço do faturamento com toda a confiança do mundo. A conta é do banco, sobre
 * o período inteiro, e não sobre a página.
 *
 * Traz `total` e `status` das vendas do período — duas colunas, sem os itens —
 * e soma aqui. As estornadas entram na CONTAGEM delas e ficam fora do dinheiro,
 * que é a mesma regra do cabeçalho de cada dia (`groupSalesByDay`); ter as duas
 * contas no mesmo lugar é o que impede a soma do topo de discordar da soma dos
 * dias logo abaixo.
 *
 * ⚠️ ISTO NÃO ESCALA PARA SEMPRE. "Todas" num negócio com anos de operação
 * baixa uma linha por venda só para somar. Para o porte deste app é barato
 * (duas colunas numéricas), e a alternativa honesta — uma função de agregação
 * no banco — é migração, não código de tela. Está anotado em DEVELOPMENT.md.
 */
export async function fetchSalesTotals(
  tenantId: string,
  range: SalesRange = { from: null, to: null },
): Promise<SalesTotalsAPI> {
  void tenantId;

  let query = supabase.from('sales').select('total, status');

  if (range.from) query = query.gte('sold_at', range.from);
  if (range.to) query = query.lt('sold_at', range.to);

  const { data, error } = await query;
  if (error) throw error;

  let totalCents = 0;
  let saleCount = 0;
  let refundedCount = 0;

  for (const row of (data ?? []) as { total: number | null; status: string | null }[]) {
    if (row.status === SALE_STATUS.refunded) {
      refundedCount += 1;
      continue;
    }
    totalCents += realToCents(row.total);
    saleCount += 1;
  }

  return { sale_count: saleCount, total_cents: totalCents, refunded_count: refundedCount };
}

/** UMA venda, com os itens — a tela de detalhe. `null` = não existe mais. */
export async function fetchSale(saleId: string): Promise<SaleAPI | null> {
  const { data, error } = await supabase
    .from('sales')
    .select(SALE_COLUMNS)
    .eq('id', saleId)
    .maybeSingle();

  if (error) throw error;
  return data ? toSaleAPI(data as SaleRow) : null;
}

/** Marca a venda como estornada (ou de volta como completa). */
export async function setSaleStatus(saleId: string, status: string): Promise<void> {
  const { error } = await supabase.from('sales').update({ status }).eq('id', saleId);
  if (error) throw error;

  logActivity(status === SALE_STATUS.refunded ? 'sale.refunded' : 'sale.refund_undone', {
    entityId: saleId,
  });
}

/**
 * DEVOLVE (ou tira de novo) o estoque dos itens de uma venda.
 *
 * ⚠️ ISTO É FEITO À MÃO, e não por gatilho. O trigger de `sale_items` só reage
 * à INSERÇÃO do item — mudar `sales.status` não move saldo nenhum (verificado
 * no banco, e é o mesmo motivo pelo qual o portal faz esta volta à mão em
 * `app/vendas/actions.ts`). Sem esta função, estornar tiraria a venda do
 * faturamento e deixaria a mercadoria fora da prateleira para sempre.
 *
 * `sign = 1` devolve à prateleira (estorno); `-1` baixa de novo (estorno
 * desfeito). O SINAL é o que conta: `apply_stock_movement` ignora o `p_type` e
 * soma o `p_quantity` como veio — ver o aviso em `shared/dbEnums`.
 *
 * Devolve quantos itens NÃO conseguiram voltar. O chamador não desfaz o
 * estorno por causa disso — a venda já saiu do faturamento e desfazer traria
 * de volta um número que o dono acabou de mandar tirar. Ele AVISA, e o ajuste
 * de estoque fica a um toque de distância, na tela de Estoque. Silêncio aqui
 * seria a única saída pior que as duas.
 */
export async function moveSaleStock(saleId: string, sign: 1 | -1): Promise<number> {
  const { data, error } = await supabase
    .from('sale_items')
    .select('product_id, quantity, products(tracks_stock)')
    .eq('sale_id', saleId);

  if (error) throw error;

  let failures = 0;

  for (const item of data ?? []) {
    const product = (Array.isArray(item.products) ? item.products[0] : item.products) as {
      tracks_stock?: boolean | null;
    } | null;

    // Produto avulso (sem `product_id`) ou que não controla estoque não tem
    // saldo para mexer — não é falha, é um item que nunca esteve na prateleira.
    if (!item.product_id || !product?.tracks_stock) continue;

    const { error: movementError } = await supabase.rpc('apply_stock_movement', {
      p_product_id: item.product_id,
      p_type: 'adjustment',
      // ASSINADO. Ver `moveSaleStock` acima e `stockApi.createStockMovement`.
      p_quantity: sign * Number(item.quantity ?? 0),
      p_reason: sign > 0 ? 'Devolução por estorno' : 'Baixa por estorno desfeito',
      p_sale_id: saleId,
      p_unit_cost: null,
    });

    if (movementError) failures += 1;
  }

  return failures;
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
 * Insere os itens de uma venda que JÁ existe.
 *
 * Sobrou de quando registrar uma venda eram duas escritas: hoje quem grava
 * venda e itens juntos é a `create_sale`, numa transação só. O único chamador
 * é `completeSaleItems`, o conserto de vendas meio-gravadas — ver lá.
 *
 * ⚠️ A BAIXA DE ESTOQUE NÃO É FEITA AQUI, e isso é intencional. Existe um
 * TRIGGER em `sale_items` que já desconta `products.stock_quantity` e grava o
 * `stock_movements` do tipo `sale` — verificado no banco: inserir um item de 3
 * unidades leva o saldo de 100 para 97 sozinho. Descontar de novo pela
 * aplicação tiraria O DOBRO de cada venda. A primeira versão da integração do
 * portal fez exatamente isso.
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
      // Arredondado em CENTAVOS, exatamente como a `create_sale` faz: uma
      // venda por peso (0,5 kg) produz meio centavo, e `sale_items.subtotal` é
      // numeric sem escala — guardaria a sujeira inteira, e a soma dos itens
      // deixaria de fechar com o total da venda.
      subtotal: centsToReal(Math.round(i.unit_price_cents * i.qty)),
    })),
  );

  return error;
}

/**
 * ESTA VENDA JÁ TEM ITENS LÁ DENTRO?
 *
 * Pergunta que só a fila offline faz, e só quando a venda volta com "chave
 * duplicada". Aí existem dois passados possíveis, e eles pedem coisas opostas:
 *
 *  - a venda subiu INTEIRA numa tentativa anterior (a resposta é que se
 *    perdeu) → não há nada a fazer, e reenviar os itens duplicaria a baixa de
 *    estoque;
 *  - a venda subiu PELA METADE (o `sales` entrou, o `sale_items` não) → falta
 *    inserir os itens. Sem isso ficaria para sempre uma venda de valor cheio,
 *    sem item nenhum e sem ter tirado nada do estoque.
 *
 * ⚠️ O SEGUNDO CASO NÃO ACONTECE MAIS EM VENDA NOVA. A `create_sale` grava as
 * duas coisas na mesma transação desde 29/08/2026 — ou entram as duas, ou
 * nenhuma. Esta checagem FICA porque o banco ainda tem as vendas meio-gravadas
 * de antes, e porque um aparelho com a versão antiga do app pode estar com uma
 * fila para subir. É código de convivência, não código morto: quando não
 * houver mais nenhuma dessas linhas, ele responde `true` sempre e sai de cena
 * sozinho.
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

/**
 * REGISTRAR UMA VENDA.
 *
 * ┌─ UMA TRANSAÇÃO SÓ, desde 29/08/2026 ───────────────────────────────────┐
 * │ Eram duas escritas em sequência (`sales`, depois `sale_items`), e o     │
 * │ PostgREST não tem transação entre chamadas: a segunda falhando deixava  │
 * │ uma venda SEM ITENS. O código apagava a órfã, mas isso era remendo —    │
 * │ e não cobria o app morrer no meio.                                      │
 * │                                                                        │
 * │ `create_sale` faz as duas dentro da mesma transação: ou entram as duas, │
 * │ ou nenhuma. O trigger de estoque roda lá dentro, o que é uma melhoria   │
 * │ de graça — venda desfeita desfaz a baixa junto.                         │
 * │                                                                        │
 * │ O APP SÓ PÔDE MIGRAR depois de a função aceitar `p_id`                  │
 * │ (`20260829000000_create_sale_client_id.sql`). Sem esse parâmetro, o     │
 * │ uuid da fila offline era ignorado e CADA REENVIO viraria uma venda      │
 * │ nova — trocar uma venda órfã rara por faturamento duplicado é pior.     │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * O TOTAL NÃO É MAIS ENVIADO. Quem soma é a função, a partir dos itens, com
 * cada subtotal arredondado em centavos. Não é preciosismo: o valor que o
 * cliente afirma não prova nada, e a NFC-e sai desse número.
 *
 * ESTA É A ÚNICA PORTA DE ENTRADA DE VENDA, e é de propósito: a venda offline
 * que sobe da fila passa exatamente por aqui, pela mesma `create_sale` e pelos
 * mesmos gatilhos. Ela não tem caminho privilegiado — só chega atrasada. Um segundo
 * caminho de escrita seria a maneira mais rápida de a baixa de estoque valer
 * para a venda do balcão e não para a que ficou na fila.
 */
export async function recordSale(payload: SaleCreateAPI): Promise<SaleAPI> {
  // A hora é resolvida AQUI, e não deixada para o `now()` do banco, por dois
  // motivos: a venda da fila carrega a hora em que foi FEITA (carimbar a hora
  // da sincronização jogaria um dia inteiro de vendas offline para o minuto em
  // que o vendedor apertou o botão), e é este mesmo valor que volta no
  // `created_at` — sem ele, teríamos de reler a venda só para saber a hora.
  const soldAt = payload.sold_at ?? new Date().toISOString();

  const { data: saleId, error } = await supabase.rpc('create_sale', {
    p_payment_method: payload.payment_method,
    p_items: payload.items.map((i) => ({
      // String vazia vira NULL lá dentro: o produto avulso, que não está no
      // cadastro, sobrevive só pelo `product_name`.
      product_id: i.product_id || '',
      product_name: i.product_name,
      quantity: i.qty,
      unit_price: centsToReal(i.unit_price_cents),
    })),
    p_sold_at: soldAt,
    // `undefined` faria a chave sumir do JSON e a função cair no default —
    // mesmo efeito, mas `null` diz explicitamente "sem id do aparelho".
    p_id: payload.id ?? null,
  });

  // ⚠️ O ERRO SOBE INTEIRO, e não como `new Error(mensagem)`. A fila offline
  // decide o que fazer pelo CÓDIGO do Postgres que vem nele — `23505` é "esta
  // venda já entrou", `23503` é "o produto sumiu" (ver `syncErrors`). Trocá-lo
  // por um Error genérico faria toda venda travada virar "algo deu errado".
  if (error) throw error;
  if (!saleId) throw new Error('create_sale não devolveu o id da venda.');

  const id = saleId as string;

  logActivity('sale.created', {
    entityId: id,
    summary: `${payload.items.length} ${payload.items.length === 1 ? 'item' : 'itens'} · ${moeda(payload.total_cents)}`,
    metadata: { payment: payload.payment_method, origin: 'app' },
  });

  return {
    id,
    tenant_id: payload.tenant_id,
    created_at: soldAt,
    // O total volta como o app o calculou. O banco tem a palavra final e pode
    // divergir por centavos numa venda por peso — mas quem lê este retorno é o
    // comprovante que já está na tela, e trocar o número DEPOIS da venda
    // fechada confundiria mais do que a diferença que corrige. A próxima carga
    // traz o valor do banco.
    total_cents: payload.total_cents,
    payment_method: payload.payment_method,
    status: SALE_STATUS.completed,
    items: payload.items,
    is_synced: true,
  };
}

/**
 * Centavos → `R$ 12,34`, para o resumo do histórico.
 *
 * O texto é gravado PRONTO: `activity_log.summary` é o retrato do que
 * aconteceu naquela hora, e remontá-lo na tela usaria a formatação de hoje
 * para descrever um evento de ontem.
 */
function moeda(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
