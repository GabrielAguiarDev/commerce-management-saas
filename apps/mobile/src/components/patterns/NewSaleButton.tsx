import { LinearGradient } from 'expo-linear-gradient';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@components/ui/Icon';
import { Touchable } from '@components/ui/Touchable';
import { ROUTES } from '@domain/navigation/routes';
import { goToRoot } from '@hooks/navigation';
import { useAppTheme } from '@hooks/useAppTheme';
import { palette } from '@theme';
import { useCartStore } from '@store/cartStore';

import { ALTURA_TAB_BAR } from './TabBar';

const TAMANHO = 58;

/**
 * O FAB de nova venda.
 *
 * Some em duas situações, exatamente como no protótipo (`mostrarFab`):
 *  - já se está em Vender (não há para onde ir);
 *  - o carrinho tem itens — porque aí quem ocupa aquele espaço é a barra do
 *    carrinho, e dois botões flutuantes no mesmo canto disputariam o polegar.
 */
export function NewSaleButton() {
  const insets = useSafeAreaInsets();
  const path = usePathname();
  const hasItems = useCartStore((s) => s.items.length > 0);
  const theme = useAppTheme();

  if (path === ROUTES.sell || hasItems) return null;

  return (
    <Touchable
      accessibilityLabel="Nova venda"
      // Vender também é raiz no protótipo: chegar nela zera a pilha, venha-se
      // de onde vier.
      onPress={() => goToRoot(ROUTES.sell)}
      position="absolute"
      right={18}
      style={{
        bottom: ALTURA_TAB_BAR + insets.bottom + 16,
        shadowColor: palette.fabBottom,
        shadowOpacity: 0.5,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
      }}
      width={TAMANHO}
      height={TAMANHO}
      borderRadius="full"
      overflow="hidden"
    >
      <LinearGradient
        // O gradiente do design: #149ba6 → teal do tema → #0b6b74. O tom do
        // meio vem do tema para acompanhar claro/escuro; as pontas são fixas.
        colors={[palette.fabTop, theme.colors.primary, palette.fabBottom]}
        locations={[0, 0.6, 1]}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="cart" size={24} colorOverride={palette.white} />
      </LinearGradient>
    </Touchable>
  );
}
