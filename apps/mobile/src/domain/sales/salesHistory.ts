import { toDateOnly } from '@utils/dates';

import type { Sale, SaleDay } from './salesTypes';

/**
 * AS REGRAS DO HISTÓRICO — sem React, sem rede, sem tela.
 *
 * O histórico é uma lista longa que precisa parecer curta. O que faz isso não
 * é o tamanho da página: é o AGRUPAMENTO por dia, com o total do dia no
 * cabeçalho. Quem rola procurando "aquela venda de terça" acha a terça antes
 * de achar a venda.
 *
 * Tudo aqui é função pura e testada no node — é a regra do blueprint para
 * lógica de domínio, e vale especialmente para esta: o erro clássico do
 * agrupamento por data (converter para UTC antes de cortar o dia) só aparece
 * depois das 21h no fuso do Brasil, que é justamente quando ninguém está
 * testando.
 */

/**
 * Quantas vendas a tela pede por vez.
 *
 * Vinte, e não trinta: a lista carrega sozinha ao chegar perto do fim, então o
 * tamanho da página deixou de ser "o quanto dá para mostrar" e virou "o quanto
 * vale buscar por vez". Página menor chega mais rápido e desperdiça menos em
 * quem só queria conferir a venda de ontem — a rolagem busca de novo quando
 * precisar.
 */
export const HISTORY_PAGE_SIZE = 20;

/**
 * OS RECORTES do histórico.
 *
 * `custom` é o único que precisa de mais informação (as duas datas). Os outros
 * três se derivam do relógio — e é por isso que quem decide o intervalo é uma
 * função pura aqui, e não a tela: "mês atual" é o 1º do mês no fuso do
 * aparelho, e essa conta feita em UTC devolve o mês errado no primeiro dia de
 * cada mês, à noite.
 */
export const SALES_FILTERS = ['all', 'today', 'month', 'custom'] as const;

export type SalesFilter = (typeof SALES_FILTERS)[number];

/**
 * O intervalo, em ISO absoluto, do jeito que a consulta usa.
 *
 * `from` é INCLUSIVO (`gte`) e `to` é EXCLUSIVO (`lt`). O `to` exclusivo é
 * deliberado: o fim de um dia escolhido no calendário é a meia-noite do dia
 * SEGUINTE. Com `lte` na meia-noite do próprio dia, uma venda das 14h de sexta
 * ficaria de fora de um período que termina na sexta — o erro clássico de
 * relatório por data, e o mais difícil de notar, porque a lista fica quase
 * certa.
 *
 * `null` dos dois lados = sem limite.
 */
export interface SalesRange {
  from: string | null;
  to: string | null;
}

/** As duas pontas que a tela coleta no "Selecionar período". */
export interface CustomRange {
  from: Date | null;
  to: Date | null;
}

const SEM_LIMITE: SalesRange = { from: null, to: null };

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** A meia-noite do dia SEGUINTE — o fim exclusivo de um dia. */
function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

/**
 * O intervalo de cada filtro. Pura, e `now` entra por argumento para o teste
 * poder fixar o instante.
 *
 * O período personalizado aceita METADE preenchida: só "de" é "daquele dia em
 * diante", só "até" é "até aquele dia". Exigir as duas datas para poder filtrar
 * transformaria o caso mais comum ("o que vendi desde segunda?") em dois campos
 * obrigatórios.
 */
export function rangeForFilter(
  filter: SalesFilter,
  custom: CustomRange = { from: null, to: null },
  now: Date = new Date(),
): SalesRange {
  switch (filter) {
    case 'today':
      return { from: startOfDay(now).toISOString(), to: null };

    case 'month':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), to: null };

    case 'custom':
      return {
        from: custom.from ? startOfDay(custom.from).toISOString() : null,
        // Invertido (de 20/08 até 10/08) NÃO é corrigido em silêncio: a lista
        // volta vazia e a tela mostra as duas datas como foram digitadas. Trocar
        // a ordem por conta própria esconderia o erro de digitação e devolveria
        // um período que ninguém pediu.
        to: custom.to ? endOfDay(custom.to).toISOString() : null,
      };

    case 'all':
    default:
      return SEM_LIMITE;
  }
}

/** Uma chave estável do intervalo, para o cache do react-query. */
export function rangeKey(range: SalesRange): string {
  return `${range.from ?? '*'}..${range.to ?? '*'}`;
}

/**
 * O dia LOCAL de uma venda, em `YYYY-MM-DD`.
 *
 * Passa por `toDateOnly`, e não por `toISOString().slice(0, 10)`, pelo motivo
 * documentado lá: às 21h de Brasília o corte em UTC já devolve o dia seguinte,
 * e a venda das 21h05 apareceria sob o cabeçalho de amanhã.
 */
export function saleDayKey(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return toDateOnly(date);
}

/**
 * AGRUPA as vendas por dia, mantendo a ordem em que chegaram.
 *
 * A consulta já devolve da mais nova para a mais antiga, então preservar a
 * ordem de entrada é o bastante — reordenar aqui seria refazer, com menos
 * informação, o `order by` que o banco já fez. O `Map` preserva a ordem de
 * inserção das chaves, e é por isso que ele está aqui em vez de um objeto.
 *
 * O TOTAL DO DIA IGNORA AS ESTORNADAS. Elas continuam na lista (é o ponto do
 * histórico), mas somá-las devolveria um faturamento que o Início e o portal
 * não confirmam — e um número que só bate numa das três telas é pior que
 * número nenhum.
 *
 * `today` entra como argumento para o teste poder fixar o dia. Em produção
 * ninguém passa.
 */
export function groupSalesByDay(sales: readonly Sale[], today: Date = new Date()): SaleDay[] {
  const todayKey = toDateOnly(today);
  const yesterdayKey = toDateOnly(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1));

  const days = new Map<string, SaleDay>();

  for (const sale of sales) {
    const key = saleDayKey(sale.soldAt);
    if (!key) continue;

    let day = days.get(key);

    if (!day) {
      day = {
        key,
        iso: sale.soldAt,
        relative: key === todayKey ? 'today' : key === yesterdayKey ? 'yesterday' : null,
        sales: [],
        totalCents: 0,
        saleCount: 0,
        refundedCount: 0,
      };
      days.set(key, day);
    }

    day.sales.push(sale);

    if (sale.refunded) {
      day.refundedCount += 1;
    } else {
      day.totalCents += sale.totalCents;
      day.saleCount += 1;
    }
  }

  return [...days.values()];
}
