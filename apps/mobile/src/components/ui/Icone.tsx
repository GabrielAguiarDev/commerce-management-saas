import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useAppTheme } from '@hooks/useAppTheme';
import type { ThemeColor } from '@theme';

/**
 * Conjunto de ícones do Aguiar One.
 *
 * Os `path` são exatamente os do protótipo (design.html) — copiar o desenho e
 * não "um parecido do Feather" é o que mantém o peso de traço e o cantinho
 * arredondado idênticos ao design.
 *
 * Todos herdam `stroke="currentColor"` via a prop `cor` (token do tema, nunca
 * hex) e nascem sem preenchimento, como no original.
 */

export type NomeIcone =
  | 'voltar'
  | 'busca'
  | 'escanear'
  | 'inicio'
  | 'produtos'
  | 'caixa'
  | 'estoque'
  | 'custos'
  | 'relatorios'
  | 'config'
  | 'suporte'
  | 'mais'
  | 'carrinho'
  | 'cadeado'
  | 'alerta';

interface IconeProps {
  nome: NomeIcone;
  tamanho?: number;
  cor?: ThemeColor;
  /** Sobrepõe o token quando a cor não vem do tema (ex.: sobre o petrol). */
  corLiteral?: string;
}

/** Espessura de traço por ícone, como no design (varia entre 1.8 e 2.2). */
const ESPESSURA: Record<NomeIcone, number> = {
  voltar: 2.2,
  busca: 2,
  escanear: 1.9,
  inicio: 1.9,
  produtos: 1.9,
  caixa: 1.9,
  estoque: 1.9,
  custos: 1.9,
  relatorios: 1.9,
  config: 1.8,
  suporte: 1.9,
  mais: 2.1,
  carrinho: 2,
  cadeado: 1.8,
  alerta: 2,
};

export function Icone({ nome, tamanho = 22, cor = 'textPrimary', corLiteral }: IconeProps) {
  const tema = useAppTheme();
  const traco = corLiteral ?? tema.colors[cor];

  const comum = {
    stroke: traco,
    strokeWidth: ESPESSURA[nome],
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none">
      {nome === 'voltar' && <Path d="M15 5l-7 7 7 7" {...comum} />}

      {nome === 'busca' && (
        <>
          <Circle cx={11} cy={11} r={6.5} {...comum} />
          <Path d="M16 16l4 4" {...comum} />
        </>
      )}

      {nome === 'escanear' && (
        <Path
          d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M7 12h10"
          {...comum}
        />
      )}

      {nome === 'inicio' && (
        <>
          <Path d="M4 11l8-6.5 8 6.5" {...comum} />
          <Path d="M6.5 10v9h11v-9" {...comum} />
        </>
      )}

      {nome === 'produtos' && (
        <>
          <Path d="M4 11.5V5h6.5L20 14.5 14.5 20 5 10.5" {...comum} />
          <Circle cx={8} cy={8} r={1.3} {...comum} />
        </>
      )}

      {nome === 'caixa' && (
        <>
          <Rect x={3} y={7} width={18} height={12} rx={3} {...comum} />
          <Path d="M3 12h18M10 15h4" {...comum} />
        </>
      )}

      {nome === 'estoque' && (
        <>
          <Path d="M4 8.5L12 5l8 3.5-8 3.5-8-3.5z" {...comum} />
          <Path d="M4 8.5V16l8 3.5 8-3.5V8.5" {...comum} />
          <Path d="M12 12v7.5" {...comum} />
        </>
      )}

      {nome === 'custos' && (
        <>
          <Path d="M6 3.5h12v17l-3-1.8-3 1.8-3-1.8-3 1.8z" {...comum} />
          <Path d="M9 8h6M9 12h6" {...comum} />
        </>
      )}

      {nome === 'relatorios' && (
        <>
          <Path d="M4 20h16" {...comum} />
          <Path d="M7 20v-6M12 20V8M17 20v-9" {...comum} />
        </>
      )}

      {nome === 'config' && (
        <>
          <Circle cx={12} cy={12} r={3} {...comum} />
          <Path
            d="M12 3.5v2.2M12 18.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"
            {...comum}
          />
        </>
      )}

      {nome === 'suporte' && (
        <>
          <Path d="M20 12.5a7.5 7.5 0 1 0-3.1 6.1L20 19.5z" {...comum} />
          <Path d="M9.6 9.8a2.5 2.5 0 1 1 3.4 2.4v1.3" {...comum} />
          <Path d="M13 16.2v.4" {...comum} />
        </>
      )}

      {nome === 'mais' && (
        <>
          <Circle cx={5.5} cy={12} r={1.4} {...comum} />
          <Circle cx={12} cy={12} r={1.4} {...comum} />
          <Circle cx={18.5} cy={12} r={1.4} {...comum} />
        </>
      )}

      {nome === 'carrinho' && (
        <>
          <Path d="M3 5h2.2l2.1 9.4h9.4l1.8-6.6H6.2" {...comum} />
          <Circle cx={9} cy={19} r={1.4} {...comum} />
          <Circle cx={16.5} cy={19} r={1.4} {...comum} />
        </>
      )}

      {nome === 'cadeado' && (
        <>
          <Rect x={4} y={10} width={16} height={10} rx={3} {...comum} />
          <Path d="M8 10V7.5a4 4 0 0 1 8 0V10" {...comum} />
        </>
      )}

      {nome === 'alerta' && (
        <>
          <Path d="M12 8v5M12 16.5v.5" {...comum} />
          <Circle cx={12} cy={12} r={9} {...comum} />
        </>
      )}
    </Svg>
  );
}
