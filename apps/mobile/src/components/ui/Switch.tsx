import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useAppTheme } from '@hooks/useAppTheme';

import { Touchable } from './Touchable';

const TRILHO = { width: 48, height: 28 };
const KNOB = 22;
const ESQUERDA_DESLIGADO = 3;
const ESQUERDA_LIGADO = 23;
/** 180ms é a `transition: left .18s` do protótipo. */
const DURATION = 180;

interface SwitchProps {
  on: boolean;
  onToggle: () => void;
  label: string;
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
export function Switch({ on, onToggle, label }: SwitchProps) {
  const theme = useAppTheme();
  const noMovement = useReducedMotion();
  const position = useSharedValue(on ? ESQUERDA_LIGADO : ESQUERDA_DESLIGADO);

  useEffect(() => {
    const destino = on ? ESQUERDA_LIGADO : ESQUERDA_DESLIGADO;
    position.value = noMovement ? destino : withTiming(destino, { duration: DURATION });
  }, [on, position, noMovement]);

  const estiloKnob = useAnimatedStyle(() => ({ left: position.value }));

  return (
    <Touchable
      accessibilityLabel={label}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      onPress={onToggle}
      width={TRILHO.width}
      height={TRILHO.height}
      borderRadius="full"
      backgroundColor={on ? 'primary' : 'line'}
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
            backgroundColor: theme.colors.white,
            shadowColor: theme.colors.textPrimary,
            shadowOpacity: 0.25,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 1 },
            elevation: 2,
          },
          estiloKnob,
        ]}
      />
    </Touchable>
  );
}
