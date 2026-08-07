import { useSegments } from 'expo-router';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Box } from '@components/ui/Box';
import { Text } from '@components/ui/Text';
import { Touchable } from '@components/ui/Touchable';
import { useUIStore } from '@store/uiStore';
import { palette } from '@theme';

import { AO_UP } from './animations';
import { ALTURA_TAB_BAR } from './TabBar';

/**
 * O toast, com "Desfazer" opcional.
 *
 * ⚠️ MORA NO LAYOUT RAIZ, e isso é o conserto de um bug que passou despercebido
 * por muito tempo: ele ficava só em `app/(app)/_layout.tsx`, mas `login` e
 * `blocked` estão FORA daquele grupo. Nessas duas telas o `showToast` escrevia
 * na store e nada renderizava — o toque no botão não produzia efeito nenhum.
 *
 * Doeu mais na tela de login, onde o toast é o ÚNICO retorno de erro que
 * existe: senha errada, conta sem negócio e falha de rede eram todas
 * silenciosas, e o sintoma que chegava era "o login não faz nada".
 *
 * Uma instância só, na raiz. Duas (raiz + `(app)`) renderizariam o mesmo toast
 * duplicado dentro do app.
 *
 * O fundo é petrol fixo nos dois temas — decisão do design, registrada em
 * `palette.toast`. Toast de erro vira vermelho.
 */
export function ToastHost() {
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const toast = useUIStore((s) => s.toast);
  const onUndo = useUIStore((s) => s.onUndo);
  const closeToast = useUIStore((s) => s.closeToast);

  /**
   * Dentro do app, o toast fica ACIMA da barra do carrinho (tab bar + barra +
   * folga = 172 no protótipo), para que os três coexistam na tela de venda sem
   * se cobrirem.
   *
   * Em `login` e `blocked` não existe tab bar nem carrinho: manter aquele
   * afastamento deixaria o toast flutuando no meio da tela, longe de qualquer
   * coisa. Aí ele desce para a margem inferior normal.
   */
  const dentroDoApp = segments[0] === '(app)';
  const bottom = dentroDoApp ? ALTURA_TAB_BAR + insets.bottom + 84 : insets.bottom + 24;

  if (!toast) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(AO_UP.duration)
        .easing(AO_UP.easing)
        .withInitialValues({ transform: [{ translateY: AO_UP.offset }] })}
      exiting={FadeOut.duration(160)}
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 14,
        right: 14,
        bottom,
        zIndex: 40,
      }}
      accessibilityLiveRegion="polite"
    >
      <Box
        backgroundColor={toast.tone === 'erro' ? 'danger' : 'toastBg'}
        borderRadius="r18"
        paddingVertical="s14"
        paddingHorizontal="s16"
        flexDirection="row"
        alignItems="center"
        gap="s12"
        style={{
          shadowColor: palette.toast,
          shadowOpacity: 0.7,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 16 },
          elevation: 12,
        }}
      >
        <Box flex={1}>
          <Text variant="rowLabel" color="white" lineHeight={19}>
            {toast.text}
          </Text>
        </Box>

        {toast.withUndo && onUndo ? (
          <Touchable
            accessibilityLabel="Desfazer"
            onPress={() => {
              // Fechar ANTES de executar: o callback normalmente abre o sheet
              // do carrinho, e deixar o toast vivo por baixo dele confunde.
              closeToast();
              onUndo();
            }}
            height={34}
            paddingHorizontal="s13"
            borderRadius="r11"
            backgroundColor="pillGhostSoft"
            alignItems="center"
            justifyContent="center"
          >
            <Text variant="buttonTiny" color="white">
              Desfazer
            </Text>
          </Touchable>
        ) : null}
      </Box>
    </Animated.View>
  );
}
