import { LinearGradient } from 'expo-linear-gradient';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icone } from '@components/ui/Icone';
import { Toque } from '@components/ui/Toque';
import { ROTAS } from '@domain/navigation/rotas';
import { irParaRaiz } from '@hooks/navegacao';
import { useAppTheme } from '@hooks/useAppTheme';
import { palette } from '@theme';
import { useCarrinhoStore } from '@store/carrinhoStore';

import { ALTURA_TAB_BAR } from './BarraDeAbas';

const TAMANHO = 58;

/**
 * O FAB de nova venda.
 *
 * Some em duas situações, exatamente como no protótipo (`mostrarFab`):
 *  - já se está em Vender (não há para onde ir);
 *  - o carrinho tem itens — porque aí quem ocupa aquele espaço é a barra do
 *    carrinho, e dois botões flutuantes no mesmo canto disputariam o polegar.
 */
export function BotaoNovaVenda() {
  const insets = useSafeAreaInsets();
  const caminho = usePathname();
  const temItens = useCarrinhoStore((s) => s.itens.length > 0);
  const tema = useAppTheme();

  if (caminho === ROTAS.vender || temItens) return null;

  return (
    <Toque
      accessibilityLabel="Nova venda"
      // Vender também é raiz no protótipo: chegar nela zera a pilha, venha-se
      // de onde vier.
      onPress={() => irParaRaiz(ROTAS.vender)}
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
        colors={[palette.fabTop, tema.colors.primary, palette.fabBottom]}
        locations={[0, 0.6, 1]}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icone nome="carrinho" tamanho={24} corLiteral={palette.white} />
      </LinearGradient>
    </Toque>
  );
}
