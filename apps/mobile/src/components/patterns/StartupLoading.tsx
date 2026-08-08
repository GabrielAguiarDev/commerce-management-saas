import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { Box } from '@components/ui/Box';
import { Text } from '@components/ui/Text';
import { AO_PULSE } from '@components/patterns/animations';
import { useTranslation } from '@i18n';

/** O atraso entre um ponto e o próximo — é ele que faz a onda, e não três
 *  pontos piscando juntos. Um terço do meio ciclo. */
const PASSO = Math.round(AO_PULSE.meioCiclo / 3);

/**
 * A ESPERA DA ABERTURA.
 *
 * O portão em `app/(app)/_layout.tsx` tem um estado `hold`: entre autenticar e
 * abrir o app, ele ainda precisa saber quais módulos o plano inclui. Esse
 * intervalo desenhava um `Box` vazio — tela lisa, sem uma palavra. Curto quando
 * a rede ajuda, longo quando não, e em ambos os casos indistinguível de um app
 * que travou logo depois do login.
 *
 * É a mesma regra que criou a `StartupError`, um passo antes: **o portão nunca
 * pode renderizar nada em silêncio.** Lá ele não sabe para onde ir e diz por
 * quê; aqui ele sabe, e só pede um instante.
 *
 * A cópia é de PROPÓSITO sobre o usuário, não sobre nós: "preparando tudo para
 * você", e não "verificando seu plano". Quem acabou de digitar a senha não
 * pediu uma auditoria de contrato — pediu para entrar. Falar em plano bem na
 * espera insinua que o acesso está em dúvida, que é justamente a leitura errada
 * (e a tela de `blocked` já existe para quando estiver mesmo).
 *
 * Divide o layout com a `StartupError` — mesmo fundo, mesma marca no mesmo
 * ponto — porque `hold` pode virar `error`. Alinhados, o que troca é só o
 * miolo; desalinhados, a falha pareceria uma tela nova aparecendo do nada.
 */
export function StartupLoading() {
  const t = useTranslation();

  return (
    <Box
      flex={1}
      backgroundColor="bg"
      justifyContent="center"
      alignItems="center"
      paddingHorizontal="s30"
      accessibilityLabel={t.startup.a11yLabel}
    >
      {/* A mesma marca da tela de login, no mesmo tamanho. Vindo de lá, é o
          único elemento que continua na tela — o que faz a espera parecer a
          continuação do login, e não um app diferente abrindo. */}
      <Box
        width={56}
        height={56}
        borderRadius="r18"
        backgroundColor="primary"
        alignItems="center"
        justifyContent="center"
        marginBottom="s22"
      >
        <Text variant="logoLetter" color="white">
          A
        </Text>
      </Box>

      <Text variant="blockTitle" textAlign="center" marginBottom="s10" accessibilityRole="header">
        {t.startup.title}
      </Text>

      <Text variant="bodyLoose" color="textMuted" textAlign="center">
        {t.startup.text}
      </Text>

      <Pontos />
    </Box>
  );
}

/**
 * Três pontos em onda. É o indicador mais barato que existe e o único que não
 * precisa de biblioteca: um `ActivityIndicator` traria a cor e o ritmo do
 * sistema para dentro de uma tela que é toda do tema.
 *
 * Pulsa no ritmo do `AO_PULSE`, o mesmo do esqueleto e do ponto do banner de
 * conexão — "o app está trabalhando" tem UMA cadência no produto inteiro.
 */
function Pontos() {
  const noMovement = useReducedMotion();

  return (
    <Box flexDirection="row" gap="s8" marginTop="s28" accessibilityElementsHidden>
      {[0, 1, 2].map((i) => (
        <Ponto key={i} delay={i * PASSO} still={noMovement} />
      ))}
    </Box>
  );
}

function Ponto({ delay, still }: { delay: number; still: boolean }) {
  // O genérico é explícito: `AO_PULSE` é `as const`, então `minOpacity` tem
  // tipo `0.45` e a shared value nasceria travada nesse literal — nenhum outro
  // valor de opacidade compilaria depois.
  const opacity = useSharedValue<number>(AO_PULSE.minOpacity);

  useEffect(() => {
    // Movimento reduzido não apaga o indicador — congela os três acesos. Some
    // a animação, fica a informação de que há algo em curso.
    if (still) {
      opacity.value = 1;
      return;
    }
    opacity.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: AO_PULSE.meioCiclo }), -1, true),
    );
  }, [delay, still, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={style}>
      <Box width={8} height={8} borderRadius="full" backgroundColor="primary" />
    </Animated.View>
  );
}
