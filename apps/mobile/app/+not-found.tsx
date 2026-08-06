import { router } from 'expo-router';

import { Botao, Box, Text } from '@components';
import { ROTAS } from '@domain/navigation/rotas';

/**
 * 404. Existe porque o app tem `scheme` registrado: um deep link com rota
 * errada (`aguiarone://estoqu`) cairia numa tela branca sem isto.
 */
export default function NaoEncontrado() {
  return (
    <Box flex={1} backgroundColor="bg" justifyContent="center" paddingHorizontal="s30">
      <Text variant="blockTitle" textAlign="center" marginBottom="s10">
        Não achamos esta tela
      </Text>
      <Text variant="bodyLoose" color="textMuted" textAlign="center" marginBottom="s28">
        O link que você abriu não existe mais ou está com erro de digitação.
      </Text>
      <Botao titulo="Ir para o início" aoTocar={() => router.replace(ROTAS.entrada as never)} />
    </Box>
  );
}
