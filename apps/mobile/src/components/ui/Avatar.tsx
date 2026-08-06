import { Box } from './Box';
import { Text } from './Text';

interface AvatarProps {
  initials: string;
  size?: number;
}

/** Círculo teal claro com as iniciais. Header e lista de equipe usam o mesmo. */
export function Avatar({ initials, size = 38 }: AvatarProps) {
  return (
    <Box
      width={size}
      height={size}
      borderRadius="full"
      backgroundColor="primarySoft"
      alignItems="center"
      justifyContent="center"
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Avatar de ${initials}`}
    >
      <Text variant="avatarInitials" color="primary">
        {initials}
      </Text>
    </Box>
  );
}
