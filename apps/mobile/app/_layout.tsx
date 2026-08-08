import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect } from 'react';

import { AppProviders, Box, ToastHost } from '@components';
import { useAppHydrated } from '@hooks/useAppHydrated';
import { useConnectionMonitor } from '@hooks/useConnectionMonitor';
import { usePreferencesStore } from '@store/preferencesStore';
import { darkTheme, lightTheme } from '@theme';

// Segura a splash nativa até fontes E stores estarem prontos. Fora do
// componente porque precisa rodar antes do primeiro render.
void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 260, fade: true });

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  // Falha de fonte NÃO pode prender o app na splash: sem a Manrope o texto sai
  // na fonte do sistema, o que é feio mas utilizável — melhor que tela preta.
  const fontsReady = fontsLoaded || fontError !== null;

  return (
    <AppProviders>
      <Chrome fontsReady={fontsReady} />
    </AppProviders>
  );
}

/**
 * Precisa ser um componente separado: os hooks abaixo leem stores e tema, e
 * `AppProviders` só existe a partir daqui para dentro.
 */
function Chrome({ fontsReady }: { fontsReady: boolean }) {
  const hydrated = useAppHydrated();
  const isDark = usePreferencesStore((s) => s.darkTheme);
  const theme = isDark ? darkTheme : lightTheme;

  useConnectionMonitor();

  const hideSplash = useCallback(() => {
    if (fontsReady && hydrated) void SplashScreen.hideAsync();
  }, [fontsReady, hydrated]);

  useEffect(hideSplash, [hideSplash]);

  if (!fontsReady || !hydrated) return null;

  return (
    <Box flex={1} backgroundColor="bg">
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          // O header é desenhado pelo `Screen` (título, subtítulo, avatar e
          // voltar), então o nativo fica desligado no app inteiro.
          contentStyle: { backgroundColor: theme.colors.bg },

          // SLIDE, e não `fade`, no stack inteiro — a mesma animação que
          // `(app)` já usa entre as telas internas. São as três trocas mais
          // pesadas do app (entrar, sair, ser bloqueado) e eram as únicas que
          // dissolviam: o fade parecia lento porque tem que apagar uma tela
          // ANTES de a outra existir, enquanto o slide mostra as duas ao mesmo
          // tempo e termina na mesma duração parecendo metade.
          //
          // `slide_from_right` é o empurrão NATIVO do iOS — o paralaxe e a
          // sombra de borda vêm de graça do sistema.
          animation: 'slide_from_right',

          // Todas as trocas daqui são `replace` (o login não pode voltar por
          // gesto, e sair também não), e o padrão do react-native-screens para
          // um `replace` é animar como `pop` — o slide viria da ESQUERDA, com
          // sensação de "voltar". `push` mantém a direção padrão.
          animationTypeForReplace: 'push',
        }}
      >
        {/* Rota de PASSAGEM: renderiza `null` e redireciona. Animá-la faria a
            entrada no app custar DUAS transições encadeadas — uma para chegar
            aqui, outra para sair. Ver o cabeçalho de `index.tsx`. */}
        <Stack.Screen name="index" options={{ animation: 'none' }} />

        <Stack.Screen name="login" />
        <Stack.Screen name="blocked" />
        <Stack.Screen name="(app)" />
      </Stack>

      {/* O toast fica AQUI, e não no layout de `(app)`, porque `login` e
          `blocked` também o usam e estão fora daquele grupo. Era o motivo de
          os erros de login não aparecerem: a store recebia o toast e nada o
          renderizava. Ver o comentário em ToastHost. */}
      <ToastHost />
    </Box>
  );
}
