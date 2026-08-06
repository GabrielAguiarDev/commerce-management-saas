import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useAppTheme } from '@hooks/useAppTheme';

import { Toque } from './Toque';

const TRILHO = { largura: 48, altura: 28 };
const KNOB = 22;
const ESQUERDA_DESLIGADO = 3;
const ESQUERDA_LIGADO = 23;
/** 180ms é a `transition: left .18s` do protótipo. */
const DURACAO = 180;

interface InterruptorProps {
  ligado: boolean;
  aoAlternar: () => void;
  rotulo: string;
}

/**
 * Interruptor do design (48×28, knob de 22 com sombra).
 *
 * Não usa o `Switch` do React Native de propósito: o nativo tem dimensões e
 * cores próprias de cada plataforma e não bate com o desenho em nenhuma das
 * duas. Aqui o trilho e o knob são do tema.
 *
 * `useReducedMotion` é respeitado: com "reduzir movimento" ligado no sistema,
 * o knob salta em vez de deslizar.
 */
export function Interruptor({ ligado, aoAlternar, rotulo }: InterruptorProps) {
  const tema = useAppTheme();
  const semMovimento = useReducedMotion();
  const posicao = useSharedValue(ligado ? ESQUERDA_LIGADO : ESQUERDA_DESLIGADO);

  useEffect(() => {
    const destino = ligado ? ESQUERDA_LIGADO : ESQUERDA_DESLIGADO;
    posicao.value = semMovimento ? destino : withTiming(destino, { duration: DURACAO });
  }, [ligado, posicao, semMovimento]);

  const estiloKnob = useAnimatedStyle(() => ({ left: posicao.value }));

  return (
    <Toque
      accessibilityLabel={rotulo}
      accessibilityRole="switch"
      accessibilityState={{ checked: ligado }}
      onPress={aoAlternar}
      width={TRILHO.largura}
      height={TRILHO.altura}
      borderRadius="full"
      backgroundColor={ligado ? 'primary' : 'line'}
      justifyContent="center"
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 3,
            width: KNOB,
            height: KNOB,
            borderRadius: KNOB / 2,
            backgroundColor: tema.colors.white,
            shadowColor: tema.colors.textPrimary,
            shadowOpacity: 0.25,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 1 },
            elevation: 2,
          },
          estiloKnob,
        ]}
      />
    </Toque>
  );
}
