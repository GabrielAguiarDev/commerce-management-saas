import { createBox } from '@shopify/restyle';

import type { Theme } from '@theme';

/**
 * Primitivo de layout. Todo espaçamento, cor de fundo, borda e raio do app
 * passa por aqui — é o que garante que nenhum valor mágico entre em cena.
 */
export const Box = createBox<Theme>();

export type BoxProps = React.ComponentProps<typeof Box>;
