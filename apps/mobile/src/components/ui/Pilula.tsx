import type { TextVariant, ThemeColor } from '@theme';

import { Box } from './Box';
import { Text } from './Text';

interface PilulaProps {
  texto: string;
  corDeFundo?: ThemeColor;
  corDoTexto?: ThemeColor;
  variante?: TextVariant;
  paddingH?: number;
  paddingV?: number;
}

/**
 * O selo arredondado: badge de estoque, status de chamado, "18 vendas".
 * Sempre com raio total — no design não existe selo de canto quadrado.
 */
export function Pilula({
  texto,
  corDeFundo = 'surface2',
  corDoTexto = 'textMuted',
  variante = 'badge',
  paddingH = 9,
  paddingV = 3,
}: PilulaProps) {
  return (
    <Box
      backgroundColor={corDeFundo}
      borderRadius="full"
      style={{ paddingHorizontal: paddingH, paddingVertical: paddingV }}
      alignSelf="flex-start"
    >
      <Text variant={variante} color={corDoTexto}>
        {texto}
      </Text>
    </Box>
  );
}
