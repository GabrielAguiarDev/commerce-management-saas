import { router } from 'expo-router';
import { useState } from 'react';

import { AuthScreen, Box, Button, Field, Icon, Text } from '@components';
import { ROUTES } from '@domain/navigation/routes';
import { DEMO_CODE, RecoveryError, pedirCodigo } from '@domain/session';
import { useTranslation } from '@i18n';
import { useUIStore } from '@store/uiStore';
import { RAIO_PILULA } from '@theme';

/**
 * Passo 1 de 3 da recuperação de senha: para onde mandar o código.
 *
 * ⚠️ SIMULAÇÃO. Nenhum e-mail sai daqui — ver o cabeçalho de
 * `domain/session/passwordRecovery.ts`, que é o arquivo a trocar quando o fluxo
 * real existir. Esta tela não muda quando isso acontecer.
 *
 * O e-mail digitado viaja para a tela seguinte JÁ MASCARADO, como parâmetro de
 * rota. Guardá-lo numa store seria criar estado global para uma conversa de
 * três telas que termina em si mesma; e mandar o endereço inteiro colocaria na
 * URL da rota (que é o que o expo-router serializa) um dado que a tela seguinte
 * não precisa por extenso.
 */
export default function ForgotPasswordScreen() {
  const t = useTranslation();
  const showToast = useUIStore((s) => s.showToast);

  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviarCodigo() {
    setEnviando(true);
    try {
      const mascarado = await pedirCodigo(email);
      showToast(t.toasts.recoveryCodeReady);
      router.push({
        pathname: ROUTES.verifyCode,
        params: { email: mascarado },
      } as never);
    } catch (error) {
      if (error instanceof RecoveryError) {
        showToast(t.errors.recovery[error.code], { tone: 'erro' });
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AuthScreen title={t.auth.forgot.title} subtitle={t.auth.forgot.intro}>
      <MockNotice text={t.auth.mockNotice(DEMO_CODE)} />

      <Box marginBottom="s24">
        <Field
          onAuth
          highlightOnFocus
          label={t.auth.forgot.emailLabel}
          value={email}
          onChangeText={setEmail}
          placeholder={t.auth.signIn.emailPlaceholder}
          height={56}
          radius={12}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          onSubmitEditing={enviarCodigo}
          returnKeyType="send"
          prefix={<Icon name="mail" size={19} color="authMuted" />}
        />
      </Box>

      <Button
        variant="gradiente"
        title={t.auth.forgot.submit}
        onPress={enviarCodigo}
        height={56}
        radius={RAIO_PILULA}
        textVariant="buttonLg"
        loading={enviando}
      />
    </AuthScreen>
  );
}

/**
 * O aviso de que isto ainda é uma simulação.
 *
 * Fica DENTRO da tela, e não num comentário de código, porque quem abre este
 * fluxo numa build de teste precisa saber por que nenhum e-mail chegou — e
 * porque é ele que informa o código da demonstração. Some junto com o mock.
 */
function MockNotice({ text }: { text: string }) {
  return (
    <Box
      flexDirection="row"
      gap="s10"
      padding="s14"
      marginBottom="s22"
      borderRadius="r16"
      backgroundColor="authPill"
    >
      <Icon name="alert" size={18} color="authLink" />
      <Box flex={1}>
        <Text variant="hint" color="authInk">
          {text}
        </Text>
      </Box>
    </Box>
  );
}
