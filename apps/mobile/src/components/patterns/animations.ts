import { Easing } from 'react-native-reanimated';

/**
 * Os quatro movimentos do design, traduzidos dos `@keyframes` do protótipo
 * para Reanimated. Ficam num arquivo só para que nenhuma tela invente uma
 * duração própria — é o que faz o app parecer uma coisa só.
 *
 *   aoUp    → entrada de 14px de baixo + fade, 220ms  (toast, confirm, barra do carrinho)
 *   aoSheet → slide de baixo, 260ms, cubic-bezier(.2,.8,.25,1)  (bottom sheet)
 *   aoFade  → 200–300ms lineares  (backdrops e banner)
 *   aoPulse → opacidade 1 ↔ 0,45 em 1,6s, infinito  (ponto do banner)
 */

export const AO_UP = {
  offset: 14,
  duration: 220,
  easing: Easing.out(Easing.ease),
} as const;

export const AO_SHEET = {
  duration: 260,
  /** A curva exata do CSS: cubic-bezier(.2,.8,.25,1). */
  easing: Easing.bezier(0.2, 0.8, 0.25, 1),
  /** A saída é um pouco mais curta que a entrada — fechar precisa ser rápido. */
  exitDuration: 200,
} as const;

export const AO_FADE = {
  duration: 200,
  bannerDuration: 300,
} as const;

export const AO_PULSE = {
  /** Meio ciclo: 1 → 0,45. O ciclo completo do CSS é 1,6s. */
  meioCiclo: 800,
  minOpacity: 0.45,
} as const;
