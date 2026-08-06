import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';

import { Button } from '@components/ui/Button';
import { Box } from '@components/ui/Box';
import { Text } from '@components/ui/Text';
import { Touchable } from '@components/ui/Touchable';
import { useUIStore } from '@store/uiStore';

import { AO_FADE, AO_UP } from './animations';

/**
 * O diálogo de confirmação (`aoUp` sobre um véu `aoFade`).
 *
 * "Agora não" é a saída, e é ela que fica embaixo e sem cor: as três
 * confirmações do app (sair, cancelar venda, fechar caixa) são todas
 * irreversíveis o bastante para que o caminho fácil seja desistir.
 */
export function ConfirmHost() {
  const confirm = useUIStore((s) => s.confirm);
  const close = useUIStore((s) => s.closeConfirm);

  if (!confirm) return null;

  return (
    <Box position="absolute" top={0} left={0} right={0} bottom={0} justifyContent="center" padding="s26">
      <Animated.View
        entering={FadeIn.duration(180)}
        exiting={FadeOut.duration(AO_FADE.duration)}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      >
        <Touchable
          accessibilityLabel="Fechar"
          onPress={close}
          flex={1}
          backgroundColor="scrimDialog"
        />
      </Animated.View>

      <Animated.View
        entering={FadeInDown.duration(AO_UP.duration)
          .easing(AO_UP.easing)
          .withInitialValues({ transform: [{ translateY: AO_UP.offset }] })}
      >
        <Box backgroundColor="surface" borderRadius="r24" padding="s22">
          <Text variant="sheetTitle" accessibilityRole="header">
            {confirm.title}
          </Text>
          <Text variant="bodyRelaxed" color="textMuted" marginTop="s9" marginBottom="s20">
            {confirm.text}
          </Text>

          <Button
            title={confirm.buttonLabel}
            onPress={() => {
              const action = confirm.onConfirm;
              close();
              action();
            }}
            height={52}
            radius={15}
            // Destrutivo é vermelho; o resto segue o teal da ação.
            variant={confirm.destructive ? 'destrutivo' : 'primario'}
            textVariant="buttonSm"
          />

          <Box marginTop="s8">
            <Button
              title="Agora não"
              onPress={close}
              variant="fantasma"
              height={48}
              textColor="textMuted"
              textVariant="buttonXs"
            />
          </Box>
        </Box>
      </Animated.View>
    </Box>
  );
}
