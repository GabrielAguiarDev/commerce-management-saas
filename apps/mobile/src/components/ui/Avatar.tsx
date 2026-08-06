import { Box } from './Box';
import { Text } from './Text';

interface AvatarProps {
  iniciais: string;
  tamanho?: number;
}

/** Círculo teal claro com as iniciais. Header e lista de equipe usam o mesmo. */
export function Avatar({ iniciais, tamanho = 38 }: AvatarProps) {
  return (
    <Box
      width={tamanho}
      height={tamanho}
      borderRadius="full"
      backgroundColor="primarySoft"
      alignItems="center"
      justifyContent="center"
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Avatar de ${iniciais}`}
    >
      <Text variant="avatarInitials" color="primary">
        {iniciais}
      </Text>
    </Box>
  );
}
