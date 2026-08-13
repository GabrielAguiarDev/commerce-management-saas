import { router } from 'expo-router';
import { useState } from 'react';

import {
  Box,
  Button,
  Card,
  Chips,
  Divider,
  EmptyState,
  Field,
  Gutter,
  Icon,
  Pill,
  Screen,
  Skeleton,
  Text,
  Touchable,
  type ChipOption,
} from '@components';
import { saleDetailRoute } from '@domain/navigation/routes';
import {
  groupSalesByDay,
  rangeForFilter,
  useSalesHistory,
  useSalesTotals,
  type CustomRange,
  type Sale,
  type SaleDay,
  type SalesFilter,
} from '@domain/sales';
import { useTranslation } from '@i18n';
import type { Messages } from '@i18n';
import { usePreferencesStore } from '@store/preferencesStore';
import { maskDayInput, parseDayInput } from '@utils/dates';
import { formatBRL } from '@utils/money';
import { paymentLabel } from '@utils/payment';

/**
 * O HISTÓRICO DE VENDAS.
 *
 * A tela responde "o que eu já vendi?", e a resposta é longa por natureza — ela
 * só cresce. Três decisões seguram isso:
 *
 *  1. **o recorte** (Todas / Hoje / Mês atual / Período), com o total do
 *     recorte logo abaixo. É a primeira pergunta de quem abre esta tela, e o
 *     número de cima muda junto com ela;
 *  2. **cabeçalho por dia, com o total do dia.** Quem rola procurando "aquela
 *     venda de terça" acha a terça primeiro. Sem os cabeçalhos, seriam 300
 *     linhas iguais e a rolagem viraria uma busca no escuro;
 *  3. **rolagem infinita.** Carrega 20 e busca as próximas ao chegar perto do
 *     fim. O conteúdo novo entra ABAIXO do que está à vista, então nada se move
 *     debaixo do dedo de quem está lendo — o cuidado que faria a lista precisar
 *     de um botão manual é o de listas que crescem para CIMA, não para baixo.
 *     Ver `onEndReached` no `Screen`.
 *
 * ⚠️ O TOTAL DE CIMA NÃO É SOMA DO QUE ESTÁ NA TELA. Ele vem de consulta
 * própria, sobre o período inteiro (`useSalesTotals`). Somar a página mostraria
 * um terço do faturamento do mês com toda a confiança do mundo — e o número
 * certo é o motivo de a tela existir.
 *
 * A VENDA ESTORNADA APARECE, riscada e fora dos totais. É o mesmo desenho do
 * portal, e a razão é a mesma: é essa linha que explica ao contador por que o
 * caderno e o sistema divergem naquele dia.
 *
 * SEM `padded` no `Screen`: a fileira de filtros ROLA na horizontal e precisa
 * alcançar a borda real do aparelho. Os blocos estáticos vão no `<Gutter>`.
 * Ver `padding-layout.md`.
 */
export default function SalesHistoryScreen() {
  const t = useTranslation();
  const language = usePreferencesStore((s) => s.language);

  const [filter, setFilter] = useState<SalesFilter>('all');
  // O que está DIGITADO nos campos, ainda como texto. Só vira intervalo depois
  // de "Aplicar": filtrar a cada tecla dispararia uma consulta por dígito, e no
  // meio da digitação a data está inválida de qualquer forma.
  const [fromText, setFromText] = useState('');
  const [toText, setToText] = useState('');
  const [custom, setCustom] = useState<CustomRange>({ from: null, to: null });

  const range = rangeForFilter(filter, custom);

  const { data, isPending, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSalesHistory(range);
  const { data: totals } = useSalesTotals(range);

  const sales = data?.pages.flatMap((p) => p.sales) ?? [];
  const days = groupSalesByDay(sales);

  const options: ChipOption<SalesFilter>[] = [
    { key: 'all', label: t.sales.filters.all },
    { key: 'today', label: t.sales.filters.today },
    { key: 'month', label: t.sales.filters.month },
    { key: 'custom', label: t.sales.filters.custom },
  ];

  function applyCustom(from = fromText, to = toText) {
    setCustom({ from: parseDayInput(from), to: parseDayInput(to) });
  }

  /**
   * Trocar de filtro NÃO apaga o que foi digitado: quem volta para "Selecionar
   * período" reencontra as datas onde deixou. Sair dele, sim, zera o intervalo
   * EM VIGOR — senão "Todas" continuaria recortada por um período que não está
   * mais à vista.
   */
  function pickFilter(next: SalesFilter) {
    setFilter(next);
    if (next === 'custom') applyCustom();
    else setCustom({ from: null, to: null });
  }

  const customEmpty = filter === 'custom' && !custom.from && !custom.to;

  /**
   * A GUARDA da rolagem infinita.
   *
   * `onEndReached` chega repetidamente enquanto o dedo está na faixa final —
   * sem `!isFetchingNextPage` aqui, uma rolagem até o fim dispararia a mesma
   * página quatro ou cinco vezes, e o histórico apareceria com as vendas
   * duplicadas.
   */
  function loadMore() {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }

  return (
    <Screen title={t.sales.title} subtitle={t.sales.subtitle} onEndReached={loadMore}>
      {/* FORA do `Gutter`: rola na horizontal e dá o próprio gutter por dentro. */}
      <Chips options={options} selecionada={filter} onSelect={pickFilter} />

      <Gutter gap="s12">
        {filter === 'custom' ? (
          <Card gap="s10" paddingVertical="s14">
            <Text variant="label" color="textMuted">
              {t.sales.period.title}
            </Text>

            <Box flexDirection="row" gap="s10">
              <Box flex={1}>
                <Field
                  value={fromText}
                  onChangeText={(v) => setFromText(maskDayInput(v))}
                  label={t.sales.period.from}
                  placeholder="dd/mm/aaaa"
                  keyboardType="number-pad"
                  accessibilityLabel={t.sales.period.from}
                  height={46}
                />
              </Box>
              <Box flex={1}>
                <Field
                  value={toText}
                  onChangeText={(v) => setToText(maskDayInput(v))}
                  label={t.sales.period.to}
                  placeholder="dd/mm/aaaa"
                  keyboardType="number-pad"
                  accessibilityLabel={t.sales.period.to}
                  height={46}
                />
              </Box>
            </Box>

            <Button
              title={t.sales.period.apply}
              onPress={() => applyCustom()}
              variant="secundario"
              height={44}
              radius={14}
              textVariant="buttonXs"
            />

            {/* Uma data só preenchida NÃO é erro: é filtro aberto de um lado
                ("de 01/08 em diante"). A linha diz o que está valendo em vez de
                reclamar de um campo vazio. */}
            <Text variant="hint" color="textMuted">
              {customEmpty ? t.sales.period.hint : describeCustom(custom, t, language)}
            </Text>
          </Card>
        ) : null}

        {/* O RESUMO DO RECORTE — a resposta da pergunta que o filtro faz. */}
        <Card gap="s3" paddingVertical="s14">
          <Text variant="label" color="textMuted">
            {filterLabel(filter, custom, t, language)}
          </Text>

          {totals ? (
            <>
              <Text variant="cardValue">{formatBRL(totals.totalCents)}</Text>
              <Text variant="hint" color="textMuted">
                {t.sales.saleCount(totals.saleCount)}
              </Text>
              {totals.refundedCount > 0 ? (
                <Text variant="hint" color="warning">
                  {t.sales.refundedInDay(totals.refundedCount)}
                </Text>
              ) : null}
            </>
          ) : (
            <>
              <Skeleton height={24} width="52%" marginTop="s4" />
              <Skeleton height={12} width="34%" marginTop="s6" borderRadius="r6" />
            </>
          )}
        </Card>

        {isPending ? <HistorySkeleton /> : null}

        {!isPending && days.length === 0 ? (
          <EmptyState
            title={filter === 'all' ? t.sales.empty.title : t.sales.empty.filteredTitle}
            text={filter === 'all' ? t.sales.empty.text : t.sales.empty.filteredText}
          />
        ) : null}

        {days.map((day) => (
          <Box key={day.key} gap="s8">
            <Box flexDirection="row" alignItems="baseline" justifyContent="space-between" gap="s10">
              <Text variant="sectionLabel">{dayTitle(day, t, language)}</Text>
              <Text variant="hint" color="textMuted">
                {t.sales.dayTotal(day.saleCount, formatBRL(day.totalCents))}
              </Text>
            </Box>

            <Card paddingVertical="s2" paddingHorizontal="s14">
              {day.sales.map((sale, index) => (
                <Box key={sale.id}>
                  {index > 0 ? <Divider /> : null}
                  <SaleRow sale={sale} t={t} />
                </Box>
              ))}
            </Card>
          </Box>
        ))}

        {/* O rodapé da rolagem infinita: esqueleto no lugar exato das vendas
            que estão chegando. Um spinner solto diria "espere" sem dizer o
            quê; estas duas linhas cinzas dizem "vêm mais vendas aqui". */}
        {isFetchingNextPage ? (
          <Box gap="s10" marginTop="s2">
            {[0, 1].map((i) => (
              <Box key={i} flexDirection="row" alignItems="center" gap="s12" paddingHorizontal="s14">
                <Skeleton height={34} width={52} borderRadius="r11" />
                <Box flex={1}>
                  <Skeleton height={13} width="70%" borderRadius="r6" />
                </Box>
                <Skeleton height={14} width={64} borderRadius="r6" />
              </Box>
            ))}
            <Text variant="hint" color="textMuted" textAlign="center">
              {t.sales.loadingMore}
            </Text>
          </Box>
        ) : null}

        {/* O fim da lista é dito em voz alta. Sem isto, quem rolou até embaixo
            não sabe se acabou ou se o app parou de carregar. */}
        {!isPending && !hasNextPage && days.length > 0 ? (
          <Text variant="hint" color="textMuted" textAlign="center" marginTop="s4">
            {t.sales.end}
          </Text>
        ) : null}
      </Gutter>
    </Screen>
  );
}

function SaleRow({ sale, t }: { sale: Sale; t: Messages }) {
  return (
    <Touchable
      accessibilityLabel={`${sale.time}, ${sale.itemsSummary}, ${formatBRL(sale.totalCents)}`}
      onPress={() => router.push(saleDetailRoute(sale.id) as never)}
      flexDirection="row"
      alignItems="center"
      gap="s12"
      paddingVertical="s12"
    >
      <Box
        minWidth={52}
        height={34}
        borderRadius="r11"
        backgroundColor="surface2"
        alignItems="center"
        justifyContent="center"
        paddingHorizontal="s8"
      >
        <Text variant="tinyBold" color="textMuted">
          {sale.time}
        </Text>
      </Box>

      <Box flex={1} minWidth={0}>
        <Text
          variant="rowText"
          numberOfLines={1}
          color={sale.refunded ? 'textMuted' : 'textPrimary'}
          // A venda estornada é RISCADA, não escondida. `Text` do restyle não
          // tem prop para isto — decoração de texto não é token de tema.
          style={sale.refunded ? { textDecorationLine: 'line-through' } : undefined}
        >
          {sale.itemsSummary}
        </Text>
        <Box flexDirection="row" alignItems="center" gap="s6" marginTop="s3">
          <Text variant="hint" color="textMuted">
            {paymentLabel(t, sale.paymentMethod)}
          </Text>
          {sale.refunded ? (
            <Pill
              text={t.sales.refundedBadge}
              backgroundColor="warningSoft"
              textColor="warning"
              variant="tag"
              paddingX={7}
              paddingY={2}
            />
          ) : null}
        </Box>
      </Box>

      <Text
        variant="titleXs"
        color={sale.refunded ? 'textMuted' : 'textPrimary'}
        style={sale.refunded ? { textDecorationLine: 'line-through' } : undefined}
      >
        {formatBRL(sale.totalCents)}
      </Text>

      <Icon name="chevronRight" size={16} color="textMuted" />
    </Touchable>
  );
}

/**
 * O cabeçalho do dia: "Hoje", "Ontem" ou a data por extenso.
 *
 * O domínio entrega o FATO (`relative`, `iso`); o nome sai daqui, pelo i18n e
 * pela língua escolhida — é o que impede "Hoje" de aparecer numa tela em
 * inglês. A data longa usa `toLocaleDateString` com a MESMA língua do app, e
 * não a do sistema operacional, pelo mesmo motivo.
 */
function dayTitle(day: SaleDay, t: Messages, language: string): string {
  if (day.relative === 'today') return t.sales.today;
  if (day.relative === 'yesterday') return t.sales.yesterday;
  return longDate(new Date(day.iso), language);
}

function longDate(date: Date, language: string): string {
  const sameYear = date.getFullYear() === new Date().getFullYear();

  return date.toLocaleDateString(language, {
    day: 'numeric',
    month: 'long',
    // O ano só aparece quando NÃO é o corrente: escrevê-lo em toda linha de um
    // histórico que quase todo mundo lê dentro do mesmo ano é ruído.
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/** O nome do recorte em vigor, em cima do total. */
function filterLabel(
  filter: SalesFilter,
  custom: CustomRange,
  t: Messages,
  language: string,
): string {
  return filter === 'custom' ? describeCustom(custom, t, language) : t.sales.filters[filter];
}

/** "De 1 de agosto até 13 de agosto", "A partir de…", "Até…". */
function describeCustom(custom: CustomRange, t: Messages, language: string): string {
  const from = custom.from ? longDate(custom.from, language) : null;
  const to = custom.to ? longDate(custom.to, language) : null;

  if (from && to) return t.sales.period.between(from, to);
  if (from) return t.sales.period.since(from);
  if (to) return t.sales.period.until(to);
  return t.sales.filters.custom;
}

function HistorySkeleton() {
  return (
    <Box gap="s12">
      <Skeleton height={17} width="38%" borderRadius="r8" />
      <Card paddingVertical="s14" paddingHorizontal="s14" gap="s16">
        {[0, 1, 2, 3].map((i) => (
          <Box key={i} flexDirection="row" alignItems="center" gap="s12">
            <Skeleton height={34} width={52} borderRadius="r11" />
            <Box flex={1}>
              <Skeleton height={13} width="76%" borderRadius="r6" />
            </Box>
            <Skeleton height={14} width={64} borderRadius="r6" />
          </Box>
        ))}
      </Card>
    </Box>
  );
}
