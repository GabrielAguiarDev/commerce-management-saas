import { Stack } from 'expo-router';

import {
  BarraDeAbas,
  BarraDoCarrinho,
  BotaoNovaVenda,
  Box,
  ConfirmacaoHost,
  SheetHost,
  ToastHost,
} from '@components';
import { useAppTheme } from '@hooks/useAppTheme';

/**
 * O SHELL do app: pilha de navegação + chrome fixa por cima.
 *
 * DECISÃO DE ARQUITETURA — pilha com overlay, e não abas.
 *
 * O protótipo tem tab bar sempre visível E botão voltar em metade das telas
 * (`pilha` + `go()`), o que um `Tabs` do Expo Router não entrega: numa aba não
 * existe pilha para voltar, e telas como Estoque ou Suporte perderiam o header
 * de voltar ou perderiam a tab bar.
 *
 * Aqui a navegação é um `Stack` de verdade — push/pop nativos, gesto de voltar
 * do iOS, `router.canGoBack()` confiável — e a tab bar, o FAB, a barra do
 * carrinho, o toast, o confirm e o sheet são um overlay absoluto irmão da
 * pilha. É a leitura literal do protótipo, onde essa chrome é
 * `position:absolute` sobre o conteúdo rolável.
 *
 * As quatro raízes ZERAM a pilha porque a tab bar usa `router.dismissTo`.
 */
export default function LayoutDoApp() {
  const tema = useAppTheme();

  return (
    <Box flex={1} backgroundColor="bg">
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: tema.colors.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="inicio" options={{ animation: 'none' }} />
        <Stack.Screen name="produtos" options={{ animation: 'none' }} />
        <Stack.Screen name="mais" options={{ animation: 'none' }} />
        <Stack.Screen name="caixa" options={{ animation: 'none' }} />
        <Stack.Screen name="custos" options={{ animation: 'none' }} />
        <Stack.Screen name="vender" />
        <Stack.Screen name="estoque" />
        <Stack.Screen name="relatorios" />
        <Stack.Screen name="config" />
        <Stack.Screen name="suporte" />
      </Stack>

      {/* A chrome. Ordem = ordem de empilhamento: sheet e confirm por último,
          porque precisam cobrir a tab bar e o FAB. */}
      <BarraDeAbas />
      <BotaoNovaVenda />
      <BarraDoCarrinho />
      <SheetHost />
      <ConfirmacaoHost />
      <ToastHost />
    </Box>
  );
}
