import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Box } from '@components/ui/Box';
import { Logo } from '@components/ui/Logo';
import { useAppTheme } from '@hooks/useAppTheme';

/**
 * O FUNDO da tela de entrada — três camadas, nesta ordem.
 *
 *  1. o degradê de base, do azul do topo ao quase-preto do rodapé;
 *  2. o halo, um clarão redondo atrás de onde a marca cai;
 *  3. a marca d'água, o mesmo "A" em tamanho grande no canto superior direito.
 *
 * A ordem importa: a marca d'água vem DEPOIS do halo porque ela é o relevo mais
 * próximo da superfície — passada por baixo, o clarão a apagaria justamente na
 * faixa em que ela existe.
 *
 * Tudo aqui é decoração: `pointerEvents="none"` na moldura para que nenhuma das
 * camadas roube o toque dos campos que ficam por cima.
 */
export function AuthBackdrop() {
  const theme = useAppTheme();
  const { width } = useWindowDimensions();

  // O halo acompanha a LARGURA da tela, não uma altura fixa: é um clarão
  // redondo, e amarrá-lo a um número de pontos o deixaria oval no tablet e
  // apertado no aparelho estreito.
  const alturaHalo = width * 0.95;

  return (
    <Box style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={[theme.colors.authTop, theme.colors.authMid, theme.colors.authBottom]}
        // O azul se entrega CEDO, e o escuro chega antes dos campos: é dele que
        // vem o contraste do texto branco e da borda de 16% dos campos. Esticar
        // a virada até a base deixava o formulário inteiro sobre azul médio —
        // bonito parado, ilegível de dia na rua.
        locations={[0, 0.26, 0.56]}
        style={StyleSheet.absoluteFill}
      />

      <Svg width={width} height={alturaHalo} style={styles.halo}>
        <Defs>
          <RadialGradient id="aoAuthGlow" cx="50%" cy="34%" rx="60%" ry="50%">
            <Stop offset="0" stopColor={theme.colors.authGlow} stopOpacity={0.3} />
            <Stop offset="0.55" stopColor={theme.colors.authGlow} stopOpacity={0.09} />
            <Stop offset="1" stopColor={theme.colors.authGlow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#aoAuthGlow)" />
      </Svg>

      {/* Sangra pela direita e pelo topo de propósito: cortada, ela lê como um
          relevo do fundo. Inteira e centrada no canto, leria como um segundo
          logotipo competindo com o de verdade. */}
      <Box position="absolute" top={-28} right={-72}>
        <Logo size={300} color="authWatermark" />
      </Box>
    </Box>
  );
}

const styles = StyleSheet.create({
  // Ancorado no TOPO, e não centrado: o clarão nasce acima da marca e desce.
  halo: { position: 'absolute', top: 0, left: 0 },
});
