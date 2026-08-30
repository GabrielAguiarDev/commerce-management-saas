import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { AuthScreen, Box, Button, Field, Icon, Text, Touchable } from '@components';
import { ROUTES } from '@domain/navigation/routes';
import { RecoveryError, cancelarRecuperacao, redefinirSenha } from '@domain/session';
import { useTranslation } from '@i18n';
import { useUIStore } from '@store/uiStore';
import { RAIO_PILULA } from '@theme';

/**
 * Passo 3 de 3: a senha nova.
 *
 * O fim do fluxo é `replace` no login, e não `back`: depois de trocar a senha
 * não pode existir caminho de volta para a tela do código, que a essa altura
 * confere um código já usado.
 *
 * ┌─ POR QUE ESTA TELA SAI DA SESSÃO ──────────────────────────────────────┐
 * │ Chegar aqui significa que o `verifyOtp` do passo 2 já abriu uma sessão  │
 * │ no Supabase. Se a pessoa DESISTIR agora — botão voltar, gesto do iOS —  │
 * │ o aparelho ficaria logado com a senha ANTIGA ainda valendo, e "esqueci  │
 * │ minha senha" teria virado "entrei sem ela".                            │
 * │                                                                        │
 * │ Por isso a limpeza no desmonte. Ela NÃO roda no caminho feliz: lá quem  │
 * │ derruba a sessão é o próprio `redefinirSenha`, depois de gravar — e     │
 * │ derrubá-la antes deixaria a troca sem a quem aplicar.                   │
 * └────────────────────────────────────────────────────────────────────────┘
 */
export default function NewPasswordScreen() {
  const t = useTranslation();
  const showToast = useUIStore((s) => s.showToast);

  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // `ref` e não estado: quem lê isto é a limpeza do desmonte, que roda depois
  // do último render e não deve provocar outro.
  const concluido = useRef(false);

  useEffect(() => {
    return () => {
      if (!concluido.current) void cancelarRecuperacao();
    };
  }, []);

  async function salvar() {
    setSalvando(true);
    try {
      await redefinirSenha(senha, confirmacao);
      concluido.current = true;
      showToast(t.toasts.passwordChanged, { tone: 'sucesso' });
      // Zera a pilha da recuperação ANTES de voltar. Um `replace` sozinho troca
      // só a tela do topo: "conferir código" continuaria viva embaixo do login,
      // alcançável pelo gesto de voltar do iOS — e conferindo um código que
      // acabou de ser usado.
      if (router.canDismiss()) router.dismissAll();
      router.replace(ROUTES.login as never);
    } catch (error) {
      if (error instanceof RecoveryError) {
        showToast(t.errors.recovery[error.code], { tone: 'erro' });
      }
    } finally {
      setSalvando(false);
    }
  }

  // Um olho só para os dois campos: são a MESMA senha digitada duas vezes, e
  // revelar uma metade não protege nada — só faz a pessoa tocar em dois botões.
  const olho = (
    <Touchable
      accessibilityLabel={verSenha ? t.auth.signIn.hidePassword : t.auth.signIn.showPassword}
      onPress={() => setVerSenha((v) => !v)}
      height={44}
      paddingHorizontal="s6"
      justifyContent="center"
    >
      <Icon name={verSenha ? 'eye' : 'eyeOff'} size={20} color="authMuted" />
    </Touchable>
  );

  return (
    <AuthScreen title={t.auth.newPassword.title} subtitle={t.auth.newPassword.intro}>
      <Box gap="s16" marginBottom="s24">
        <Field
          onAuth
          highlightOnFocus
          label={t.auth.newPassword.passwordLabel}
          value={senha}
          onChangeText={setSenha}
          placeholder={t.auth.signIn.passwordPlaceholder}
          height={56}
          radius={12}
          secureTextEntry={!verSenha}
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          prefix={<Icon name="lock" size={19} color="authMuted" />}
          accessory={olho}
        />

        <Field
          onAuth
          highlightOnFocus
          label={t.auth.newPassword.confirmLabel}
          value={confirmacao}
          onChangeText={setConfirmacao}
          placeholder={t.auth.signIn.passwordPlaceholder}
          height={56}
          radius={12}
          secureTextEntry={!verSenha}
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          onSubmitEditing={salvar}
          returnKeyType="done"
          prefix={<Icon name="lock" size={19} color="authMuted" />}
        />
      </Box>

      <Button
        variant="gradiente"
        title={t.auth.newPassword.submit}
        onPress={salvar}
        height={56}
        radius={RAIO_PILULA}
        textVariant="buttonLg"
        loading={salvando}
      />

      <Box alignItems="center" marginTop="s16">
        <Text variant="hint" color="authFaint" textAlign="center">
          {t.auth.signInAgainNotice}
        </Text>
      </Box>
    </AuthScreen>
  );
}
