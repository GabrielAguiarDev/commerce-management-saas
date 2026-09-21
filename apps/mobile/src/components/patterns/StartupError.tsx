import { Box } from '@components/ui/Box';
import { Button } from '@components/ui/Button';
import { Icon } from '@components/ui/Icon';
import { Text } from '@components/ui/Text';
import { useTranslation } from '@i18n';

/**
 * A TELA DE FALHA NA ABERTURA.
 *
 * Existe por causa de um bug real: o portão devolvia `null` enquanto não sabia
 * se o plano inclui o app, e uma falha na consulta o deixava sem saber PARA
 * SEMPRE. O app ficava numa tela em branco, sem rota e sem mensagem — o
 * usuário só via o app "não abrir".
 *
 * A regra que esta tela representa: **o portão nunca pode renderizar nada
 * indefinidamente.** Ou ele sabe para onde ir, ou ele diz por que não sabe e
 * oferece um caminho. Uma tela de erro com botão é sempre melhor que uma espera
 * infinita, mesmo quando a causa é temporária.
 *
 * Não é a tela de bloqueio (`/blocked`): aquela diz "seu plano não inclui", uma
 * afirmação sobre o contrato do cliente. Esta diz "não consegui verificar", que
 * é uma afirmação sobre nós.
 *
 * Ela cobre as duas cargas de entrada: o entitlement do app e o plano (tenant +
 * módulos). O plano falhando já abriu o app sem nenhum módulo, como se o
 * cliente não tivesse contratado nada.
 *
 * "Falar com o suporte" vai pelo canal EXTERNO (WhatsApp): o suporte in-app
 * mora dentro do shell que esta tela está justamente impedindo de abrir.
 */
export function StartupError({
  onRetry,
  retrying = false,
  onContactSupport,
  contactLoading = false,
  onSignOut,
}: {
  onRetry: () => void;
  retrying?: boolean;
  onContactSupport: () => void;
  contactLoading?: boolean;
  onSignOut: () => void;
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
        {t.startupError.title}
      </Text>

      <Text variant="bodyLoose" color="textMuted" textAlign="center" marginBottom="s28">
        {t.startupError.text}
      </Text>

      <Button
        title={t.startupError.retry}
        onPress={onRetry}
        loading={retrying}
        height={54}
        radius={16}
      />

      <Box marginTop="s10">
        <Button
          title={t.startupError.contactSupport}
          onPress={onContactSupport}
          loading={contactLoading}
          variant="contorno"
          textColor="textPrimary"
          height={50}
          radius={16}
          textVariant="buttonSm"
        />
      </Box>

      <Box marginTop="s10">
        <Button
          title={t.startupError.signOut}
          onPress={onSignOut}
          variant="contorno"
          textColor="textMuted"
          height={50}
          radius={16}
          textVariant="buttonSm"
        />
      </Box>
    </Box>
  );
}
