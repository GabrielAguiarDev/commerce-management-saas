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
  brandPrimary: '#1B9ABD',
  brandSecondary: '#020E18',
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

  // ── Tela de ENTRADA ──────────────────────────────────────────────────────
  // Fixas nos dois temas, como o toast: o login é sempre escuro. Ele acontece
  // ANTES de haver usuário, e portanto antes de haver preferência de tema — um
  // login que muda de cor conforme o que ficou salvo do dono anterior do
  // aparelho é uma primeira tela que não se parece com ela mesma.

  /** O "A" da marca, do topo claro à base na cor primária. */
  logoTop: '#4cc4e6',
  logoBottom: '#1b9abd',

  /**
   * O fundo, do azul do topo ao quase-preto da base.
   *
   * O `authBase` tem DOIS papéis: é a última parada do degradê do login e é o
   * fundo chapado das três telas de recuperação de senha. É de propósito que
   * seja a mesma cor — quem sai do login para "Esqueci minha senha" continua no
   * mesmo chão, e só o clarão do topo fica para trás.
   */
  authTop: '#0e5375',
  authMid: '#072634',
  authBase: '#020e18',

  /** O halo atrás da marca. A opacidade é dada nas paradas do gradiente. */
  authGlow: '#2fb6e6',

  /** A marca gigante e quase invisível atrás do topo. */
  authWatermark: 'rgba(126,208,238,0.05)',

  /**
   * O azul dos links sobre o fundo da entrada.
   *
   * Não é o `primary`: no tema escuro ele é teal esverdeado (`#2fb3ba`), e
   * sobre este fundo azul o link sairia de outra família de cor que o resto da
   * tela.
   */
  authLink: '#35abd6',

  /** O gradiente do botão "Entrar". */
  ctaTop: '#38b7de',
  ctaBottom: '#1a90bd',
} as const;

export type PaletteColor = keyof typeof palette;
