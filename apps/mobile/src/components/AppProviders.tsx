import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ThemeProvider } from '@shopify/restyle';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useSessionSync } from '@hooks/useSessionSync';
import { usePreferencesStore } from '@store/preferencesStore';
import { darkTheme, lightTheme } from '@theme';

/**
 * A composição ÚNICA de providers do app.
 *
 * Ordem importa:
 *  1. `GestureHandlerRootView` precisa ser a raiz — sem ela o arrasto de
 *     fechar o bottom sheet simplesmente não recebe evento no Android.
 *  2. `SafeAreaProvider` antes de qualquer tela: `useSafeAreaInsets` é usado
 *     pelo Screen, pela tab bar, pelo FAB e pelo toast.
 *  3. `ThemeProvider` antes do resto, para que a troca de tema não remonte a
 *     árvore de navegação.
 *  4. `BottomSheetModalProvider` por ÚLTIMO, e não em volta de tudo: ele é o
 *     host do portal onde os bottom sheets são renderizados de fato. Como o
 *     `@gorhom/portal` monta o nó na posição do host, o contexto que o
 *     conteúdo do sheet enxerga é o daqui — se o provider ficasse acima do
 *     `ThemeProvider`, os sheets ficariam sem tema, sem query client e sem
 *     safe area.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const isDark = usePreferencesStore((s) => s.darkTheme);
  const theme = useMemo(() => (isDark ? darkTheme : lightTheme), [isDark]);

  // A sessão do Supabase, restaurada no boot e vigiada daí em diante. Fica
  // aqui, no provider, porque precisa existir uma única inscrição para o app
  // inteiro — em componente de tela, remontaria a cada navegação.
  useSessionSync();

  // `useState` e não módulo: um QueryClient no escopo do módulo sobrevive ao
  // Fast Refresh com cache de outra sessão e produz bugs fantasma em dev.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cada useCase declara o próprio `staleTime`; este é só o piso.
            staleTime: 30 * 1000,
            retry: 1,
            // Reconsultar ao voltar para o app é o comportamento certo num app
            // de balcão: o dado pode ter mudado no portal enquanto isso.
            refetchOnWindowFocus: true,
          },
          mutations: { retry: 0 },
        },
      }),
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={client}>
          <ThemeProvider theme={theme}>
            <BottomSheetModalProvider>{children}</BottomSheetModalProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
