import { useEffect } from 'react';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Box } from '@components/ui/Box';
import { Text } from '@components/ui/Text';
import { CONEXAO } from '@i18n';
import { useConexaoStore } from '@store/conexaoStore';

import { AO_FADE, AO_PULSE } from './animacoes';

/**
 * Banner de conexão.
 *
 * Dois estados, duas cores, como no protótipo:
 *  - offline → âmbar, "suas vendas estão salvas";
 *  - voltando → teal, "sincronizando…" (some sozinho depois de ~2,4s; quem
 *    controla esse relógio é `useMonitorDeConexao`, não este componente).
 *
 * O ponto pulsa em loop infinito — e para de pulsar quando o sistema pede
 * movimento reduzido. Animação infinita é justamente a que mais incomoda quem
 * tem sensibilidade vestibular.
 */
export function BannerDeConexao() {
  const online = useConexaoStore((s) => s.online);
  const sincronizando = useConexaoStore((s) => s.sincronizando);
  const semMovimento = useReducedMotion();

  const opacidade = useSharedValue(1);

  const visivel = !online || sincronizando;

  useEffect(() => {
    if (!visivel || semMovimento) {
      opacidade.value = 1;
      return;
    }
    opacidade.value = withRepeat(
      withTiming(AO_PULSE.opacidadeMinima, { duration: AO_PULSE.meioCiclo }),
      -1,
      true,
    );
  }, [visivel, semMovimento, opacidade]);

  const estiloPonto = useAnimatedStyle(() => ({ opacity: opacidade.value }));

  if (!visivel) return null;

  return (
    <Animated.View entering={FadeIn.duration(AO_FADE.duracaoBanner)}>
      <Box
        marginHorizontal="s16"
        marginBottom="s10"
        borderRadius="r14"
        paddingVertical="s11"
        paddingHorizontal="s13"
        flexDirection="row"
        alignItems="center"
        gap="s10"
        backgroundColor={online ? 'primarySoft' : 'warningSoft'}
        accessibilityLiveRegion="polite"
      >
        <Animated.View style={estiloPonto}>
          <Box width={9} height={9} borderRadius="full" backgroundColor={online ? 'primary' : 'warning'} />
        </Animated.View>
        <Box flex={1}>
          <Text variant="chipLabel" color={online ? 'primary' : 'warning'} lineHeight={18}>
            {online ? CONEXAO.sincronizando : CONEXAO.offline}
          </Text>
        </Box>
      </Box>
    </Animated.View>
  );
}
