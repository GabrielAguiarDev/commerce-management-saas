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

import { AppProviders } from '@components';
import { useAppHydrated } from '@hooks/useAppHydrated';
import { useMonitorDeConexao } from '@hooks/useMonitorDeConexao';
import { usePreferenciasStore } from '@store/preferenciasStore';
import { darkTheme, lightTheme } from '@theme';

// Segura a splash nativa até fontes E stores estarem prontos. Fora do
// componente porque precisa rodar antes do primeiro render.
void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 260, fade: true });

export default function LayoutRaiz() {
  const [fontesCarregadas, erroDeFonte] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  // Falha de fonte NÃO pode prender o app na splash: sem a Manrope o texto sai
  // na fonte do sistema, o que é feio mas utilizável — melhor que tela preta.
  const fontesProntas = fontesCarregadas || erroDeFonte !== null;

  return (
    <AppProviders>
      <Chrome fontesProntas={fontesProntas} />
    </AppProviders>
  );
}

/**
 * Precisa ser um componente separado: os hooks abaixo leem stores e tema, e
 * `AppProviders` só existe a partir daqui para dentro.
 */
function Chrome({ fontesProntas }: { fontesProntas: boolean }) {
  const hidratado = useAppHydrated();
  const temaEscuro = usePreferenciasStore((s) => s.temaEscuro);
  const tema = temaEscuro ? darkTheme : lightTheme;

  useMonitorDeConexao();

  const esconderSplash = useCallback(() => {
    if (fontesProntas && hidratado) void SplashScreen.hideAsync();
  }, [fontesProntas, hidratado]);

  useEffect(esconderSplash, [esconderSplash]);

  if (!fontesProntas || !hidratado) return null;

  return (
    <>
      <StatusBar style={temaEscuro ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          // O header é desenhado pelo `Screen` (título, subtítulo, avatar e
          // voltar), então o nativo fica desligado no app inteiro.
          contentStyle: { backgroundColor: tema.colors.bg },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
        <Stack.Screen name="bloqueio" options={{ animation: 'fade' }} />
        <Stack.Screen name="(app)" options={{ animation: 'fade' }} />
      </Stack>
    </>
  );
}
