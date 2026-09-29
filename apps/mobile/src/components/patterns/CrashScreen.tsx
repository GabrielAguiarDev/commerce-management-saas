import { Box } from '@components/ui/Box';
import { Button } from '@components/ui/Button';
import { Icon } from '@components/ui/Icon';
import { Text } from '@components/ui/Text';
import { useTranslation } from '@i18n';

/**
 * A TELA DE QUEDA — o que o `ErrorBoundary` das rotas mostra quando uma tela
 * lança durante a renderização.
 *
 * Sem ela, o erro derrubava a árvore inteira: em produção, tela branca; em
 * desenvolvimento, a tela vermelha. Aqui a pessoa tem dois caminhos — tentar a
 * mesma tela de novo ou voltar para o início — e o erro já foi entregue ao
 * `reportCrash` por quem montou esta tela.
 *
 * Irmã da `StartupError`, e não a mesma: aquela diz "não consegui verificar o
 * seu plano" e oferece suporte e sair; esta diz "esta tela quebrou", que é bug
 * nosso, e o caminho útil é seguir usando o resto do app.
 */
export function CrashScreen({
  onRetry,
  onGoHome,
}: {
  onRetry: () => void;
  onGoHome: () => void;
}) {
  const t = useTranslation();

  return (
    <Box flex={1} backgroundColor="bg" justifyContent="center" paddingHorizontal="screen">
      <Box
        width={76}
        height={76}
        borderRadius="r26"
        backgroundColor="warningSoft"
        alignSelf="center"
        alignItems="center"
        justifyContent="center"
        marginBottom="s22"
      >
        <Icon name="alert" size={34} color="warning" />
      </Box>

      <Text variant="blockTitle" textAlign="center" marginBottom="s10" accessibilityRole="header">
        {t.crash.title}
      </Text>

      <Text variant="bodyLoose" color="textMuted" textAlign="center" marginBottom="s28">
        {t.crash.text}
      </Text>

      <Button title={t.crash.retry} onPress={onRetry} height={54} radius={16} />

      <Box marginTop="s10">
        <Button
          title={t.crash.goHome}
          onPress={onGoHome}
          variant="contorno"
          textColor="textPrimary"
          height={50}
          radius={16}
          textVariant="buttonSm"
        />
      </Box>
    </Box>
  );
}
