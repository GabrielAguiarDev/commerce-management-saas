import { router } from 'expo-router';

import { Botao, Box, Pilula, Screen, Text, Toque } from '@components';
import { useChamados, useMarcarComoLido } from '@domain/support';
import type { StatusChamado } from '@domain/support';
import { useUIStore } from '@store/uiStore';
import type { ThemeColor } from '@theme';

const CORES_DO_STATUS: Record<StatusChamado, { fundo: ThemeColor; texto: ThemeColor }> = {
  respondido: { fundo: 'primarySoft', texto: 'primary' },
  em_andamento: { fundo: 'warningSoft', texto: 'warning' },
  resolvido: { fundo: 'successSoft', texto: 'success' },
};

export default function TelaSuporte() {
  const { data: chamados = [] } = useChamados();
  const { mutate: marcarComoLido } = useMarcarComoLido();
  const abrirSheet = useUIStore((s) => s.abrirSheet);

  return (
    <Screen titulo="Suporte" subtitulo="A gente responde por aqui">
      {chamados.map((chamado) => (
        <Toque
          key={chamado.id}
          accessibilityLabel={`${chamado.assunto}. ${chamado.statusRotulo}${chamado.naoLida ? '. Não lida' : ''}`}
          onPress={() => {
            // Marcar como lido ANTES de navegar: o badge da tela "Mais" precisa
            // apagar mesmo que o usuário volte imediatamente.
            if (chamado.naoLida) marcarComoLido(chamado.id);
            router.push(`/suporte/${chamado.id}` as never);
          }}
          backgroundColor="surface"
          borderColor="line"
          borderWidth={1}
          borderRadius="r18"
          padding="s15"
          flexDirection="row"
          gap="s12"
          alignItems="flex-start"
        >
          <Box flex={1} minWidth={0}>
            <Text variant="titleXs" lineHeight={19}>
              {chamado.assunto}
            </Text>
            <Text variant="captionSm" color="textMuted" marginTop="s5">
              {chamado.resumo}
            </Text>
            <Box marginTop="s9">
              <Pilula
                texto={chamado.statusRotulo}
                corDeFundo={CORES_DO_STATUS[chamado.status].fundo}
                corDoTexto={CORES_DO_STATUS[chamado.status].texto}
                paddingH={10}
                paddingV={4}
              />
            </Box>
          </Box>

          {chamado.naoLida ? (
            <Box width={10} height={10} borderRadius="full" backgroundColor="danger" marginTop="s4" />
          ) : null}
        </Toque>
      ))}

      <Botao
        titulo="Abrir chamado"
        aoTocar={() => abrirSheet({ tipo: 'chamado' })}
        altura={52}
        raio={18}
        variantTexto="buttonSm"
      />
    </Screen>
  );
}
