import { router } from 'expo-router';

import { Button, Box, Text } from '@components';
import { ROUTES } from '@domain/navigation/routes';

/**
 * 404. Existe porque o app tem `scheme` registrado: um deep link com rota
 * errada (`aguiarone://estoqu`) cairia numa tela branca sem isto.
 */
export default function NotFound() {
  return (
    <Box flex={1} backgroundColor="bg" justifyContent="center" paddingHorizontal="s30">
      <Text variant="blockTitle" textAlign="center" marginBottom="s10">
        Não achamos esta tela
      </Text>
      <Text variant="bodyLoose" color="textMuted" textAlign="center" marginBottom="s28">
        O link que você abriu não existe mais ou está com erro de digitação.
      </Text>
      <Button title="Ir para o início" onPress={() => router.replace(ROUTES.entry as never)} />
    </Box>
  );
}
