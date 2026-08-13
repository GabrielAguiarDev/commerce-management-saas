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
import { useTranslation } from '@i18n';
import { useConnectionStore } from '@store/connectionStore';

import { AO_FADE, AO_PULSE } from './animations';

/**
 * Banner de conexão.
 *
 * Dois estados, duas cores:
 *  - offline → âmbar, "suas vendas ficam salvas aqui";
 *  - sincronizando → teal, e só enquanto a fila está REALMENTE subindo. Quem
 *    liga e desliga essa flag é o caso de uso da sincronização; este
 *    componente não tem relógio nenhum.
 *
 * O texto do estado offline é a peça mais importante desta tela inteira: ele é
 * lido por quem acabou de ver a conexão cair no meio do movimento. Por isso
 * ele afirma onde a venda fica e quem decide quando ela sobe, em vez de só
 * anunciar a falha.
 *
 * O ponto pulsa em loop infinito — e para de pulsar quando o sistema pede
 * movimento reduzido. Animação infinita é justamente a que mais incomoda quem
 * tem sensibilidade vestibular.
 */
export function ConnectionBanner() {
  const t = useTranslation();
  const online = useConnectionStore((s) => s.online);
  const syncing = useConnectionStore((s) => s.syncing);
  const noMovement = useReducedMotion();

  const opacity = useSharedValue(1);

  // A conexão caiu NO MEIO de uma sincronização é um estado possível. Aí o
  // que importa dizer é que está offline — o "sincronizando" já não é
  // verdade, mesmo que a flag ainda não tenha sido desligada.
  const showingSync = syncing && online;
  const visible = !online || showingSync;

  useEffect(() => {
    if (!visible || noMovement) {
      opacity.value = 1;
      return;
    }
    opacity.value = withRepeat(
      withTiming(AO_PULSE.minOpacity, { duration: AO_PULSE.meioCiclo }),
      -1,
      true,
    );
  }, [visible, noMovement, opacity]);

  const estiloPonto = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (!visible) return null;

  return (
    <Animated.View entering={FadeIn.duration(AO_FADE.bannerDuration)}>
      <Box
        // O banner é desenhado pelo `Screen` FORA do conteúdo, então não herda
        // o gutter de ninguém — mas precisa ficar no prumo dele. Daí a margem
        // com o mesmo token, e não um `s16` copiado à mão.
        marginHorizontal="screen"
        marginBottom="s10"
        borderRadius="r14"
        paddingVertical="s11"
        paddingHorizontal="s13"
        flexDirection="row"
        alignItems="center"
        gap="s10"
        backgroundColor={showingSync ? 'primarySoft' : 'warningSoft'}
        accessibilityLiveRegion="polite"
      >
        <Animated.View style={estiloPonto}>
          <Box
            width={9}
            height={9}
            borderRadius="full"
            backgroundColor={showingSync ? 'primary' : 'warning'}
          />
        </Animated.View>
        <Box flex={1}>
          <Text variant="chipLabel" color={showingSync ? 'primary' : 'warning'} lineHeight={18}>
            {showingSync ? t.connection.syncing : t.connection.offline}
          </Text>
        </Box>
      </Box>
    </Animated.View>
  );
}
