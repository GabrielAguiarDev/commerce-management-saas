import { Box, type BoxProps } from './Box';

/**
 * A superfície branca com borda fina e canto arredondado que sustenta quase
 * toda a interface. Raio 20 é o padrão dos cards de conteúdo; listas usam 18 e
 * blocos grandes, 22 — passe `borderRadius` quando for um desses.
 */
export function Card({ children, ...props }: BoxProps) {
  return (
    <Box
      backgroundColor="surface"
      borderColor="line"
      borderWidth={1}
      borderRadius="r20"
      padding="s16"
      {...props}
    >
      {children}
    </Box>
  );
}
