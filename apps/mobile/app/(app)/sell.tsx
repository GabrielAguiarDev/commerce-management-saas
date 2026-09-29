import { useState } from 'react';

import { BarcodeScanner, Box, Field, EmptyState, Icon, ListScreen, Text, Touchable } from '@components';
import { searchHasNoResults, saleGrid, useCatalog } from '@domain/catalog';
import type { Product } from '@domain/catalog';
import { useTranslation } from '@i18n';
import { useCartStore } from '@store/cartStore';
import { useUIStore } from '@store/uiStore';
import { formatBRL } from '@utils/money';

/**
 * Nova venda.
 *
 * A grade mostra o catálogo inteiro desde a abertura — sem busca não é tela
 * vazia — com os FAVORITOS na frente: o dono decide o que fica à mão
 * favoritando em Produtos, e o resto continua a uma rolagem. A regra é pura e
 * vive em `saleGrid`.
 */
export default function SellScreen() {
  const t = useTranslation();
  const [search, setSearch] = useState('');
  const [lendoCodigo, setLendoCodigo] = useState(false);
  const { data: products = [] } = useCatalog();
  const add = useCartStore((s) => s.add);
  const openSheet = useUIStore((s) => s.openSheet);
  const showToast = useUIStore((s) => s.showToast);

  const grid = saleGrid(products, search);
  const isEmpty = searchHasNoResults(products, search);

  /**
   * O que fazer com o número que a câmera leu.
   *
   * CÓDIGO EXATO VAI DIRETO PARA O CARRINHO. É para isso que se lê código de
   * barras no balcão: bipar e passar o próximo. Cair na busca e obrigar um
   * toque a mais anularia o ganho de ter câmera.
   *
   * Não achou — produto sem cadastro, ou etiqueta de outro sistema — o número
   * vai para a busca. Assim a pessoa vê o que foi lido e decide: procurar por
   * nome, ou cadastrar. Um toast de "não encontrei" e a tela intacta deixaria
   * ela sem nenhuma das duas saídas.
   */
  function usarCodigo(code: string) {
    setLendoCodigo(false);

    const achado = products.find((p) => p.code === code);
    if (!achado) {
      setSearch(code);
      return;
    }

    add({ id: achado.id, name: achado.name, priceCents: achado.priceCents });
    showToast(t.toasts.scanned(achado.name), { tone: 'sucesso' });
  }

  // O cabeçalho da lista: busca, leitor e o rótulo. Rola junto com a grade.
  // O `BarcodeScanner` é um modal — o lugar dele na árvore não ocupa espaço.
  const header = (
    <>
      <Box flexDirection="row" gap="s9">
        <Box flex={1}>
          <Field
            value={search}
            onChangeText={setSearch}
            placeholder={t.sell.searchPlaceholder}
            height={48}
            radius={15}
            accessibilityLabel={t.sell.searchPlaceholder}
            returnKeyType="search"
            prefix={<Icon name="search" size={17} color="textMuted" />}
          />
        </Box>
        <Touchable
          accessibilityLabel={t.sell.scanBarcode}
          onPress={() => setLendoCodigo(true)}
          width={48}
          height={48}
          borderRadius="r15"
          borderWidth={1}
          borderColor="line"
          backgroundColor="surface"
          alignItems="center"
          justifyContent="center"
        >
          <Icon name="scan" size={20} color="primary" />
        </Touchable>
      </Box>

      <BarcodeScanner
        visible={lendoCodigo}
        onClose={() => setLendoCodigo(false)}
        onRead={usarCodigo}
      />

      <Text variant="gridLabel" color="textMuted" marginTop="s2">
        {search.trim() ? t.sell.searchResults : t.sell.products}
      </Text>
    </>
  );

  /**
   * A grade é VIRTUALIZADA (`ListScreen`): o catálogo inteiro continua no
   * aparelho — a venda offline e o leitor precisam dele —, mas só os cartões
   * visíveis são desenhados. Um catálogo de centenas de produtos abre na mesma
   * velocidade que um de vinte.
   */
  return (
    <ListScreen
      title={t.sell.title}
      subtitle={t.sell.subtitle}
      padded
      header={header}
      data={grid}
      numColumns={2}
      keyExtractor={(product) => product.id}
      renderItem={({ item: product }) => (
        <SaleCard
          product={product}
          onPress={() =>
            add({
              id: product.id,
              name: product.name,
              priceCents: product.priceCents,
            })
          }
        />
      )}
      footer={
        isEmpty ? (
          <EmptyState
            title={t.sell.emptyTitle}
            text={t.sell.emptyText}
            actionLabel={t.sell.createProduct}
            onActionPress={() => openSheet({ type: 'product' })}
          />
        ) : null
      }
    />
  );
}

function SaleCard({ product, onPress }: { product: Product; onPress: () => void }) {
  const t = useTranslation();
  return (
    <Touchable
      accessibilityLabel={t.sell.addItem(product.name, formatBRL(product.priceCents))}
      onPress={onPress}
      // A largura é a da célula da grade (duas colunas, ver `ListScreen`); a
      // altura mínima iguala as linhas quando um nome quebra e o outro não.
      minHeight={104}
      borderRadius="r18"
      borderWidth={1}
      borderColor="line"
      backgroundColor="surface"
      padding="s13"
      justifyContent="space-between"
      gap="s8"
    >
      <Text variant="titleXs" lineHeight={18}>
        {product.name}
      </Text>
      <Box flexDirection="row" alignItems="center" justifyContent="space-between" gap="s6">
        <Text variant="moneyMd" color="primaryText">
          {formatBRL(product.priceCents)}
        </Text>
        <Box
          width={28}
          height={28}
          borderRadius="r10"
          backgroundColor="primarySoft"
          alignItems="center"
          justifyContent="center"
        >
          <Text variant="gridPlus" color="primaryText">
            +
          </Text>
        </Box>
      </Box>
    </Touchable>
  );
}
