/**
 * Os poucos ícones que pertencem aos componentes desta lib, e não a uma tela.
 *
 * Todos desenham em `currentColor` e herdam o tamanho por prop: assim seguem o
 * tema claro/escuro sozinhos, sem precisar de uma segunda cópia do traço.
 * Ícones de navegação e de módulo continuam em cada app, porque dizem respeito
 * ao vocabulário daquele produto.
 */

export interface IconeProps {
  size?: number;
}

export function ChevronBaixoIcone({ size = 13 }: IconeProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M4.5 7 9 11.5 13.5 7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LupaIcone({ size = 14 }: IconeProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.7" />
      <path d="m12 12 3.5 3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function FecharIcone({ size = 15 }: IconeProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="m5 5 8 8M13 5l-8 8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
