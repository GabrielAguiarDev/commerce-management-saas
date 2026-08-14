import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { useAppTheme } from '@hooks/useAppTheme';
import type { ThemeColor } from '@theme';

/**
 * O "A" do Aguiar One.
 *
 * É EM VETOR, e não o `assets/splash-icon.png`, por duas razões que o PNG não
 * resolve: ele precisa aparecer em 92pt na marca e em 340pt na marca d'água do
 * fundo (um bitmap de 500px serve bem um dos dois, não os dois), e precisa
 * receber o GRADIENTE do design — o arquivo é chapado na cor primária, e
 * `tintColor` só troca uma cor por outra, também chapada.
 *
 * Os dois caminhos abaixo são o CONTORNO EXATO desse mesmo PNG, traçado dele:
 * o desenho é poligonal, então os vértices são exatos, não aproximados. Se a
 * marca mudar, é do arquivo que os novos vértices saem — não do olho.
 */

/** A caixa do desenho, em unidades do traçado. Quase quadrada, mas não. */
const LARGURA = 217;
const ALTURA = 219;

/** A haste longa: do ápice, desce à direita; volta pelo vinco interno. */
const HASTE = 'M109 0 L217 219 L160 219 L81 58 Z';

/** A perna curta, com o entalhe que abre o vão do "A". */
const PERNA = 'M48 119 L82 119 L112 183 L74.7 183 L58 219 L0 219 Z';

interface LogoProps {
  /** A ALTURA em pontos; a largura acompanha a proporção do desenho. */
  size?: number;
  /**
   * Pinta a marca de uma cor só, em vez do gradiente.
   *
   * É o que a marca d'água do fundo usa: lá o desenho é um relevo do fundo, e
   * o gradiente da marca de verdade dentro de outro gradiente vira sujeira.
   */
  color?: ThemeColor;
  /**
   * A marca se DISSOLVE em direção à base — a cor cheia no ápice, nada no pé.
   *
   * Só faz sentido com `color`, e existe para a marca d'água do fundo: chapada,
   * ela terminava numa aresta reta atravessada na tela, e o corte anunciava que
   * ali havia um desenho colado por cima do fundo. Dissolvida, ela some antes
   * de terminar, e o que fica é relevo.
   */
  fadeBase?: boolean;
}

export function Logo({ size = 92, color, fadeBase = false }: LogoProps) {
  const theme = useAppTheme();

  const width = (size * LARGURA) / ALTURA;

  const chapada = color ? theme.colors[color] : undefined;
  const esmaecida = chapada !== undefined && fadeBase;
  const fill = chapada === undefined ? 'url(#aoLogo)' : esmaecida ? 'url(#aoLogoFade)' : chapada;

  return (
    <Svg width={width} height={size} viewBox={`0 0 ${LARGURA} ${ALTURA}`}>
      {color ? null : (
        <Defs>
          {/* Na diagonal do próprio desenho: o claro entra pelo ápice e sai
              pela base da haste, que é como a luz do fundo cai na tela. */}
          <LinearGradient id="aoLogo" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={theme.colors.logoTop} />
            <Stop offset="1" stopColor={theme.colors.logoBottom} />
          </LinearGradient>
        </Defs>
      )}

      {esmaecida && chapada ? (
        <Defs>
          {/* `gradientUnits="userSpaceOnUse"` medindo a ALTURA do desenho, e não
              o padrão (a caixa de cada `Path`): são DOIS caminhos com caixas
              diferentes — a perna começa na metade da haste. Pelo padrão, cada
              um se dissolveria dentro da própria caixa, e na mesma altura da
              tela a perna já estaria apagada com a haste ainda cheia; o "A"
              deixaria de ser uma peça só.

              Três paradas, e não duas: a queda fica quase toda no terço de
              baixo. Numa rampa reta a marca já chega esmaecida à altura do
              letreiro, que é justamente onde ela precisa estar. */}
          <LinearGradient
            id="aoLogoFade"
            x1="0"
            y1="0"
            x2="0"
            y2={ALTURA}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor={chapada} stopOpacity={1} />
            <Stop offset="0.55" stopColor={chapada} stopOpacity={0.72} />
            <Stop offset="1" stopColor={chapada} stopOpacity={0} />
          </LinearGradient>
        </Defs>
      ) : null}

      <Path d={HASTE} fill={fill} />
      <Path d={PERNA} fill={fill} />
    </Svg>
  );
}
