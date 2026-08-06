import type { TextVariant, ThemeColor } from '@theme';

import { Box } from './Box';
import { Text } from './Text';

interface PillProps {
  text: string;
  backgroundColor?: ThemeColor;
  textColor?: ThemeColor;
  variant?: TextVariant;
  paddingX?: number;
  paddingY?: number;
}

/**
 * O selo arredondado: badge de estoque, status de chamado, "18 vendas".
 * Sempre com raio total — no design não existe selo de canto quadrado.
 */
export function Pill({
  text,
  backgroundColor = 'surface2',
  textColor = 'textMuted',
  variant = 'badge',
  paddingX = 9,
  paddingY = 3,
}: PillProps) {
  return (
    <Box
      backgroundColor={backgroundColor}
      borderRadius="full"
      style={{ paddingHorizontal: paddingX, paddingVertical: paddingY }}
      alignSelf="flex-start"
    >
      <Text variant={variant} color={textColor}>
        {text}
      </Text>
    </Box>
  );
}
