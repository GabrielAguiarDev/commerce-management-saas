import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Box } from '@components/ui/Box';
import { Text } from '@components/ui/Text';
import { Touchable } from '@components/ui/Touchable';
import { useTranslation } from '@i18n';
import { useCartStore, selectItemCount, selectTotalCents } from '@store/cartStore';
import { useUIStore } from '@store/uiStore';
import { formatBRL } from '@utils/money';
import { palette } from '@theme';

import { AO_UP } from './animations';
import { ALTURA_TAB_BAR } from './TabBar';

/**
 * A barra flutuante do carrinho, logo acima da tab bar.
 *
 * Entra com o `aoUp` do design (14px de baixo + fade em 220ms). Fica visível em
 * QUALQUER tela enquanto houver item — é isso que permite ao balconista
 * conferir estoque no meio da venda sem perder o carrinho.
 */
export function CartBar() {
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const items = useCartStore((s) => s.items);
  const quantity = useCartStore(selectItemCount);
  const total = useCartStore(selectTotalCents);
  const openSheet = useUIStore((s) => s.openSheet);

  if (items.length === 0) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(AO_UP.duration)
        .easing(AO_UP.easing)
        .withInitialValues({ transform: [{ translateY: AO_UP.offset }] })}
      exiting={FadeOut.duration(140)}
      style={{
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: ALTURA_TAB_BAR + insets.bottom + 16,
      }}
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
