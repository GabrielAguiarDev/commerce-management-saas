import { ThemeProvider } from '@shopify/restyle';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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
 *  3. `ThemeProvider` por último, para que a troca de tema não remonte a
 *     árvore de navegação.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const isDark = usePreferencesStore((s) => s.darkTheme);
  const theme = useMemo(() => (isDark ? darkTheme : lightTheme), [isDark]);

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
          <ThemeProvider theme={theme}>{children}</ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
