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
 * Dois estados, duas cores, como no protótipo:
 *  - offline → âmbar, "suas vendas estão salvas";
 *  - voltando → teal, "sincronizando…" (some sozinho depois de ~2,4s; quem
 *    controla esse relógio é `useMonitorDeConexao`, não este componente).
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

  const visible = !online || syncing;

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
            {online ? t.connection.syncing : t.connection.offline}
          </Text>
        </Box>
      </Box>
    </Animated.View>
  );
}
