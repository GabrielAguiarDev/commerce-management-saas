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

export type IconName =
  | 'back'
  | 'search'
  | 'scan'
  | 'home'
  | 'products'
  | 'cash'
  | 'stock'
  | 'costs'
  | 'reports'
  | 'settings'
  | 'support'
  | 'more'
  | 'cart'
  | 'lock'
  | 'alert';

interface IconProps {
  name: IconName;
  size?: number;
  color?: ThemeColor;
  /** Sobrepõe o token quando a cor não vem do tema (ex.: sobre o petrol). */
  colorOverride?: string;
}

/** Espessura de traço por ícone, como no design (varia entre 1.8 e 2.2). */
const STROKE_WIDTH: Record<IconName, number> = {
  back: 2.2,
  search: 2,
  scan: 1.9,
  home: 1.9,
  products: 1.9,
  cash: 1.9,
  stock: 1.9,
  costs: 1.9,
  reports: 1.9,
  settings: 1.8,
  support: 1.9,
  more: 2.1,
  cart: 2,
  lock: 1.8,
  alert: 2,
};

export function Icon({ name, size = 22, color = 'textPrimary', colorOverride }: IconProps) {
  const theme = useAppTheme();
  const stroke = colorOverride ?? theme.colors[color];

  const common = {
    stroke,
    strokeWidth: STROKE_WIDTH[name],
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {name === 'back' && <Path d="M15 5l-7 7 7 7" {...common} />}

      {name === 'search' && (
        <>
          <Circle cx={11} cy={11} r={6.5} {...common} />
          <Path d="M16 16l4 4" {...common} />
        </>
      )}

      {name === 'scan' && (
        <Path
          d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M7 12h10"
          {...common}
        />
      )}

      {name === 'home' && (
        <>
          <Path d="M4 11l8-6.5 8 6.5" {...common} />
          <Path d="M6.5 10v9h11v-9" {...common} />
        </>
      )}

      {name === 'products' && (
        <>
          <Path d="M4 11.5V5h6.5L20 14.5 14.5 20 5 10.5" {...common} />
          <Circle cx={8} cy={8} r={1.3} {...common} />
        </>
      )}

      {name === 'cash' && (
        <>
          <Rect x={3} y={7} width={18} height={12} rx={3} {...common} />
          <Path d="M3 12h18M10 15h4" {...common} />
        </>
      )}

      {name === 'stock' && (
        <>
          <Path d="M4 8.5L12 5l8 3.5-8 3.5-8-3.5z" {...common} />
          <Path d="M4 8.5V16l8 3.5 8-3.5V8.5" {...common} />
          <Path d="M12 12v7.5" {...common} />
        </>
      )}

      {name === 'costs' && (
        <>
          <Path d="M6 3.5h12v17l-3-1.8-3 1.8-3-1.8-3 1.8z" {...common} />
          <Path d="M9 8h6M9 12h6" {...common} />
        </>
      )}

      {name === 'reports' && (
        <>
          <Path d="M4 20h16" {...common} />
          <Path d="M7 20v-6M12 20V8M17 20v-9" {...common} />
        </>
      )}

      {name === 'settings' && (
        <>
          <Circle cx={12} cy={12} r={3} {...common} />
          <Path
            d="M12 3.5v2.2M12 18.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"
            {...common}
          />
        </>
      )}

      {name === 'support' && (
        <>
          <Path d="M20 12.5a7.5 7.5 0 1 0-3.1 6.1L20 19.5z" {...common} />
          <Path d="M9.6 9.8a2.5 2.5 0 1 1 3.4 2.4v1.3" {...common} />
          <Path d="M13 16.2v.4" {...common} />
        </>
      )}

      {name === 'more' && (
        <>
          <Circle cx={5.5} cy={12} r={1.4} {...common} />
          <Circle cx={12} cy={12} r={1.4} {...common} />
          <Circle cx={18.5} cy={12} r={1.4} {...common} />
        </>
      )}

      {name === 'cart' && (
        <>
          <Path d="M3 5h2.2l2.1 9.4h9.4l1.8-6.6H6.2" {...common} />
          <Circle cx={9} cy={19} r={1.4} {...common} />
          <Circle cx={16.5} cy={19} r={1.4} {...common} />
        </>
      )}

      {name === 'lock' && (
        <>
          <Rect x={4} y={10} width={16} height={10} rx={3} {...common} />
          <Path d="M8 10V7.5a4 4 0 0 1 8 0V10" {...common} />
        </>
      )}

      {name === 'alert' && (
        <>
          <Path d="M12 8v5M12 16.5v.5" {...common} />
          <Circle cx={12} cy={12} r={9} {...common} />
        </>
      )}
    </Svg>
  );
}
