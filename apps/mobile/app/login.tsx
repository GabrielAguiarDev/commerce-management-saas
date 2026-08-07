import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Box, Field, Text, Touchable } from '@components';
import { ROUTES } from '@domain/navigation/routes';
import * as sessionService from '@domain/session/sessionService';
import { AuthError } from '@domain/session/sessionTypes';
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
 */
export default function LoginScreen() {
  const t = useTranslation();
  const insets = useSafeAreaInsets();

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

  async function forgotPassword() {
    try {
      await sessionService.recuperarSenha(email);
      showToast(t.toasts.recoverySent);
    } catch (error) {
      const code = error instanceof AuthError ? error.code : 'unknown';
      showToast(t.errors.auth[code], { tone: 'erro' });
    }
  }

  return (
    <Box flex={1} backgroundColor="petrol">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 28,
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 40,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Box flexDirection="row" alignItems="center" gap="s11" marginBottom="s34">
            <Box
              width={44}
              height={44}
              borderRadius="r14"
              backgroundColor="primary"
              alignItems="center"
              justifyContent="center"
            >
              <Text variant="logoLetter" color="white">
                A
              </Text>
            </Box>
            <Box>
              <Text variant="brandTitle" color="white">
                Aguiar One
              </Text>
              <Text variant="captionSm" color="onPetrolFaint" marginTop="s4">
                Gestão simples do seu negócio
              </Text>
            </Box>
          </Box>

          <Text variant="titleLg" color="white" marginBottom="s16" accessibilityRole="header">
            Bem-vindo de volta
          </Text>

          <Box marginBottom="s16">
            <Field
              onPetrol
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              placeholder="voce@seunegocio.com.br"
              height={52}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />
          </Box>

          <Box marginBottom="s10">
            <Field
              onPetrol
              label="Senha"
              value={password}
              onChangeText={setPassword}
              placeholder="Sua senha"
              height={52}
              secureTextEntry={!verSenha}
              autoCapitalize="none"
              textContentType="password"
              accessory={
                <Touchable
                  accessibilityLabel={verSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  onPress={() => setVerSenha((v) => !v)}
                  height={40}
                  paddingHorizontal="s12"
                  justifyContent="center"
                >
                  <Text variant="tinyBold" color="primary">
                    {verSenha ? 'Ocultar' : 'Mostrar'}
                  </Text>
                </Touchable>
              }
            />
          </Box>

          <Box alignItems="flex-end" marginBottom="s22">
            <Touchable accessibilityLabel="Esqueci minha senha" onPress={forgotPassword} padding="s6">
              <Text variant="chipLabel" color="onPetrolLink">
                Esqueci minha senha
              </Text>
            </Touchable>
          </Box>

          <Button
            title="Entrar"
            onPress={acessar}
            height={56}
            radius={16}
            textVariant="buttonLg"
            loading={signingIn}
          />

          <Text variant="captionSm" color="onPetrolGhost" textAlign="center" marginTop="s24">
            Ainda não tem conta? Fale com o suporte
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Box>
  );
}
