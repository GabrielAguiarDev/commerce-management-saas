import { useState } from 'react';

import { Button, Box, Field, Chips, Icon, Pill, Screen, Text, Touchable } from '@components';
import type { ChipOption } from '@components';
import {
  specialCategoryOf,
  filterCatalog,
  useToggleFavorite,
  useCatalog,
} from '@domain/catalog';
import type { CatalogFilter, Product, StockStatus } from '@domain/catalog';
import { useCapabilities } from '@domain/tenant';
import type { Messages } from '@i18n';
import { useTranslation } from '@i18n';
import { useUIStore } from '@store/uiStore';
import { formatBRL } from '@utils/money';
import type { ThemeColor } from '@theme';

/** Badge de estoque: cor e texto derivam da situação, num lugar só. */
const BADGE: Record<StockStatus, { fundo: ThemeColor; text: ThemeColor }> = {
  ok: { fundo: 'successSoft', text: 'success' },
  low: { fundo: 'warningSoft', text: 'warning' },
  out: { fundo: 'dangerSoft', text: 'danger' },
};

/**
 * Takes `t` as an argument instead of calling `useTranslation()`: this runs
 * inside a `.map()` during render, not at the top of a component, so a hook
 * here would be a rules-of-hooks violation.
 */
function badgeLabel(product: Product, t: Messages): string {
  const stock = product.stock;
  if (!stock) return '';
  if (stock.status === 'out') return t.products.badge.out;
  if (stock.status === 'low') return t.products.badge.low(stock.quantity);
  return t.products.badge.inStock(stock.quantity);
}

export default function ProductsScreen() {
  const t = useTranslation();
  const { capabilities } = useCapabilities();
  const { data: products = [] } = useCatalog();
  const { mutate: toggleFavorite } = useToggleFavorite();
  const openSheet = useUIStore((s) => s.openSheet);
  const showToast = useUIStore((s) => s.showToast);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CatalogFilter>('all');

  // O rótulo do 3º chip muda com o ramo: "Serviços" no petshop, "Bebidas" na
  // barraca. Sai do PRÓPRIO CATÁLOGO (função pura, testada), não de um `if` de
  // perfil na tela nem de uma tabela de tenant → rótulo no backend.
  const specialCategory = specialCategoryOf(products);

  const options: ChipOption<CatalogFilter>[] = [
    { key: 'all', label: 'Todos' },
    { key: 'favorites', label: 'Favoritos' },
    ...(specialCategory ? [{ key: 'special' as const, label: specialCategory }] : []),
  ];

  const list = filterCatalog(products, { search, filter, specialCategory });

  return (
    <Screen title="Produtos" subtitle={`${products.length} cadastrados`}>
      <Field
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar por nome ou código"
        height={48}
        radius={15}
        accessibilityLabel="Buscar por nome ou código"
        returnKeyType="search"
        prefix={<Icon name="search" size={17} color="textMuted" />}
      />

      <Chips options={options} selecionada={filter} onSelect={setFilter} />

      {list.map((product) => (
        <Box
          key={product.id}
          backgroundColor="surface"
          borderColor="line"
          borderWidth={1}
          borderRadius="r18"
          padding="s14"
          flexDirection="row"
          gap="s12"
          alignItems="flex-start"
        >
          <Touchable
            accessibilityLabel={
              product.favorite ? `Desfavoritar ${product.name}` : `Favoritar ${product.name}`
            }
            accessibilityState={{ selected: product.favorite }}
            onPress={() => toggleFavorite(product.id)}
            width={34}
            height={34}
            borderRadius="r11"
            backgroundColor={product.favorite ? 'primarySoft' : 'surface2'}
            alignItems="center"
            justifyContent="center"
          >
            <Text variant="star" color={product.favorite ? 'primary' : 'textMuted'}>
              ★
            </Text>
          </Touchable>

          <Box flex={1} minWidth={0}>
            <Text variant="titleSm">{product.name}</Text>
            <Text variant="captionSm" color="textMuted" marginTop="s3">
              {productMeta(product, capabilities.hasCosts)}
            </Text>

            <Box flexDirection="row" gap="s6" marginTop="s9" flexWrap="wrap" alignItems="center">
              <Text variant="moneyMd">{formatBRL(product.priceCents)}</Text>
              {capabilities.hasStock && product.stock ? (
                <Pill
                  text={badgeLabel(product, t)}
                  backgroundColor={BADGE[product.stock.status].fundo}
                  textColor={BADGE[product.stock.status].text}
                />
              ) : null}
            </Box>
          </Box>

          <Touchable
            accessibilityLabel={`Mais ações de ${product.name}`}
            // Edição completa fora de escopo desta fase — o protótipo também
            // só avisa. Registrado em DEVELOPMENT.md › Pendências.
            onPress={() => showToast(t.toasts.editUnavailable(product.name))}
            width={34}
            height={34}
            borderRadius="r11"
            borderWidth={1}
            borderColor="line"
            alignItems="center"
            justifyContent="center"
          >
            <Text variant="rowLabel" color="textMuted">
              ⋯
            </Text>
          </Touchable>
        </Box>
      ))}

      <Box marginTop="s2">
        <Button
          title="+ Cadastro rápido"
          onPress={() => openSheet({ type: 'product' })}
          variant="tracejado"
          height={52}
          radius={18}
          textVariant="buttonSm"
        />
      </Box>
    </Screen>
  );
}

/** "Código 7891 · custa R$ 132,00" — a linha de meta abaixo do nome. */
function productMeta(product: Product, hasCosts: boolean): string {
  const base = product.ehServico ? 'Serviço' : `Código ${product.code ?? '—'}`;
  if (hasCosts && product.costCents !== null) {
    return `${base} · custa ${formatBRL(product.costCents)}`;
  }
  return base;
}
