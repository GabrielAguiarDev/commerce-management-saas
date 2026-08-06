/** Ícones do design system, referenciados por nome pelas rotas e pela grade. */
export type IconName =
  | 'home'
  | 'products'
  | 'cash'
  | 'stock'
  | 'costs'
  | 'reports'
  | 'settings'
  | 'support'
  | 'more'
  | 'cart';

export interface MoreItem {
  key: string;
  name: string;
  description: string;
  route: string;
  icon: IconName;
  /** Texto do badge vermelho; string vazia = sem badge. */
  badge: string;
}

export interface TabBarItem {
  key: string;
  label: string;
  route: string;
  icon: IconName;
}
