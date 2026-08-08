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
   * um gradiente dentro de outro gradiente vira sujeira.
   */
  color?: ThemeColor;
}

export function Logo({ size = 92, color }: LogoProps) {
  const theme = useAppTheme();

  const width = (size * LARGURA) / ALTURA;
  const fill = color ? theme.colors[color] : 'url(#aoLogo)';

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

      <Path d={HASTE} fill={fill} />
      <Path d={PERNA} fill={fill} />
    </Svg>
  );
}
