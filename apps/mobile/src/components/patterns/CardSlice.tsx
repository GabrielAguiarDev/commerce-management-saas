import type { ReactNode } from 'react';

import { Box } from '@components/ui/Box';
import { Divider } from '@components/ui/Divider';
import { useAppTheme } from '@hooks/useAppTheme';
import type { Theme } from '@theme';

/**
 * UMA LINHA de um cartão que foi fatiado para caber numa lista virtualizada.
 *
 * Numa `FlashList` cada linha é um item reciclado à parte — um cartão com N
 * linhas dentro não pode ser um único elemento. Cada fatia desenha só a sua
 * parte da moldura: a primeira leva a borda e os cantos de cima, a última os
 * de baixo, e toda fatia depois da primeira abre com a divisória. Lado a lado,
 * elas são o mesmo `Card` de antes.
 */
export function CardSlice({
  first,
  last,
  paddingHorizontal = 's16',
  paddingVertical = 's4',
  children,
}: {
  first: boolean;
  last: boolean;
  paddingHorizontal?: keyof Theme['spacing'];
  /** O respiro de cima (na primeira) e de baixo (na última). */
  paddingVertical?: keyof Theme['spacing'];
  children: ReactNode;
}) {
  // O mesmo raio do `Card` que as fatias recompõem.
  const radius = useAppTheme().borderRadii.r20;

  return (
    <Box
      backgroundColor="surface"
      borderColor="line"
      borderLeftWidth={1}
      borderRightWidth={1}
      borderTopWidth={first ? 1 : 0}
      borderBottomWidth={last ? 1 : 0}
      paddingHorizontal={paddingHorizontal}
      paddingTop={first ? paddingVertical : undefined}
      paddingBottom={last ? paddingVertical : undefined}
      style={{
        borderTopLeftRadius: first ? radius : 0,
        borderTopRightRadius: first ? radius : 0,
        borderBottomLeftRadius: last ? radius : 0,
        borderBottomRightRadius: last ? radius : 0,
      }}
    >
      {first ? null : <Divider />}
      {children}
    </Box>
  );
}
