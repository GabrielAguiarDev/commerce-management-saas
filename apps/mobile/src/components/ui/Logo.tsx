import { MARK } from '@aguiar/brand';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { useAppTheme } from '@hooks/useAppTheme';
import type { ThemeColor } from '@theme';

/**
 * O "AO" do Aguiar One.
 *
 * É EM VETOR, e não o `assets/splash-icon.png`, por duas razões que o PNG não
 * resolve: ele precisa aparecer em 56pt na marca e em ~300pt na marca d'água do
 * fundo (um bitmap de 500px serve bem um dos dois, não os dois), e precisa
 * receber o GRADIENTE do design — o arquivo é chapado na cor primária, e
 * `tintColor` só troca uma cor por outra, também chapada.
 *
 * Os três caminhos — o "A", a barra sob ele e o "O" aberto — são o CONTORNO do
 * arquivo da marca, traçado dele, e vêm de `MARK` em `@aguiar/brand`: o mesmo
 * desenho de onde saíram os ícones do PWA e todos os PNGs dos portais. Se a
 * marca mudar, é lá que ela muda — não aqui, e não no olho.
 */

/** A caixa do desenho, em unidades do traçado. Cerca de 1,70 : 1. */
const LARGURA = MARK.width;
const ALTURA = MARK.height;

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
              o padrão (a caixa de cada `Path`): são TRÊS caminhos com caixas
              diferentes — a barra começa abaixo do meio, e o "O" não chega ao
              ápice do "A". Pelo padrão, cada um se dissolveria dentro da
              própria caixa, e na mesma altura da tela a barra já estaria
              apagada com o "A" ainda cheio; a marca deixaria de ser uma peça só.

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

      <Path d={MARK.paths.a} fill={fill} />
      <Path d={MARK.paths.bar} fill={fill} />
      <Path d={MARK.paths.o} fill={fill} />
    </Svg>
  );
}
