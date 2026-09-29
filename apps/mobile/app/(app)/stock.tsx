import { Button, Box, Card, Icon, InfiniteListFooter, ListScreen, Text, Touchable } from '@components';
import { useCatalogFacets, useProductsPage } from '@domain/catalog';
import type { Product, StockStatus } from '@domain/catalog';
import { ROUTES } from '@domain/navigation/routes';
import { goTo } from '@hooks/navigation';
import { useUIStore } from '@store/uiStore';
import type { ThemeColor } from '@theme';
import { useTranslation } from '@i18n';

const STATUS_COLOR: Record<StockStatus, ThemeColor> = {
  ok: 'success',
  low: 'warning',
  out: 'danger',
};

/**
 * Estoque.
 *
 * Os três contadores do topo são do catálogo INTEIRO (`catalog_facets`), e a
 * lista chega em páginas de 20, mais ao rolar. Os dois são lidos do banco
 * separadamente de propósito: somar o que está na tela daria só a primeira
 * página. Movimentar estoque invalida os dois (prefixo `catalogoKeys.all`).
 */
const STOCK_QUERY = { search: '', filter: 'stock', specialCategory: null } as const;

export default function StockScreen() {
  const { data: facets } = useCatalogFacets();
  const { data, isPending, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useProductsPage(STOCK_QUERY);
  const openSheet = useUIStore((s) => s.openSheet);
  const t = useTranslation();

  const inStock = data?.pages.flatMap((page) => page.products) ?? [];
  const summary = facets?.stock ?? { emDia: 0, low: 0, out: 0 };

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  };

  const header = (
    <>
      <Box flexDirection="row" gap="s10">
        <Contador label={t.stock.counters.ok} amount={summary.emDia} color="success" />
        <Contador label={t.stock.counters.low} amount={summary.low} color="warning" />
        <Contador label={t.stock.counters.out} amount={summary.out} color="danger" />
      </Box>

      {/* As AÇÕES ficam acima da lista, e nada fica abaixo dela: a lista
          carrega mais ao rolar, e o que morasse depois do último produto só
          seria alcançado percorrendo o catálogo inteiro. O histórico de
          movimentações virou tela própria pelo mesmo motivo. */}
      <Button
        title={t.stock.addMovement}
        onPress={() => openSheet({ type: 'movement' })}
        variant="tracejado"
        height={52}
        radius={18}
        textVariant="buttonSm"
      />

      <Touchable
        accessibilityLabel={t.stock.viewHistory}
        onPress={() => goTo(ROUTES.stockHistory)}
        backgroundColor="surface"
        borderColor="line"
        borderWidth={1}
        borderRadius="r18"
        padding="s14"
        flexDirection="row"
        alignItems="center"
        gap="s12"
      >
        <Box
          width={38}
          height={38}
          borderRadius="r12"
          backgroundColor="surface2"
          alignItems="center"
          justifyContent="center"
        >
          <Icon name="stock" size={18} color="primary" />
        </Box>
        <Text variant="titleXs" flex={1}>
          {t.stock.viewHistory}
        </Text>
        <Icon name="chevronRight" size={18} color="textMuted" />
      </Touchable>
    </>
  );

  // A lista é VIRTUALIZADA (`ListScreen`): só as linhas visíveis existem.
  return (
    <ListScreen
      title={t.stock.title}
      subtitle={t.stock.subtitle}
      padded
      header={header}
      data={inStock}
      keyExtractor={(product) => product.id}
      onEndReached={loadMore}
      renderItem={({ item: product }) => (
        <StockLine
          product={product}
          onMove={() =>
            openSheet({ type: 'movement', productId: product.id, productName: product.name })
          }
        />
      )}
      footer={
        <InfiniteListFooter
          loadingMore={isFetchingNextPage}
          done={!isPending && !hasNextPage && inStock.length > 0}
          doneText={t.stock.allShown}
        />
      }
    />
  );
}

function Contador({ label, amount, color }: { label: string; amount: number; color: ThemeColor }) {
  return (
    <Card flex={1} borderRadius="r18" padding="s14">
      <Text variant="hint" color="textMuted">
        {label}
      </Text>
      <Text variant="statValue" color={color} marginTop="s4">
        {amount}
      </Text>
    </Card>
  );
}

function StockLine({
  product,
  onMove,
}: {
  product: Product;
  onMove: () => void;
}) {
  const t = useTranslation();
  const stock = product.stock;
  if (!stock) return null;

  return (
    <Box
      backgroundColor="surface"
      borderColor="line"
      borderWidth={1}
      borderRadius="r18"
      padding="s14"
      flexDirection="row"
      alignItems="center"
      gap="s12"
    >
      <Box
        width={8}
        height={38}
        borderRadius="full"
        backgroundColor={STATUS_COLOR[stock.status]}
      />
      <Box flex={1} minWidth={0}>
        <Text variant="titleXs">{product.name}</Text>
        <Text variant="captionSm" color="textMuted" marginTop="s3">
          {t.stock.line(stock.quantity, stock.minimo, t.stock.status[stock.status])}
        </Text>
      </Box>
      <Touchable
        accessibilityLabel={t.stock.moveProduct(product.name)}
        onPress={onMove}
        height={36}
        paddingHorizontal="s13"
        borderRadius="r12"
        borderWidth={1}
        borderColor="line"
        alignItems="center"
        justifyContent="center"
      >
        <Text variant="buttonTiny" color="primaryText">
          {t.stock.move}
        </Text>
      </Touchable>
    </Box>
  );
}
