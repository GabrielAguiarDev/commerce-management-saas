import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Box, type BoxProps } from '@components/ui/Box';

import { AO_PULSE } from '@components/patterns/animations';

interface SkeletonProps extends BoxProps {
  /** Altura do bloco. O resto do desenho vem das props de `Box`. */
  height: number;
}

/**
 * O LUGAR DE UM DADO QUE AINDA NÃO CHEGOU.
 *
 * Existe por uma regra de navegação, não de estilo: **carregamento de dados
 * nunca esconde a tela nem a tab bar.** Uma tela que troca todo o corpo por um
 * spinner (ou por nada) faz a navegação parecer que sumiu — e o usuário não
 * distingue "os dados estão vindo" de "o app travou".
 *
 * Então o esqueleto ocupa o espaço EXATO do conteúdo que vem, dentro da área de
 * conteúdo, com header e barra já desenhados ao redor. Quando o dado chega, ele
 * troca de lugar sem empurrar nada.
 *
 * Pulsa com o mesmo ritmo do ponto do banner de conexão (`AO_PULSE`) — e para
 * de pulsar quando o sistema pede movimento reduzido, porque animação infinita
 * é a que mais incomoda quem tem sensibilidade vestibular.
 */
export function Skeleton({
  height,
  borderRadius = 'r12',
  // Sobre o card petrol o cinza do tema desaparece; ali a Home passa
  // `pillOnPetrol`. Por isso a cor é sobrescrevível, com um padrão sensato.
  backgroundColor = 'surface2',
  ...rest
}: SkeletonProps) {
  const noMovement = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (noMovement) {
      opacity.value = 1;
      return;
    }
    opacity.value = withRepeat(
      withTiming(AO_PULSE.minOpacity, { duration: AO_PULSE.meioCiclo }),
      -1,
      true,
    );
  }, [noMovement, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={style} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Box height={height} borderRadius={borderRadius} backgroundColor={backgroundColor} {...rest} />
    </Animated.View>
  );
}
