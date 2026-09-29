import { useState } from 'react';

import {
  Button,
  Box,
  Field,
  Chips,
  Gutter,
  Icon,
  InfiniteListFooter,
  ListScreen,
  Pill,
  Skeleton,
  Text,
  Touchable,
} from '@components';
import type { ChipOption } from '@components';
import { useCatalogFacets, useProductsPage, useToggleFavorite } from '@domain/catalog';
import type { CatalogFilter, Product, StockStatus } from '@domain/catalog';
import { useCapabilities } from '@domain/tenant';
import { useDebouncedValue } from '@hooks/useDebouncedValue';
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
  const { mutate: toggleFavorite } = useToggleFavorite();
  const openSheet = useUIStore((s) => s.openSheet);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CatalogFilter>('all');

  // O rótulo do 3º chip muda com o ramo: "Serviços" no petshop, "Bebidas" na
  // barraca. Sai dos NÚMEROS DO CATÁLOGO INTEIRO (`catalog_facets`), já que a
  // lista agora chega em páginas e nenhuma página sozinha sabe responder.
  const { data: facets } = useCatalogFacets();
  const specialCategory = facets?.specialCategory ?? null;

  const options: ChipOption<CatalogFilter>[] = [
    { key: 'all', label: t.products.filters.all },
    { key: 'favorites', label: t.products.filters.favorites },
    ...(specialCategory ? [{ key: 'special' as const, label: specialCategory }] : []),
  ];

  // A busca vai ao banco: espera a pessoa parar de digitar.
  const debouncedSearch = useDebouncedValue(search);
  const { data, isPending, fetchNextPage, hasNextPage, isFetchingNextPage } = useProductsPage({
    search: debouncedSearch,
    filter,
    specialCategory,
  });
  const list = data?.pages.flatMap((page) => page.products) ?? [];

  /**
   * `onEndReached` do `Screen` chega várias vezes enquanto o dedo está na
   * faixa final; sem as duas guardas, a mesma página seria pedida em dobro.
   */
  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  };

  const header = (
    <>
      <Gutter>
        <Field
          value={search}
          onChangeText={setSearch}
          placeholder={t.products.searchPlaceholder}
          height={48}
          radius={15}
          accessibilityLabel={t.products.searchPlaceholder}
          returnKeyType="search"
          prefix={<Icon name="search" size={17} color="textMuted" />}
        />
        {/* NO TOPO, e não no fim: a lista carrega mais ao rolar, então o fim
            dela vai embora a cada página — um botão lá embaixo exigiria
            percorrer o catálogo inteiro para cadastrar um produto. */}
        <Box marginTop="s10">
          <Button
            title={t.products.quickAdd}
            onPress={() => openSheet({ type: 'product' })}
            variant="tracejado"
            height={48}
            radius={15}
            textVariant="buttonSm"
          />
        </Box>
      </Gutter>

      {/* FORA do `Gutter`: a fileira de filtros rola na horizontal e dá o
          próprio gutter por dentro, para o último chip deslizar até a borda do
          aparelho em vez de sumir 16px antes. */}
      <Chips options={options} selecionada={filter} onSelect={setFilter} />

      {/* Busca e filtros ficam de pé e utilizáveis enquanto a lista vem: o que
          carrega é a LISTA, não a tela. Três linhas fantasmas dão à página a
          altura que ela terá, para o conteúdo não pular quando chegar. */}
      {isPending ? (
        <Gutter gap="s12">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={96} borderRadius="r18" />
          ))}
        </Gutter>
      ) : null}
    </>
  );

  /**
   * A lista é VIRTUALIZADA (`ListScreen`): só os cartões visíveis existem. Sem
   * `padded` porque os chips precisam alcançar a borda do aparelho — os
   * cartões levam o gutter por dentro.
   */
  return (
    <ListScreen
      title={t.products.title}
      subtitle={facets ? t.products.count(facets.total) : ' '}
      header={header}
      data={list}
      keyExtractor={(product) => product.id}
      onEndReached={loadMore}
      renderItem={({ item: product }) => (
        <Gutter>
          <Box
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
                product.favorite ? t.products.unfavorite(product.name) : t.products.favorite(product.name)
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
                {productMeta(product, capabilities.hasCosts, t)}
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
              accessibilityLabel={t.products.edit(product.name)}
              // Mesmo sheet do cadastro rápido, com os campos preenchidos.
              onPress={() => openSheet({ type: 'product', productId: product.id })}
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
        </Gutter>
      )}
      footer={
        <Gutter>
          {!isPending && list.length === 0 ? (
            <Text variant="captionSm" color="textMuted" textAlign="center" marginTop="s6">
              {t.products.noResults}
            </Text>
          ) : null}
          <InfiniteListFooter
            loadingMore={isFetchingNextPage}
            done={!isPending && !hasNextPage && list.length > 0}
            doneText={t.products.allShown}
            rowHeight={96}
          />
        </Gutter>
      }
    />
  );
}

/** "Código 7891 · custa R$ 132,00" — a linha de meta abaixo do nome. */
function productMeta(product: Product, hasCosts: boolean, t: Messages): string {
  const base = product.ehServico ? t.products.service : t.products.code(product.code ?? '—');
  if (hasCosts && product.costCents !== null) {
    return t.products.withCost(base, formatBRL(product.costCents));
  }
  return base;
}
