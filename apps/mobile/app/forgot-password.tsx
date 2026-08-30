import { router } from 'expo-router';
import { useState } from 'react';

import { AuthScreen, Box, Button, Field, Icon } from '@components';
import { ROUTES } from '@domain/navigation/routes';
import { RecoveryError, pedirCodigo } from '@domain/session';
import { useTranslation } from '@i18n';
import { useUIStore } from '@store/uiStore';
import { RAIO_PILULA } from '@theme';

/**
 * Passo 1 de 3 da recuperação de senha: para onde mandar o código.
 *
 * O e-mail digitado viaja para a tela seguinte JÁ MASCARADO, como parâmetro de
 * rota — mandar o endereço inteiro o colocaria na URL da navegação, que é o
 * que o expo-router serializa. Quem guarda o endereço de verdade, para os
 * passos 2 e 3, é o `recoveryService`.
 *
 * A TELA NÃO SABE SE A CONTA EXISTE, e nem pode: o service devolve sucesso do
 * mesmo jeito para um e-mail sem cadastro. Responder diferente transformaria
 * esta tela num verificador de quem é cliente.
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
