import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';

import { Botao } from '@components/ui/Botao';
import { Box } from '@components/ui/Box';
import { Text } from '@components/ui/Text';
import { Toque } from '@components/ui/Toque';
import { useUIStore } from '@store/uiStore';

import { AO_FADE, AO_UP } from './animacoes';

/**
 * O diálogo de confirmação (`aoUp` sobre um véu `aoFade`).
 *
 * "Agora não" é a saída, e é ela que fica embaixo e sem cor: as três
 * confirmações do app (sair, cancelar venda, fechar caixa) são todas
 * irreversíveis o bastante para que o caminho fácil seja desistir.
 */
export function ConfirmacaoHost() {
  const confirmacao = useUIStore((s) => s.confirmacao);
  const fechar = useUIStore((s) => s.fecharConfirmacao);

  if (!confirmacao) return null;

  return (
    <Box position="absolute" top={0} left={0} right={0} bottom={0} justifyContent="center" padding="s26">
      <Animated.View
        entering={FadeIn.duration(180)}
        exiting={FadeOut.duration(AO_FADE.duracao)}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      >
        <Toque
          accessibilityLabel="Fechar"
          onPress={fechar}
          flex={1}
          backgroundColor="scrimDialog"
        />
      </Animated.View>

      <Animated.View
        entering={FadeInDown.duration(AO_UP.duracao)
          .easing(AO_UP.easing)
          .withInitialValues({ transform: [{ translateY: AO_UP.deslocamento }] })}
      >
        <Box backgroundColor="surface" borderRadius="r24" padding="s22">
          <Text variant="sheetTitle" accessibilityRole="header">
            {confirmacao.titulo}
          </Text>
          <Text variant="bodyRelaxed" color="textMuted" marginTop="s9" marginBottom="s20">
            {confirmacao.texto}
          </Text>

          <Botao
            titulo={confirmacao.rotuloBotao}
            aoTocar={() => {
              const acao = confirmacao.aoConfirmar;
              fechar();
              acao();
            }}
            altura={52}
            raio={15}
            // Destrutivo é vermelho; o resto segue o teal da ação.
            variante={confirmacao.destrutivo ? 'destrutivo' : 'primario'}
            variantTexto="buttonSm"
          />

          <Box marginTop="s8">
            <Botao
              titulo="Agora não"
              aoTocar={fechar}
              variante="fantasma"
              altura={48}
              corDoTexto="textMuted"
              variantTexto="buttonXs"
            />
          </Box>
        </Box>
      </Animated.View>
    </Box>
  );
}
