import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Box } from '@components/ui/Box';
import { Logo } from '@components/ui/Logo';
import { useAppTheme } from '@hooks/useAppTheme';

/**
 * O FUNDO da tela de LOGIN — três camadas, nesta ordem.
 *
 *  1. o degradê de base, do azul lavado do topo ao branco do rodapé;
 *  2. o halo, um clarão redondo atrás de onde a marca cai;
 *  3. a marca d'água: o mesmo "A" em três tamanhos, cruzando a faixa do topo.
 *
 * A ordem importa: a marca d'água vem DEPOIS do halo porque ela é o relevo mais
 * próximo da superfície — passada por baixo, o clarão a lavaria justamente na
 * faixa em que ela existe.
 *
 * SÓ O LOGIN recebe isto. Os três passos da recuperação de senha ficam no
 * `authBase` chapado, que é a cor em que este degradê termina: o efeito da
 * marca é a ABERTURA do app, e repetido em cada passo viraria papel de parede.
 *
 * Tudo aqui é decoração: `pointerEvents="none"` na moldura para que nenhuma das
 * camadas roube o toque dos campos que ficam por cima.
 */
/**
 * O quanto a marca d'água aparece no seu ponto MAIS FORTE — o ápice de cada
 * "A", de onde ela só se dissolve para baixo.
 *
 * 8,5% e não mais: acima disso os vincos do desenho ganham aresta nítida atrás
 * do letreiro, e o fundo passa a ser o assunto do topo em vez da marca.
 */
const OPACIDADE_MARCA = 0.085;

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
        colors={[theme.colors.authTop, theme.colors.authMid, theme.colors.authBase]}
        // O azul se entrega CEDO, e o branco chega antes dos campos: é sobre ele
        // que a borda de 10% dos campos existe. Esticar a virada até a base
        // deixava o formulário inteiro sobre azul, onde um campo branco de borda
        // clara perde o contorno e vira um retângulo flutuando.
        locations={[0, 0.3, 0.62]}
        style={StyleSheet.absoluteFill}
      />

      <Svg width={width} height={alturaHalo} style={styles.halo}>
        <Defs>
          <RadialGradient id="aoAuthGlow" cx="50%" cy="30%" rx="62%" ry="52%">
            <Stop offset="0" stopColor={theme.colors.authGlow} stopOpacity={0.28} />
            <Stop offset="0.55" stopColor={theme.colors.authGlow} stopOpacity={0.1} />
            <Stop offset="1" stopColor={theme.colors.authGlow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#aoAuthGlow)" />
      </Svg>

      {/* As três marcas SANGRAM pelas bordas de propósito: cortadas, elas leem
          como relevo do fundo. Inteiras e centradas, cada uma leria como um
          segundo logotipo competindo com o de verdade.

          Elas não se tocam por acaso — é uma constelação em torno de onde a
          marca de verdade cai, e não uma ladrilhagem: a maior abre o canto
          direito, a do meio equilibra à esquerda, e a menor fecha o topo. Todas
          na MESMA cor e opacidade (`authWatermark`); a diferença de presença
          entre elas vem só do tamanho.

          Nenhuma passa da FAIXA DO TOPO: a mais baixa termina por volta dos
          300pt, acima do primeiro rótulo. Descendo até os campos, a aresta do
          "A" cruzava a borda do campo branco e o desenho passava a ler como
          risco na tela, não como relevo do fundo.

          `fadeBase` nas três, pelo mesmo motivo em outra medida: cada uma se
          dissolve em direção ao próprio pé, então nenhuma TERMINA — elas somem
          antes de acabar, e o fim de cada marca deixa de ser uma linha reta
          atravessada na tela.

          A LAVAGEM está aqui, na opacidade da moldura, e não na cor: o
          `authWatermark` é a marca chapada, e o gradiente que a dissolve mede a
          própria opacidade de 1 a 0 no espaço do desenho. Fossem as duas coisas
          na cor, uma teria de multiplicar a outra — e o `stopColor` do
          react-native-svg descarta o alfa, então a conta não fecharia. */}
      <Box position="absolute" top={-34} right={-84} opacity={OPACIDADE_MARCA}>
        <Logo size={300} color="authWatermark" fadeBase />
      </Box>

      <Box position="absolute" top={54} left={-92} opacity={OPACIDADE_MARCA}>
        <Logo size={218} color="authWatermark" fadeBase />
      </Box>

      <Box position="absolute" top={-58} left={52} opacity={OPACIDADE_MARCA}>
        <Logo size={162} color="authWatermark" fadeBase />
      </Box>
    </Box>
  );
}

const styles = StyleSheet.create({
  // Ancorado no TOPO, e não centrado: o clarão nasce acima da marca e desce.
  halo: { position: 'absolute', top: 0, left: 0 },
});
