import { useState } from 'react';

import { Box, Field, EmptyState, Icon, Screen, Text, Touchable } from '@components';
import { searchHasNoResults, saleGrid, useCatalog } from '@domain/catalog';
import type { Product } from '@domain/catalog';
import { useTranslation } from '@i18n';
import { useCartStore } from '@store/cartStore';
import { useUIStore } from '@store/uiStore';
import { formatBRL } from '@utils/money';

/**
 * Nova venda.
 *
 * A grade sem busca mostra só os FAVORITOS — é a tela de bate-rápido do
 * balcão, e o dono decide o que fica à mão favoritando em Produtos. Com busca,
 * o catálogo inteiro entra. A regra é pura e vive em `gradeDeVenda`.
 */
export default function SellScreen() {
  const t = useTranslation();
  const [search, setSearch] = useState('');
  const { data: products = [] } = useCatalog();
  const add = useCartStore((s) => s.add);
  const openSheet = useUIStore((s) => s.openSheet);
  const showToast = useUIStore((s) => s.showToast);

  const grid = saleGrid(products, search);
  const isEmpty = searchHasNoResults(products, search);

  return (
    <Screen title="Nova venda" subtitle="Toque nos itens para montar a venda">
      <Box flexDirection="row" gap="s9">
        <Box flex={1}>
          <Field
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar produto"
            height={48}
            radius={15}
            accessibilityLabel="Buscar produto"
            returnKeyType="search"
            prefix={<Icon name="search" size={17} color="textMuted" />}
          />
        </Box>
        <Touchable
          accessibilityLabel="Ler código de barras"
          // Fora de escopo: exige expo-camera e permissão declarada. O botão
          // permanece no desenho e diz o que faria.
          onPress={() => showToast(t.toasts.cameraUnavailable)}
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

      <Text variant="gridLabel" color="textMuted" marginTop="s2">
        {search.trim() ? 'Resultados da busca' : 'Mais vendidos'}
      </Text>

      <Box flexDirection="row" flexWrap="wrap" gap="s10">
        {grid.map((product) => (
          <SaleCard
            key={product.id}
            product={product}
            onPress={() =>
              add({
                id: product.id,
                name: product.name,
                priceCents: product.priceCents,
              })
            }
          />
        ))}
      </Box>

      {isEmpty ? (
        <EmptyState
          title="Nada encontrado"
          text="Tente outro nome ou cadastre esse produto agora mesmo."
          actionLabel="Cadastrar produto"
          onActionPress={() => openSheet({ type: 'product' })}
        />
      ) : null}
    </Screen>
  );
}

function SaleCard({ product, onPress }: { product: Product; onPress: () => void }) {
  return (
    <Touchable
      accessibilityLabel={`Adicionar ${product.name}, ${formatBRL(product.priceCents)}`}
      onPress={onPress}
      // Dois por linha com 10 de gap: 48% aproxima sem precisar medir a tela.
      // `flexBasis` em vez de largura fixa mantém o desenho em tela pequena.
      flexBasis="48%"
      flexGrow={1}
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
        <Text variant="moneyMd" color="primary">
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
          <Text variant="gridPlus" color="primary">
            +
          </Text>
        </Box>
      </Box>
    </Touchable>
  );
}
