import { router } from 'expo-router';

import { Botao, Box, Icone, Text } from '@components';
import { ROTAS } from '@domain/navigation/rotas';
import { TOASTS } from '@i18n';
import { useSessaoStore } from '@store/sessaoStore';
import { useUIStore } from '@store/uiStore';

/**
 * Plano sem o módulo de ACESSO `app`.
 *
 * Não é erro nem falha de login: é entitlement. O tom da copy reflete isso —
 * "você continua com tudo funcionando pelo navegador", e não uma mensagem de
 * bloqueio hostil. Quem cai aqui é cliente pagante, só que de outro plano.
 */
export default function TelaDeBloqueio() {
  const sair = useSessaoStore((s) => s.sair);
  const mostrarToast = useUIStore((s) => s.mostrarToast);

  async function voltarParaEntrada() {
    // Encerra a sessão junto: deixar a sessão viva faria o portão trazer o
    // usuário de volta para cá no próximo relaunch, sem saída.
    await sair();
    router.replace(ROTAS.login as never);
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
        <Icone nome="cadeado" tamanho={34} cor="primary" />
      </Box>

      <Text variant="blockTitle" textAlign="center" marginBottom="s10" accessibilityRole="header">
        Seu plano ainda não inclui o aplicativo
      </Text>

      <Text variant="bodyLoose" color="textMuted" textAlign="center" marginBottom="s28">
        Sem problema: você continua com tudo funcionando pelo navegador. Se quiser vender pelo
        celular, é só falar com a gente.
      </Text>

      <Botao
        titulo="Falar com o suporte"
        // O suporte é uma tela de dentro do app, e o app é justamente o que
        // este plano não tem. Enquanto não houver um canal externo (WhatsApp ou
        // e-mail via Linking), o botão explica o caminho em vez de levar a uma
        // rota inalcançável. Registrado em DEVELOPMENT.md › Pendências.
        aoTocar={() => mostrarToast(TOASTS.chamadoAberto)}
        altura={54}
        raio={16}
      />

      <Box marginTop="s10">
        <Botao
          titulo="Voltar para a entrada"
          aoTocar={voltarParaEntrada}
          variante="contorno"
          corDoTexto="textPrimary"
          altura={50}
          raio={16}
          variantTexto="buttonSm"
        />
      </Box>
    </Box>
  );
}
