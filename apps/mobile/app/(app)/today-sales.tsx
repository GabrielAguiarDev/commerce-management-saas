import { router } from 'expo-router';

import {
  Box,
  Card,
  Divider,
  EmptyState,
  Gutter,
  SaleListRow,
  Screen,
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

  return (
    <Screen
      title={t.todaySales.title}
      subtitle={t.todaySales.subtitle}
      onEndReached={loadMore}
    >
      <Gutter gap="s12">
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

        {sales.length > 0 ? (
          <Card paddingVertical="s2" paddingHorizontal="s14">
            {sales.map((sale, index) => (
              <Box key={sale.id}>
                {index > 0 ? <Divider /> : null}
                <SaleListRow
                  sale={sale}
                  onPress={
                    capabilities.hasSales
                      ? () => router.push(saleDetailRoute(sale.id) as never)
                      : undefined
                  }
                />
              </Box>
            ))}
          </Card>
        ) : null}

        {isFetchingNextPage ? (
          <Box gap="s10" marginTop="s2">
            {[0, 1].map((item) => (
              <Box
                key={item}
                flexDirection="row"
                alignItems="center"
                gap="s12"
                paddingHorizontal="s14"
              >
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

        {!isPending && !hasNextPage && sales.length > 0 ? (
          <Text variant="hint" color="textMuted" textAlign="center" marginTop="s4">
            {t.todaySales.end}
          </Text>
        ) : null}
      </Gutter>
    </Screen>
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
