import { router, usePathname } from 'expo-router';

import { Button, Box, Text } from '@components';
import { ROUTES } from '@domain/navigation/routes';
import { useTranslation } from '@i18n';

/**
 * 404. Existe porque o app tem `scheme` registrado: um deep link com rota
 * errada (`aguiarone://estoqu`) cairia numa tela branca sem isto.
 */
export default function NotFound() {
  const pathname = usePathname();
  const t = useTranslation();

  // Em desenvolvimento, diz no Metro QUAL rota não existe. Sem isto, cair aqui
  // não deixa rastro nenhum — foi preciso instrumentar a tela para descobrir
  // que era efeito do Fast Refresh, e não um link quebrado.
  if (__DEV__) console.warn(`[404] rota não encontrada: ${pathname}`);
  return (
    <Box flex={1} backgroundColor="bg" justifyContent="center" paddingHorizontal="screen">
      <Text variant="blockTitle" textAlign="center" marginBottom="s10">
        {t.notFound.title}
      </Text>
      <Text variant="bodyLoose" color="textMuted" textAlign="center" marginBottom="s28">
        {t.notFound.text}
      </Text>
      <Button title={t.notFound.goHome} onPress={() => router.replace(ROUTES.entry as never)} />
    </Box>
  );
}
