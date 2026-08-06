import { useTheme } from '@shopify/restyle';

import type { Theme } from '@theme';

/**
 * `useTheme` já tipado com o tema do app.
 *
 * Existe para que nenhum componente escreva `useTheme<Theme>()` e, um dia,
 * alguém esqueça o genérico e perca a checagem de token de cor.
 */
export const useAppTheme = () => useTheme<Theme>();
