import { router } from 'expo-router';

import { Button, Box, Icon, Text } from '@components';
import { ROUTES } from '@domain/navigation/routes';
import { useSupportWhatsApp } from '@domain/support';
import { useTranslation } from '@i18n';
import { useSessionStore } from '@store/sessionStore';
import { useUIStore } from '@store/uiStore';

/**
 * Plano sem o módulo de ACESSO `app`.
 *
 * Não é erro nem falha de login: é entitlement. O tom da copy reflete isso —
 * "você continua com tudo funcionando pelo navegador", e não uma mensagem de
 * bloqueio hostil. Quem cai aqui é cliente pagante, só que de outro plano.
 */
export default function BlockedScreen() {
  const t = useTranslation();
  const signOut = useSessionStore((s) => s.signOut);
  const showToast = useUIStore((s) => s.showToast);

  // O canal é EXTERNO (WhatsApp), e não o suporte in-app: o suporte de dentro
  // do app é justamente o que este plano não tem. Mandar a pessoa abrir um
  // chamado interno seria trancar a porta por dentro — ela precisa falar com a
  // gente exatamente para destravar o que a impede de falar com a gente.
  const { abrir: abrirWhatsApp, carregando } = useSupportWhatsApp();

  async function falarComSuporte() {
    // `disponivel` não é consultado aqui de propósito: o botão fica habilitado
    // e o aviso vem depois de tentar. Um botão desabilitado sem explicação, na
    // única tela que esta pessoa consegue abrir, é pior que um aviso claro.
    if (!(await abrirWhatsApp())) {
      showToast(t.toasts.whatsappUnavailable, { tone: 'erro' });
    }
  }

  async function voltarParaEntrada() {
    // Encerra a sessão junto: deixar a sessão viva faria o portão trazer o
    // usuário de volta para cá no próximo relaunch, sem saída.
    await signOut();
    router.replace(ROUTES.login as never);
  }

  return (
    <Box flex={1} backgroundColor="bg" justifyContent="center" paddingHorizontal="s30">
      <Box
        width={76}
        height={76}
        borderRadius="r26"
        backgroundColor="primarySoft"
        alignSelf="center"
        alignItems="center"
        justifyContent="center"
        marginBottom="s22"
      >
        <Icon name="lock" size={34} color="primary" />
      </Box>

      <Text variant="blockTitle" textAlign="center" marginBottom="s10" accessibilityRole="header">
        Seu plano ainda não inclui o aplicativo
      </Text>

      <Text variant="bodyLoose" color="textMuted" textAlign="center" marginBottom="s28">
        Sem problema: você continua com tudo funcionando pelo navegador. Se quiser vender pelo
        celular, é só falar com a gente.
      </Text>

      <Button
        title="Falar com o suporte"
        onPress={falarComSuporte}
        loading={carregando}
        height={54}
        radius={16}
      />

      <Box marginTop="s10">
        <Button
          title="Voltar para a entrada"
          onPress={voltarParaEntrada}
          variant="contorno"
          textColor="textPrimary"
          height={50}
          radius={16}
          textVariant="buttonSm"
        />
      </Box>
    </Box>
  );
}
