import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Box } from '@components/ui/Box';
import { useAppTheme } from '@hooks/useAppTheme';

import { ESPACO_INFERIOR_INTERNO } from './Screen';

/**
 * O conteúdo de UMA aba superior.
 *
 * Numa tela de abas superiores o `Screen` não pode rolar: quem rola é cada aba,
 * por dentro. Se a rolagem ficasse por fora, o gesto vertical do `ScrollView` e
 * o gesto horizontal do pager disputariam o mesmo dedo, e a posição de rolagem
 * de uma aba viajaria para as outras.
 *
 * Daí este componente: dá a cada aba a sua própria rolagem, com o mesmo
 * espaçamento entre cartões e a mesma sobra no rodapé que o `Screen` reserva nas
 * telas internas — a barra do carrinho pode subir sobre qualquer uma delas.
 */
export function TabPane({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  return (
    <ScrollView
      style={{ flex: 1 }}
      // O gutter vem daqui, e não da raiz da tela: é o `Screen` que deixou de
      // aplicá-lo para a BARRA de abas poder sangrar até a borda. Cada aba
      // recoloca a margem no próprio conteúdo, no content container junto do
      // padding vertical — nunca no `style`, que recortaria a rolagem.
      contentContainerStyle={{
        paddingTop: 14,
        paddingBottom: ESPACO_INFERIOR_INTERNO + insets.bottom,
        paddingHorizontal: theme.spacing.screen,
      }}
      // O formulário de Negócio tem teclado aberto quando o dedo chega no
      // "Salvar": sem isto o primeiro toque só fecharia o teclado.
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Box gap="s12">{children}</Box>
    </ScrollView>
  );
}
