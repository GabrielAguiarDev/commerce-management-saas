import { router } from 'expo-router';
import { useState } from 'react';

import { AuthScreen, Button, Box, Field, Icon, Text, Touchable } from '@components';
import { ROUTES } from '@domain/navigation/routes';
import { AuthError } from '@domain/session/sessionTypes';
import { useTranslation } from '@i18n';
import { useSessionStore } from '@store/sessionStore';
import { useUIStore } from '@store/uiStore';
import { RAIO_PILULA } from '@theme';

/**
 * Entrada. `supabase.auth.signInWithPassword`, via `sessionStore.signIn`.
 *
 * O plano (e portanto os módulos) vem do TENANT do usuário autenticado, lido de
 * `profiles` — não do e-mail digitado, como era na fase de mock.
 *
 * A tela não distingue "e-mail não existe" de "senha errada", e isso é
 * deliberado: responder qual dos dois falhou permite descobrir quem tem conta
 * no sistema. O próprio Supabase devolve o mesmo erro para os dois casos.
 *
 * NÃO HÁ CADASTRO AQUI, e é uma decisão de produto, não uma tela que falta: a
 * conta nasce no painel admin, junto com o tenant e os módulos contratados. Por
 * isso o rodapé leva ao WhatsApp do suporte em vez de a um formulário.
 */
export default function LoginScreen() {
  const t = useTranslation();

  const signIn = useSessionStore((s) => s.signIn);
  const signingIn = useSessionStore((s) => s.signingIn);
  const showToast = useUIStore((s) => s.showToast);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verSenha, setVerSenha] = useState(false);

  async function acessar() {
    try {
      await signIn(email, password);
      // `replace`, não `push`: a tela de login não pode voltar por gesto depois
      // de autenticar. O portão decide o destino real (início ou bloqueio).
      router.replace(ROUTES.entry as never);
    } catch (error) {
      const code = error instanceof AuthError ? error.code : 'unknown';
      showToast(t.errors.auth[code], { tone: 'erro' });
    }
  }

  return (
    <AuthScreen title={t.auth.signIn.title} showBrand showBack={false}>
      <Box gap="s16" marginBottom="s24">
        <Field
          onPetrol
          highlightOnFocus
          label={t.auth.signIn.emailLabel}
          value={email}
          onChangeText={setEmail}
          placeholder={t.auth.signIn.emailPlaceholder}
          height={56}
          radius={12}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          prefix={<Icon name="mail" size={19} color="onPetrolMuted" />}
        />

        <Field
          onPetrol
          highlightOnFocus
          label={t.auth.signIn.passwordLabel}
          value={password}
          onChangeText={setPassword}
          placeholder={t.auth.signIn.passwordPlaceholder}
          height={56}
          radius={12}
          secureTextEntry={!verSenha}
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          onSubmitEditing={acessar}
          returnKeyType="go"
          prefix={<Icon name="lock" size={19} color="onPetrolMuted" />}
          accessory={
            <Touchable
              accessibilityLabel={
                verSenha ? t.auth.signIn.hidePassword : t.auth.signIn.showPassword
              }
              onPress={() => setVerSenha((v) => !v)}
              height={44}
              paddingHorizontal="s6"
              justifyContent="center"
            >
              <Icon name={verSenha ? 'eye' : 'eyeOff'} size={20} color="onPetrolMuted" />
            </Touchable>
          }
        />
      </Box>

      <Button
        title={t.auth.signIn.submit}
        onPress={acessar}
        height={56}
        radius={RAIO_PILULA}
        textVariant="buttonLg"
        loading={signingIn}
      />

      <Box alignItems="center" marginTop="s16">
        <Touchable
          accessibilityLabel={t.auth.signIn.forgot}
          onPress={() => router.push(ROUTES.forgotPassword as never)}
          padding="s6"
        >
          <Text variant="titleSm" color="primary">
            {t.auth.signIn.forgot}
          </Text>
        </Touchable>
      </Box>
    </AuthScreen>
  );
}
