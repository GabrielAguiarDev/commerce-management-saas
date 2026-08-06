import { createBox } from '@shopify/restyle';
import { Pressable, type PressableProps } from 'react-native';

import type { Theme } from '@theme';

const BoxPressable = createBox<Theme, PressableProps & { children?: React.ReactNode }>(Pressable);

export type TouchableProps = React.ComponentProps<typeof BoxPressable> & {
  /** Obrigatório: todo alvo tocável precisa se anunciar ao leitor de tela. */
  accessibilityLabel: string;
};

/**
 * O alvo tocável do app.
 *
 * Duas coisas embutidas de propósito, para não dependerem de disciplina:
 *
 *  - `hitSlop` de 8pt em volta. Vários alvos do design têm 34–38px, abaixo dos
 *    44pt mínimos das diretrizes de acessibilidade; o hitSlop devolve a área
 *    sem mexer no desenho.
 *  - `accessibilityRole="button"` e label obrigatório no tipo. Alvo sem rótulo
 *    é lido como "botão" e nada mais — e o app é usado por gente com pressa,
 *    de dedo grande, em balcão de rua.
 */
export function Touchable({ children, accessibilityLabel, ...props }: TouchableProps) {
  return (
    <BoxPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      // Feedback tátil visual barato e universal: 60% ao pressionar.
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
      {...props}
    >
      {children}
    </BoxPressable>
  );
}
