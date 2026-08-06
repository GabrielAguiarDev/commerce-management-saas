import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Box } from '@components/ui/Box';
import { Text } from '@components/ui/Text';
import { Toque } from '@components/ui/Toque';
import { rotuloDoCarrinho } from '@domain/sales/carrinho';
import { useCarrinhoStore, selecionarQuantidade, selecionarTotal } from '@store/carrinhoStore';
import { useUIStore } from '@store/uiStore';
import { formatarBRL } from '@utils/dinheiro';
import { palette } from '@theme';

import { AO_UP } from './animacoes';
import { ALTURA_TAB_BAR } from './BarraDeAbas';

/**
 * A barra flutuante do carrinho, logo acima da tab bar.
 *
 * Entra com o `aoUp` do design (14px de baixo + fade em 220ms). Fica visível em
 * QUALQUER tela enquanto houver item — é isso que permite ao balconista
 * conferir estoque no meio da venda sem perder o carrinho.
 */
export function BarraDoCarrinho() {
  const insets = useSafeAreaInsets();
  const itens = useCarrinhoStore((s) => s.itens);
  const quantidade = useCarrinhoStore(selecionarQuantidade);
  const total = useCarrinhoStore(selecionarTotal);
  const abrirSheet = useUIStore((s) => s.abrirSheet);

  if (itens.length === 0) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(AO_UP.duracao)
        .easing(AO_UP.easing)
        .withInitialValues({ transform: [{ translateY: AO_UP.deslocamento }] })}
      exiting={FadeOut.duration(140)}
      style={{
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: ALTURA_TAB_BAR + insets.bottom + 16,
      }}
    >
      <Toque
        accessibilityLabel={`Abrir carrinho: ${rotuloDoCarrinho(itens)}, total ${formatarBRL(total)}`}
        onPress={() => abrirSheet({ tipo: 'carrinho' })}
        height={60}
        borderRadius="r20"
        backgroundColor="primary"
        flexDirection="row"
        alignItems="center"
        gap="s12"
        paddingHorizontal="s18"
        style={{
          shadowColor: palette.fabBottom,
          shadowOpacity: 0.55,
          shadowRadius: 15,
          shadowOffset: { width: 0, height: 10 },
          elevation: 10,
        }}
      >
        <Box
          width={30}
          height={30}
          borderRadius="r10"
          backgroundColor="pillGhost"
          alignItems="center"
          justifyContent="center"
        >
          <Text variant="avatarInitials" color="onPrimary">
            {quantidade}
          </Text>
        </Box>

        <Box flex={1}>
          <Text variant="titleSm" color="onPrimary">
            {rotuloDoCarrinho(itens)}
          </Text>
        </Box>

        <Text variant="moneyLg" color="onPrimary">
          {formatarBRL(total)}
        </Text>
      </Toque>
    </Animated.View>
  );
}
