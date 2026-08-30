import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { AuthScreen, Box, Button, CodeInput, Text, Touchable } from '@components';
import { ROUTES } from '@domain/navigation/routes';
import {
  CODE_LENGTH,
  RESEND_SECONDS,
  RecoveryError,
  conferirCodigo,
  reenviarCodigo,
} from '@domain/session';
import { useTranslation } from '@i18n';
import { useUIStore } from '@store/uiStore';
import { RAIO_PILULA } from '@theme';

/**
 * Passo 2 de 3: o código de verificação.
 *
 * As caixas são UM campo só (ver `CodeInput`), com o teclado do sistema: é ele
 * que traz o preenchimento automático do código no iOS e o colar. O estado é
 * uma string simples que só cresce até `CODE_LENGTH` — não um array de campos
 * com foco pulando entre eles.
 *
 * ⚠️ CONFIRMAR AQUI JÁ ABRE UMA SESSÃO no Supabase — é assim que o `verifyOtp`
 * funciona. Quem a derruba é o passo 3, no fim do fluxo ou na desistência; ver
 * `recoveryService`.
 */
export default function VerifyCodeScreen() {
  const t = useTranslation();
  const showToast = useUIStore((s) => s.showToast);

  // Já mascarado pela tela anterior. `string | string[]` é como o expo-router
  // tipa os parâmetros; aqui só vem um.
  const { email } = useLocalSearchParams<{ email?: string }>();

  const [code, setCode] = useState('');
  const [conferindo, setConferindo] = useState(false);
  const [segundos, reiniciarContagem] = useContagemRegressiva(RESEND_SECONDS);

  const completo = code.length === CODE_LENGTH;

  async function reenviar() {
    try {
      await reenviarCodigo();
      showToast(t.toasts.recoveryCodeReady);
    } catch (error) {
      if (error instanceof RecoveryError) {
        showToast(t.errors.recovery[error.code], { tone: 'erro' });
      }
    }
  }

  async function confirmar() {
    setConferindo(true);
    try {
      await conferirCodigo(code);
      // `push`: o passo seguinte ainda pode querer voltar para reenviar o
      // código. Quem fecha a porta é a última tela, que faz `replace` no login.
      router.push(ROUTES.newPassword as never);
    } catch (error) {
      if (error instanceof RecoveryError) {
        showToast(t.errors.recovery[error.code], { tone: 'erro' });
        // Limpa só quando o código está completo e ERRADO. Incompleto, apagar
        // o que a pessoa acabou de digitar seria castigá-la pelo próprio erro.
        if (completo) setCode('');
      }
    } finally {
      setConferindo(false);
    }
  }

  return (
    <AuthScreen
      title={t.auth.code.title}
      subtitle={email ? t.auth.code.sentTo(email) : undefined}
      footer={
        <Button
          variant="gradiente"
          title={t.auth.code.submit}
          onPress={confirmar}
          height={56}
          radius={RAIO_PILULA}
          textVariant="buttonLg"
          loading={conferindo}
          // NÃO desabilitado com o código incompleto, pela mesma regra da tela
          // de bloqueio: o botão fica ativo e o aviso vem depois de tentar. Um
          // botão morto sem explicação é pior que uma frase dizendo o que falta.
        />
      }
    >
      <CodeInput
        value={code}
        onChangeText={setCode}
        length={CODE_LENGTH}
        accessibilityLabel={t.auth.code.codeLabel}
        autoFocus
      />

      <Box alignItems="center" marginTop="s20">
        {segundos > 0 ? (
          <Text variant="caption" color="authFaint">
            {t.auth.code.resendIn(segundos)}
          </Text>
        ) : (
          <Touchable
            accessibilityLabel={t.auth.code.resend}
            // Pede outro e-mail para o MESMO endereço, sem voltar ao passo 1 —
            // quem guarda esse endereço é o service. O código anterior deixa de
            // valer no servidor, e é por isso que o campo é limpo junto: deixar
            // os dígitos velhos na tela convidaria a confirmar o código errado.
            onPress={() => {
              setCode('');
              // A contagem reinicia ANTES da rede: o Supabase recusa dois
              // e-mails para o mesmo endereço dentro de um minuto, e um botão
              // que continuasse tocável renderia só erro de limite.
              reiniciarContagem();
              void reenviar();
            }}
            padding="s6"
          >
            <Text variant="titleSm" color="authLink">
              {t.auth.code.resend}
            </Text>
          </Touchable>
        )}
      </Box>
    </AuthScreen>
  );
}

/**
 * A contagem regressiva do reenvio, em segundos, e a função que a reinicia.
 *
 * Uma corrente de `setTimeout` (um por segundo, cada um agendando o próximo) e
 * não um `setInterval`: no zero ela simplesmente para de se reagendar, sem
 * precisar lembrar de limpar um relógio que continuaria batendo para sempre
 * numa tela que a pessoa nem está mais olhando.
 *
 * Fica aqui, e não em `@hooks`, porque é a única tela do app com contagem
 * regressiva; se aparecer uma segunda, aí muda de lugar.
 */
function useContagemRegressiva(inicial: number): [number, () => void] {
  const [segundos, setSegundos] = useState(inicial);

  useEffect(() => {
    if (segundos <= 0) return;
    const id = setTimeout(() => setSegundos((s) => Math.max(s - 1, 0)), 1000);
    return () => clearTimeout(id);
  }, [segundos]);

  const reiniciar = useCallback(() => setSegundos(inicial), [inicial]);

  return [segundos, reiniciar];
}
