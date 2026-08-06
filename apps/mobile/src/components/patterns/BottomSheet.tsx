import type { ReactNode } from 'react';
import { Dimensions, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Box } from '@components/ui/Box';
import { Text } from '@components/ui/Text';
import { Toque } from '@components/ui/Toque';

import { AO_FADE, AO_SHEET } from './animacoes';

/** 82% da tela, como no protótipo (`max-height:82%`). */
const ALTURA_MAXIMA = Dimensions.get('window').height * 0.82;
/** Arrasto além disto fecha o sheet ao soltar. */
const LIMIAR_FECHAR = 90;

/**
 * A entrada `aoSheet`. Definida FORA do componente de propósito: um
 * `LayoutAnimationConfig` recriado a cada render faria a animação reiniciar em
 * toda atualização de estado do sheet — digitar num campo, por exemplo.
 */
const SLIDE_DE_BAIXO = SlideInDown.duration(AO_SHEET.duracao).easing(AO_SHEET.easing);

interface BottomSheetProps {
  titulo: string;
  aoFechar: () => void;
  children: ReactNode;
}

/**
 * O bottom sheet do app.
 *
 * Implementado à mão em vez de `Modal` nativo ou rota `transparentModal` por
 * dois motivos concretos:
 *
 *  1. O sheet do carrinho precisa reabrir a partir do "Desfazer" do TOAST, que
 *     vive fora da pilha de navegação. Como rota, isso exigiria empurrar uma
 *     rota a partir de um componente global — e no iOS tudo o que é empilhado
 *     DEPOIS de um modal também é apresentado como modal, o que quebraria a
 *     navegação seguinte.
 *  2. O design pede o mesmo desenho de sheet nos cinco casos, com a chrome do
 *     app viva por baixo. Um overlay dentro do layout entrega isso de graça.
 *
 * Como `gestureEnabled` do navegador não vale aqui, o gesto de saída é
 * responsabilidade deste componente: arrastar para baixo fecha, e o arrasto
 * acompanha o dedo. Sheet sem gesto de saída é sheet que só fecha no ✕.
 */
export function BottomSheet({ titulo, aoFechar, children }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const semMovimento = useReducedMotion();
  const deslocamento = useSharedValue(0);

  const arrastar = Gesture.Pan()
    .onChange((evento) => {
      // Só para baixo: puxar para cima não estica o sheet.
      deslocamento.value = Math.max(0, deslocamento.value + evento.changeY);
    })
    .onEnd((evento) => {
      const rapido = evento.velocityY > 800;
      if (deslocamento.value > LIMIAR_FECHAR || rapido) {
        runOnJS(aoFechar)();
      } else {
        deslocamento.value = withTiming(0, { duration: 160 });
      }
    });

  const estilo = useAnimatedStyle(() => ({
    transform: [{ translateY: deslocamento.value }],
  }));

  return (
    <Box position="absolute" top={0} left={0} right={0} bottom={0} justifyContent="flex-end">
      <Animated.View
        entering={FadeIn.duration(AO_FADE.duracao)}
        exiting={FadeOut.duration(AO_FADE.duracao)}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      >
        <Toque accessibilityLabel="Fechar" onPress={aoFechar} flex={1} backgroundColor="scrimSheet" />
      </Animated.View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <GestureDetector gesture={arrastar}>
          <Animated.View
            // O `aoSheet` do design: sobe de baixo com cubic-bezier(.2,.8,.25,1).
            // Com "reduzir movimento" ligado, aparece com fade e sem deslocar.
            entering={semMovimento ? FadeIn.duration(AO_FADE.duracao) : SLIDE_DE_BAIXO}
            exiting={FadeOut.duration(AO_SHEET.duracaoSaida)}
            style={estilo}
          >
            <Box
              backgroundColor="surface"
              borderTopLeftRadius="r28"
              borderTopRightRadius="r28"
              paddingTop="s10"
              paddingHorizontal="s18"
              style={{ paddingBottom: 26 + insets.bottom, maxHeight: ALTURA_MAXIMA }}
            >
              <Box
                width={44}
                height={5}
                borderRadius="full"
                backgroundColor="line"
                alignSelf="center"
                marginBottom="s14"
              />

              <Box flexDirection="row" alignItems="center" gap="s10" marginBottom="s14">
                <Box flex={1}>
                  <Text variant="sheetTitle" accessibilityRole="header">
                    {titulo}
                  </Text>
                </Box>
                <Toque
                  accessibilityLabel="Fechar"
                  onPress={aoFechar}
                  width={34}
                  height={34}
                  borderRadius="r11"
                  borderWidth={1}
                  borderColor="line"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text variant="rowLabel" color="textMuted">
                    ✕
                  </Text>
                </Toque>
              </Box>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {children}
              </ScrollView>
            </Box>
          </Animated.View>
        </GestureDetector>
      </KeyboardAvoidingView>
    </Box>
  );
}
