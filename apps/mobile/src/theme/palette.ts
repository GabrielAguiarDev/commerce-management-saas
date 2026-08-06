/**
 * Cores brutas do Aguiar One.
 *
 * Este é o ÚNICO arquivo do app onde hexadecimal é permitido (o ESLint bloqueia
 * hex fora daqui). Componentes falam por token semântico — ver `theme.ts`.
 *
 * Os valores vêm literalmente do protótipo de design (`design.html`, variáveis
 * CSS das linhas 29 e 848). Não "arredonde" nenhum deles.
 */

export const palette = {
  // ── Claro ────────────────────────────────────────────────────────────────
  bgLight: '#eef2f4',
  surfaceLight: '#ffffff',
  surface2Light: '#f4f8f9',
  lineLight: 'rgba(15,42,54,0.11)',
  textLight: '#0f2a34',
  mutedLight: '#5f7783',
  tealLight: '#0e7c86',
  tealSoftLight: '#e0f1f2',
  greenLight: '#17795e',
  greenSoftLight: '#e2f2ec',
  redLight: '#c4453c',
  redSoftLight: '#fbe9e7',
  amberLight: '#a9700f',
  amberSoftLight: '#fbf0dc',
  petrolLight: '#123c4a',
  onPetrolLight: '#eaf4f5',

  // ── Escuro ───────────────────────────────────────────────────────────────
  bgDark: '#0b1a21',
  surfaceDark: '#132a34',
  surface2Dark: '#193540',
  lineDark: 'rgba(255,255,255,0.10)',
  textDark: '#e9f2f4',
  mutedDark: '#94aeb8',
  tealDark: '#2fb3ba',
  tealSoftDark: 'rgba(47,179,186,0.16)',
  greenDark: '#43c193',
  greenSoftDark: 'rgba(67,193,147,0.15)',
  redDark: '#e3736a',
  redSoftDark: 'rgba(227,115,106,0.15)',
  amberDark: '#e0a950',
  amberSoftDark: 'rgba(224,169,80,0.14)',
  petrolDark: '#0d2029',
  onPetrolDark: '#e9f2f4',

  // ── Constantes de marca (não mudam com o tema) ───────────────────────────
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',

  /** Topo e base do gradiente do FAB de nova venda. */
  fabTop: '#149ba6',
  fabBottom: '#0b6b74',

  /**
   * Fundo do toast. Fixo nos dois temas de propósito: no protótipo o toast é
   * sempre petrol escuro com texto branco (`toastBg: '#0f2a34'`), inclusive no
   * tema escuro, para destacar do card que está por baixo.
   */
  toast: '#0f2a34',

  /** Véus dos overlays. */
  scrimSheet: 'rgba(6,20,26,0.5)',
  scrimDialog: 'rgba(6,20,26,0.55)',

  // ── Alpha sobre petrol (tela de login e cards petrol) ────────────────────
  onPetrolMuted: 'rgba(234,244,245,0.7)',
  onPetrolFaint: 'rgba(234,244,245,0.6)',
  onPetrolGhost: 'rgba(234,244,245,0.45)',
  onPetrolLink: 'rgba(234,244,245,0.75)',
  fieldOnPetrol: 'rgba(255,255,255,0.07)',
  fieldBorderOnPetrol: 'rgba(255,255,255,0.16)',
  pillOnPetrol: 'rgba(255,255,255,0.12)',
  pillGhost: 'rgba(255,255,255,0.2)',
  pillGhostSoft: 'rgba(255,255,255,0.18)',

  /** Pill "Aberto às 08:12" do card de caixa aberto. */
  shiftPillBg: 'rgba(47,179,186,0.22)',
  shiftPillFg: '#7fd7db',

  /** Borda do card de alerta de estoque (âmbar com alpha). */
  amberBorder: 'rgba(169,112,15,0.2)',
  amberIconBg: 'rgba(169,112,15,0.14)',
} as const;

export type PaletteColor = keyof typeof palette;
