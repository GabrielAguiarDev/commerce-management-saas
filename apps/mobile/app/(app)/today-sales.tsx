import { router } from 'expo-router';

import {
  Box,
  Card,
  CardSlice,
  EmptyState,
  InfiniteListFooter,
  ListScreen,
  SaleListRow,
  Skeleton,
  Text,
} from '@components';
import { saleDetailRoute } from '@domain/navigation/routes';
import { rangeForFilter, useSalesHistory, useSalesTotals } from '@domain/sales';
import { useCapabilities } from '@domain/tenant';
import { useTranslation } from '@i18n';
import { formatBRL } from '@utils/money';

/**
 * O recorte diário que completa o card da Home.
 *
 * Ele é diferente do histórico: todo usuário do app já enxerga o resumo de
 * hoje na Home, então pode abrir esta lista, mas só quem possui `sales` recebe
 * o atalho para o detalhe e para as operações da venda. A consulta continua
 * paginada para um dia movimentado não virar uma resposta gigante.
 */
export default function TodaySalesScreen() {
  const t = useTranslation();
  const { capabilities } = useCapabilities();
  const range = rangeForFilter('today');

  const { data, isPending, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSalesHistory(range);
  const { data: totals } = useSalesTotals(range);

  const sales = data?.pages.flatMap((page) => page.sales) ?? [];

  function loadMore() {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }

  /**
   * VIRTUALIZADA (`ListScreen`): só as vendas visíveis existem, cada uma como
   * fatia do cartão (`CardSlice`). O total do dia e os estados vêm antes.
   */
  return (
    <ListScreen
      title={t.todaySales.title}
      subtitle={t.todaySales.subtitle}
      padded
      header={
        <>
          <Card gap="s3" paddingVertical="s14">
            <Text variant="label" color="textMuted">
              {t.todaySales.totalLabel}
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

          {isPending ? <TodaySalesSkeleton /> : null}

          {!isPending && sales.length === 0 ? (
            <EmptyState title={t.todaySales.empty.title} text={t.todaySales.empty.text} />
          ) : null}
        </>
      }
      data={sales}
      keyExtractor={(sale) => sale.id}
      rowGap={0}
      onEndReached={loadMore}
      renderItem={({ item: sale, index }) => (
        <CardSlice
          first={index === 0}
          last={index === sales.length - 1}
          paddingHorizontal="s14"
          paddingVertical="s2"
        >
          <SaleListRow
            sale={sale}
            onPress={
              capabilities.hasSales
                ? () => router.push(saleDetailRoute(sale.id) as never)
                : undefined
            }
          />
        </CardSlice>
      )}
      footer={
        <Box marginTop="s12">
          <InfiniteListFooter
            loadingMore={isFetchingNextPage}
            done={!isPending && !hasNextPage && sales.length > 0}
            doneText={t.todaySales.end}
          />
        </Box>
      }
    />
  );
}

function TodaySalesSkeleton() {
  return (
    <Card paddingVertical="s14" paddingHorizontal="s14" gap="s16">
      {[0, 1, 2, 3].map((item) => (
        <Box key={item} flexDirection="row" alignItems="center" gap="s12">
          <Skeleton height={34} width={52} borderRadius="r11" />
          <Box flex={1}>
            <Skeleton height={13} width="76%" borderRadius="r6" />
          </Box>
          <Skeleton height={14} width={64} borderRadius="r6" />
        </Box>
      ))}
    </Card>
  );
}
