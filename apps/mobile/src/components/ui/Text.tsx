import { createText } from '@shopify/restyle';

import type { Theme } from '@theme';

/**
 * Primitivo tipográfico.
 *
 * Use SEMPRE `variant` — nunca `fontSize`/`fontWeight` soltos. Em React
 * Native, `fontWeight` não escolhe o arquivo certo de uma família carregada em
 * runtime: cada peso da Manrope é uma família própria, e as variantes do tema
 * já declaram a `fontFamily` correta. Passar `fontWeight="bold"` aqui renderiza
 * a Manrope Medium com falso-negrito do sistema.
 */
export const Text = createText<Theme>();

export type TextProps = React.ComponentProps<typeof Text>;
