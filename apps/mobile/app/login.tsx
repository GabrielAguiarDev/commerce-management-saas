import { router } from 'expo-router';
import { useState } from 'react';

import { AuthScreen, Button, Box, Field, Icon, Text, Touchable } from '@components';
import { ROUTES } from '@domain/navigation/routes';
import { AuthError } from '@domain/session/sessionTypes';
import { useSupportWhatsApp } from '@domain/support';
import { useTranslation } from '@i18n';
import { useSessionStore } from '@store/sessionStore';
import { useUIStore } from '@store/uiStore';

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

  // O mesmo canal externo da tela de bloqueio, pelo mesmo motivo: quem não tem
  // conta não tem como abrir um chamado dentro do app.
  const { abrir: abrirWhatsApp, carregando: abrindoWhatsApp } = useSupportWhatsApp();

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

  async function falarComSuporte() {
    if (!(await abrirWhatsApp())) {
      showToast(t.toasts.whatsappUnavailable, { tone: 'erro' });
    }
  }

  return (
    <AuthScreen
      variant="entrada"
      title={t.auth.signIn.title}
      subtitle={t.auth.signIn.subtitle}
      showBack={false}
    >
      <Box gap="s16">
        <Field
          onAuth
          highlightOnFocus
          label={t.auth.signIn.emailLabel}
          value={email}
          onChangeText={setEmail}
          placeholder={t.auth.signIn.emailPlaceholder}
          height={56}
          radius={14}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          prefix={<Icon name="mail" size={19} color="authMuted" />}
        />

        <Field
          onAuth
          highlightOnFocus
          label={t.auth.signIn.passwordLabel}
          value={password}
          onChangeText={setPassword}
          placeholder={t.auth.signIn.passwordPlaceholder}
          height={56}
          radius={14}
          secureTextEntry={!verSenha}
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          onSubmitEditing={acessar}
          returnKeyType="go"
          prefix={<Icon name="lock" size={19} color="authMuted" />}
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
              <Icon name={verSenha ? 'eye' : 'eyeOff'} size={20} color="authMuted" />
            </Touchable>
          }
        />
      </Box>

      {/* Encostado à DIREITA e logo abaixo da senha, e não centrado sob o botão:
          é a saída de quem travou no campo que está acima dele. Ali embaixo, ele
          só é lido depois de já se ter tentado entrar. */}
      <Box alignItems="flex-end" marginTop="s12" marginBottom="s20">
        <Touchable
          accessibilityLabel={t.auth.signIn.forgot}
          onPress={() => router.push(ROUTES.forgotPassword as never)}
          paddingVertical="s4"
        >
          <Text variant="titleSm" color="authLink">
            {t.auth.signIn.forgot}
          </Text>
        </Touchable>
      </Box>

      <Button
        variant="gradiente"
        title={t.auth.signIn.submit}
        onPress={acessar}
        height={56}
        radius={16}
        textVariant="buttonLg"
        loading={signingIn}
      />

      <SeparadorOu label={t.auth.signIn.or} />

      {/* Um CARTÃO, e não a linha de texto que havia aqui. O convite ao suporte
          é a única outra coisa que se pode fazer nesta tela, e uma linha solta
          no rodapé não parecia tocável — quem não tem conta ficava sem saída
          numa tela que só sabe receber quem já tem. */}
      <Touchable
        accessibilityLabel={`${t.auth.signIn.noAccount} ${t.auth.signIn.contactSupport}`}
        accessibilityState={{ busy: abrindoWhatsApp }}
        onPress={falarComSuporte}
        flexDirection="row"
        alignItems="center"
        gap="s14"
        height={76}
        paddingHorizontal="s14"
        borderRadius="r16"
        borderWidth={1}
        borderColor="authBorder"
        backgroundColor="authSurface"
      >
        <Box
          width={44}
          height={44}
          borderRadius="r12"
          backgroundColor="authPill"
          alignItems="center"
          justifyContent="center"
        >
          <Icon name="store" size={21} color="authInk" />
        </Box>

        <Box flex={1} gap="s3">
          <Text variant="bodySm" color="authMuted">
            {t.auth.signIn.noAccount}
          </Text>
          <Text variant="titleSm" color="authLink">
            {t.auth.signIn.contactSupport}
          </Text>
        </Box>

        <Icon name="chevronRight" size={17} color="authFaint" />
      </Touchable>

      {/* DENTRO da rolagem, fechando o conteúdo — não ancorado na base da tela.
          Ancorado, ele ficava preso acima do teclado, brigando por atenção com
          o campo que estava sendo digitado; e em aparelho alto sobrava um vão
          entre o cartão de suporte e ele, como se faltasse alguma coisa ali no
          meio. É o rodapé do que se lê, e rola junto com o resto. */}
      <Box
        flexDirection="row"
        justifyContent="center"
        alignItems="center"
        gap="s8"
        marginTop="s24"
      >
        <Icon name="shield" size={15} color="authFaint" />
        <Text variant="captionSm" color="authFaint">
          {t.auth.signIn.dataProtected}
        </Text>
      </Box>
    </AuthScreen>
  );
}

/** A linha com o "ou" no meio — duas réguas e a palavra entre elas. */
function SeparadorOu({ label }: { label: string }) {
  return (
    <Box
      flexDirection="row"
      alignItems="center"
      gap="s14"
      marginTop="s24"
      marginBottom="s20"
      // Decorativo: o leitor de tela já ouve os dois blocos em ordem, e um "ou"
      // solto entre eles só atrapalharia.
      accessibilityElementsHidden
    >
      <Box flex={1} height={1} backgroundColor="authLine" />
      <Text variant="captionSm" color="authFaint">
        {label}
      </Text>
      <Box flex={1} height={1} backgroundColor="authLine" />
    </Box>
  );
}
