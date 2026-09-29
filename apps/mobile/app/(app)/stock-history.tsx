import { Box, CardSlice, EmptyState, InfiniteListFooter, ListScreen, Skeleton, Text } from '@components';
import { useStockMovements } from '@domain/stock';
import type { StockMovement } from '@domain/stock';
import { useTranslation } from '@i18n';

/**
 * O HISTÓRICO DE MOVIMENTAÇÕES de estoque — tudo o que entrou e saiu, do mais
 * recente para trás, 20 por vez e mais ao rolar.
 *
 * Já morou no fim da tela Estoque, abaixo da lista de produtos. Com a lista
 * paginada, ali ele só seria alcançado depois de percorrer o catálogo inteiro;
 * virou tela própria, aberta pelo atalho no topo de Estoque.
 */
export default function StockHistoryScreen() {
  const t = useTranslation();
  const { data, isPending, fetchNextPage, hasNextPage, isFetchingNextPage } = useStockMovements();
  const movements = data?.pages.flatMap((page) => page.movements) ?? [];

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  };

  /**
   * VIRTUALIZADA (`ListScreen`): só as linhas visíveis existem, cada uma como
   * fatia do cartão (`CardSlice`).
   */
  return (
    <ListScreen
      title={t.stock.history.title}
      subtitle={t.stock.history.subtitle}
      padded
      header={isPending ? <Skeleton height={320} borderRadius="r20" /> : null}
      data={movements}
      keyExtractor={(m) => m.id}
      onEndReached={loadMore}
      rowGap={0}
      renderItem={({ item, index }) => (
        <CardSlice first={index === 0} last={index === movements.length - 1}>
          <MovementRow movement={item} />
        </CardSlice>
      )}
      footer={
        <>
          {!isPending && movements.length === 0 ? (
            <EmptyState title={t.stock.history.emptyTitle} text={t.stock.history.emptyText} />
          ) : null}
          <Box marginTop="s12">
            <InfiniteListFooter
              loadingMore={isFetchingNextPage}
              done={!isPending && !hasNextPage && movements.length > 0}
              doneText={t.stock.history.allShown}
            />
          </Box>
        </>
      }
    />
  );
}

function MovementRow({ movement: m }: { movement: StockMovement }) {
  return (
    <Box flexDirection="row" gap="s10" alignItems="center" paddingVertical="s12">
      <Box minWidth={44}>
        <Text variant="tinyBold" color={m.delta < 0 ? 'danger' : 'success'}>
          {m.sinal}
        </Text>
      </Box>
      <Box flex={1} minWidth={0}>
        <Text variant="rowText">{m.productName}</Text>
        <Text variant="hint" color="textMuted" marginTop="s2">
          {m.origem}
        </Text>
      </Box>
      <Text variant="hint" color="textMuted">
        {m.quando}
      </Text>
    </Box>
  );
}
