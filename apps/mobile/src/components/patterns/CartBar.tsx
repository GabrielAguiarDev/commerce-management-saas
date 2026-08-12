import Animated, {
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Box } from '@components/ui/Box';
import { Text } from '@components/ui/Text';
import { Touchable } from '@components/ui/Touchable';
import { useOnTabScreen } from '@hooks/navigation';
import { useTranslation } from '@i18n';
import { useCartStore, selectItemCount, selectTotalCents } from '@store/cartStore';
import { useUIStore } from '@store/uiStore';
import { formatBRL } from '@utils/money';
import { palette } from '@theme';

import { AO_UP } from './animations';
import { ALTURA_TAB_BAR } from './TabBar';

/** A folga entre a barra e o que estiver embaixo dela. */
const FOLGA = 16;

/**
 * A barra flutuante do carrinho.
 *
 * Entra com o `aoUp` do design (14px de baixo + fade em 220ms). Fica visível em
 * QUALQUER tela enquanto houver item — é isso que permite ao balconista
 * conferir estoque no meio da venda sem perder o carrinho. Por isso ela mora no
 * layout de `(app)`, sobre a pilha inteira, e não no grupo `(tabs)`: some-la em
 * Vender seria escondê-la exatamente onde ela é usada.
 *
 * O QUE ESTÁ EMBAIXO DELA MUDA DE TELA PARA TELA. Nas abas, a tab bar; nas
 * telas internas (Vender, Estoque, Configurações…), nada, porque a barra de
 * navegação não sobe até lá. Somar os 88px em todo lugar deixaria a barra do
 * carrinho boiando sobre um rodapé vazio nas telas internas.
 *
 * E a mudança é ANIMADA porque ela acontece durante uma transição de tela: ir
 * de uma aba para Vender com o carrinho cheio move este rodapé 88px de uma vez,
 * e sem interpolar isso vira um solavanco no meio do slide. Mesma duração e
 * mesma curva do `aoUp` com que a barra entra.
 */
export function CartBar() {
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const onTab = useOnTabScreen();
  const items = useCartStore((s) => s.items);
  const quantity = useCartStore(selectItemCount);
  const total = useCartStore(selectTotalCents);
  const openSheet = useUIStore((s) => s.openSheet);

  const bottom = (onTab ? ALTURA_TAB_BAR : 0) + insets.bottom + FOLGA;

  // Antes do `return null`: a ordem dos hooks não pode depender do carrinho.
  const posicao = useAnimatedStyle(() => ({
    bottom: withTiming(bottom, { duration: AO_UP.duration, easing: AO_UP.easing }),
  }));

  if (items.length === 0) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(AO_UP.duration)
        .easing(AO_UP.easing)
        .withInitialValues({ transform: [{ translateY: AO_UP.offset }] })}
      exiting={FadeOut.duration(140)}
      style={[{ position: 'absolute', left: 12, right: 12 }, posicao]}
    >
      <Touchable
        accessibilityLabel={`Abrir carrinho: ${t.cart.summary(quantity)}, total ${formatBRL(total)}`}
        onPress={() => openSheet({ type: 'cart' })}
        height={60}
        borderRadius="r20"
        backgroundColor="primary"
        flexDirection="row"
        alignItems="center"
        gap="s12"
        paddingHorizontal="s18"
        style={{
          shadowColor: palette.primaryShadow,
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
            {quantity}
          </Text>
        </Box>

        <Box flex={1}>
          <Text variant="titleSm" color="onPrimary">
            {t.cart.summary(quantity)}
          </Text>
        </Box>

        <Text variant="moneyLg" color="onPrimary">
          {formatBRL(total)}
        </Text>
      </Touchable>
    </Animated.View>
  );
}
