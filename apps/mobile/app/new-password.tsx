import { router } from 'expo-router';
import { useState } from 'react';

import { AuthScreen, Box, Button, Field, Icon, Text, Touchable } from '@components';
import { ROUTES } from '@domain/navigation/routes';
import { RecoveryError, redefinirSenha } from '@domain/session';
import { useTranslation } from '@i18n';
import { useUIStore } from '@store/uiStore';
import { RAIO_PILULA } from '@theme';

/**
 * Passo 3 de 3: a senha nova.
 *
 * ⚠️ SIMULAÇÃO — nenhuma senha muda de verdade. Ver
 * `domain/session/passwordRecovery.ts`.
 *
 * O fim do fluxo é `replace` no login, e não `back`: depois de trocar a senha
 * não pode existir caminho de volta para a tela do código, que a essa altura
 * confere um código já usado.
 */
export default function NewPasswordScreen() {
  const t = useTranslation();
  const showToast = useUIStore((s) => s.showToast);

  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setSalvando(true);
    try {
      await redefinirSenha(senha, confirmacao);
      showToast(t.toasts.passwordChanged);
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
      <Icon name={verSenha ? 'eye' : 'eyeOff'} size={20} color="onPetrolMuted" />
    </Touchable>
  );

  return (
    <AuthScreen title={t.auth.newPassword.title} subtitle={t.auth.newPassword.intro}>
      <Box gap="s16" marginBottom="s24">
        <Field
          onPetrol
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
          prefix={<Icon name="lock" size={19} color="onPetrolMuted" />}
          accessory={olho}
        />

        <Field
          onPetrol
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
          prefix={<Icon name="lock" size={19} color="onPetrolMuted" />}
        />
      </Box>

      <Button
        title={t.auth.newPassword.submit}
        onPress={salvar}
        height={56}
        radius={RAIO_PILULA}
        textVariant="buttonLg"
        loading={salvando}
      />

      <Box alignItems="center" marginTop="s16">
        <Text variant="hint" color="onPetrolGhost" textAlign="center">
          {t.auth.mockShortNotice}
        </Text>
      </Box>
    </AuthScreen>
  );
}
