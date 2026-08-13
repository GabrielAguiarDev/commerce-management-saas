import { Box, type BoxProps } from './Box';

/**
 * A MARGEM LATERAL da tela, aplicada pelo CONTEÚDO.
 *
 * A raiz da tela não tem padding horizontal (ver `padding-layout.md`): quem
 * tem é cada bloco, e é este componente que o dá. A inversão existe por causa
 * do que ROLA na horizontal — com o padding na raiz, a fileira de chips e a
 * barra de abas de Configurações eram cortadas na borda do padding e não na
 * borda da tela, deixando uma faixa morta de 16px de cada lado por onde o
 * conteúdo desaparecia cedo demais.
 *
 * Este componente é para o conteúdo ESTÁTICO. Quem rola na horizontal não o
 * usa: leva o mesmo `theme.spacing.screen` no próprio `contentContainerStyle`,
 * que é o que permite ao conteúdo sangrar até a borda real mantendo o primeiro
 * e o último item no mesmo prumo dos blocos de cima e de baixo.
 *
 * Numa tela em que NADA rola na horizontal, não é preciso envolver bloco por
 * bloco: `<Screen padded>` faz o mesmo de uma vez.
 */
export function Gutter({ children, ...props }: BoxProps) {
  return (
    <Box paddingHorizontal="screen" {...props}>
      {children}
    </Box>
  );
}
