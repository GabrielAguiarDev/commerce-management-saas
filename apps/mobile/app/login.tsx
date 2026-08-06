import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Botao, Box, Campo, Text, Toque } from '@components';
import { ROTAS } from '@domain/navigation/rotas';
import * as sessionService from '@domain/session/sessionService';
import { AuthError } from '@domain/session/sessionTypes';
import { ERROS_AUTH, TOASTS } from '@i18n';
import { useSessaoStore } from '@store/sessaoStore';
import { useUIStore } from '@store/uiStore';

/**
 * Entrada.
 *
 * O e-mail decide o perfil (e, portanto, os módulos): é o que substitui os
 * chips de demo do protótipo, que ficaram fora de escopo. Ver
 * `src/data/usuarios.ts` para as três credenciais de demonstração.
 */
export default function TelaDeLogin() {
  const insets = useSafeAreaInsets();

  const entrar = useSessaoStore((s) => s.entrar);
  const entrando = useSessaoStore((s) => s.entrando);
  const mostrarToast = useUIStore((s) => s.mostrarToast);

  const [email, setEmail] = useState('maria@petshopamigo.com.br');
  const [senha, setSenha] = useState('minhasenha');
  const [verSenha, setVerSenha] = useState(false);

  async function acessar() {
    try {
      await entrar(email, senha);
      // `replace`, não `push`: a tela de login não pode voltar por gesto depois
      // de autenticar. O portão decide o destino real (início ou bloqueio).
      router.replace(ROTAS.entrada as never);
    } catch (erro) {
      const codigo = erro instanceof AuthError ? erro.codigo : 'desconhecido';
      mostrarToast(ERROS_AUTH[codigo], { tom: 'erro' });
    }
  }

  async function esqueciSenha() {
    try {
      await sessionService.recuperarSenha(email);
      mostrarToast(TOASTS.recuperacaoEnviada);
    } catch (erro) {
      const codigo = erro instanceof AuthError ? erro.codigo : 'desconhecido';
      mostrarToast(ERROS_AUTH[codigo], { tom: 'erro' });
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
            <Campo
              sobrePetrol
              rotulo="E-mail"
              valor={email}
              aoMudar={setEmail}
              placeholder="voce@seunegocio.com.br"
              altura={52}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />
          </Box>

          <Box marginBottom="s10">
            <Campo
              sobrePetrol
              rotulo="Senha"
              valor={senha}
              aoMudar={setSenha}
              placeholder="Sua senha"
              altura={52}
              secureTextEntry={!verSenha}
              autoCapitalize="none"
              textContentType="password"
              acessorio={
                <Toque
                  accessibilityLabel={verSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  onPress={() => setVerSenha((v) => !v)}
                  height={40}
                  paddingHorizontal="s12"
                  justifyContent="center"
                >
                  <Text variant="tinyBold" color="primary">
                    {verSenha ? 'Ocultar' : 'Mostrar'}
                  </Text>
                </Toque>
              }
            />
          </Box>

          <Box alignItems="flex-end" marginBottom="s22">
            <Toque accessibilityLabel="Esqueci minha senha" onPress={esqueciSenha} padding="s6">
              <Text variant="chipLabel" color="onPetrolLink">
                Esqueci minha senha
              </Text>
            </Toque>
          </Box>

          <Botao
            titulo="Entrar"
            aoTocar={acessar}
            altura={56}
            raio={16}
            variantTexto="buttonLg"
            carregando={entrando}
          />

          <Text variant="captionSm" color="onPetrolGhost" textAlign="center" marginTop="s24">
            Ainda não tem conta? Fale com o suporte
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Box>
  );
}
