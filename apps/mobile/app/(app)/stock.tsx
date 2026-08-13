import { Button, Box, Card, Divider, Screen, Text, Touchable } from '@components';
import { productsInStock, stockSummary, useCatalog } from '@domain/catalog';
import type { Product, StockStatus } from '@domain/catalog';
import { useStockMovements } from '@domain/stock';
import { useUIStore } from '@store/uiStore';
import type { ThemeColor } from '@theme';

const STATUS_COLOR: Record<StockStatus, ThemeColor> = {
  ok: 'success',
  low: 'warning',
  out: 'danger',
};

const STATUS_WORD: Record<StockStatus, string> = {
  ok: 'em dia',
  low: 'está baixo',
  out: 'out',
};

/**
 * Estoque.
 *
 * Os três contadores do topo são DERIVADOS do catálogo (`resumoDeEstoque`), não
 * lidos de um endpoint separado. O protótipo trazia 4/1/1 fixos; derivando, o
 * número continua sendo o mesmo e passa a acompanhar cada movimentação.
 */
export default function StockScreen() {
  const { data: products = [] } = useCatalog();
  const { data: movements = [] } = useStockMovements();
  const openSheet = useUIStore((s) => s.openSheet);

  const inStock = productsInStock(products);
  const summary = stockSummary(products);

  return (
    <Screen title="Estoque" subtitle="O que tem e o que está acabando" padded>
      <Box flexDirection="row" gap="s10">
        <Contador label="Em dia" amount={summary.emDia} color="success" />
        <Contador label="Baixo" amount={summary.low} color="warning" />
        <Contador label="Zerado" amount={summary.out} color="danger" />
      </Box>

      {inStock.map((product) => (
        <StockLine
          key={product.id}
          product={product}
          onMove={() =>
            openSheet({ type: 'movement', productId: product.id, productName: product.name })
          }
        />
      ))}

      <Text variant="sectionLabel" color="textMuted" marginTop="s6">
        Últimas movimentações
      </Text>

      <Card paddingVertical="s4" paddingHorizontal="s16">
        {movements.map((m) => (
          <Box key={m.id}>
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
            <Divider />
          </Box>
        ))}
      </Card>

      <Button
        title="+ Registrar movimentação"
        onPress={() => openSheet({ type: 'movement' })}
        variant="tracejado"
        height={52}
        radius={18}
        textVariant="buttonSm"
      />
    </Screen>
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
          {stock.quantity} em stock · mínimo {stock.minimo} ·{' '}
          {STATUS_WORD[stock.status]}
        </Text>
      </Box>
      <Touchable
        accessibilityLabel={`Movimentar ${product.name}`}
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
          Movimentar
        </Text>
      </Touchable>
    </Box>
  );
}
