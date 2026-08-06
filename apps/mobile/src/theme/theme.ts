import { createTheme } from '@shopify/restyle';

import { fontFamily } from './fonts';
import { palette } from './palette';

/**
 * Tema do Aguiar One.
 *
 * DECISÃO: tema de MARCA com dois conjuntos de tokens (claro/escuro), trocado
 * por preferência do usuário em Configurações › Preferências — não pelo modo do
 * sistema operacional. É o que o protótipo faz (o toggle "Tema escuro" vive nas
 * preferências) e é o que o produto quer: a identidade petrol/teal é a mesma nos
 * dois modos, só a superfície muda.
 *
 * Regra dura: nenhum componente escreve cor. Se um tom não existe aqui, a
 * correção é criar o token — nunca escrever o hex na tela.
 */

const spacing = {
  s0: 0,
  s2: 2,
  s3: 3,
  s4: 4,
  s5: 5,
  s6: 6,
  s7: 7,
  s8: 8,
  s9: 9,
  s10: 10,
  s11: 11,
  s12: 12,
  s13: 13,
  s14: 14,
  s15: 15,
  s16: 16,
  s18: 18,
  s20: 20,
  s22: 22,
  s24: 24,
  s26: 26,
  s28: 28,
  s30: 30,
  s34: 34,
  s38: 38,
  s40: 40,
  s60: 60,
  s150: 150,
} as const;

const borderRadii = {
  r0: 0,
  r3: 3,
  r6: 6,
  r8: 8,
  r10: 10,
  r11: 11,
  r12: 12,
  r13: 13,
  r14: 14,
  r15: 15,
  r16: 16,
  r17: 17,
  r18: 18,
  r20: 20,
  r22: 22,
  r24: 24,
  r26: 26,
  r28: 28,
  full: 999,
} as const;

/**
 * A escala tipográfica é grande porque o design a usa inteira: o protótipo
 * varia tamanho de 10,5 a 40 px em 5 pesos. Cada variante abaixo aparece de
 * fato em pelo menos uma tela — nada aqui é especulativo.
 */
const textVariants = {
  defaults: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: 'textPrimary',
  },

  // Números e valores
  heroValue: { fontFamily: fontFamily.extrabold, fontSize: 40, lineHeight: 44, letterSpacing: -1.2 },
  displayValue: { fontFamily: fontFamily.extrabold, fontSize: 36, lineHeight: 40, letterSpacing: -1 },
  totalValue: { fontFamily: fontFamily.extrabold, fontSize: 26, lineHeight: 32 },
  cardValue: { fontFamily: fontFamily.extrabold, fontSize: 22, lineHeight: 27 },
  statValue: { fontFamily: fontFamily.extrabold, fontSize: 20, lineHeight: 25 },
  moneyLg: { fontFamily: fontFamily.extrabold, fontSize: 17, lineHeight: 22 },
  moneyMd: { fontFamily: fontFamily.extrabold, fontSize: 15, lineHeight: 19 },
  moneyBase: { fontFamily: fontFamily.extrabold, fontSize: 14.5, lineHeight: 19 },

  // Títulos
  brandTitle: { fontFamily: fontFamily.extrabold, fontSize: 22, lineHeight: 22, letterSpacing: -0.4 },
  screenTitle: { fontFamily: fontFamily.extrabold, fontSize: 21, lineHeight: 24, letterSpacing: -0.3 },
  blockTitle: { fontFamily: fontFamily.extrabold, fontSize: 21, lineHeight: 27 },
  sheetTitle: { fontFamily: fontFamily.extrabold, fontSize: 18, lineHeight: 23 },
  logoLetter: { fontFamily: fontFamily.extrabold, fontSize: 19, lineHeight: 24 },
  gridPlus: { fontFamily: fontFamily.extrabold, fontSize: 16, lineHeight: 20 },
  avatarInitials: { fontFamily: fontFamily.extrabold, fontSize: 13, lineHeight: 17 },

  titleLg: { fontFamily: fontFamily.bold, fontSize: 17, lineHeight: 22 },
  titleMd: { fontFamily: fontFamily.bold, fontSize: 16.5, lineHeight: 21 },
  titleSm: { fontFamily: fontFamily.bold, fontSize: 14.5, lineHeight: 19 },
  titleXs: { fontFamily: fontFamily.bold, fontSize: 14, lineHeight: 18 },
  sectionTitle: { fontFamily: fontFamily.bold, fontSize: 13.5, lineHeight: 17 },
  sectionLabel: { fontFamily: fontFamily.bold, fontSize: 13, lineHeight: 17 },
  gridLabel: { fontFamily: fontFamily.bold, fontSize: 12.5, lineHeight: 16 },
  tinyBold: { fontFamily: fontFamily.bold, fontSize: 12, lineHeight: 15 },
  badge: { fontFamily: fontFamily.bold, fontSize: 11, lineHeight: 14 },
  tabLabel: { fontFamily: fontFamily.bold, fontSize: 10.5, lineHeight: 13 },

  // Botões
  buttonLg: { fontFamily: fontFamily.bold, fontSize: 16, lineHeight: 20 },
  buttonMd: { fontFamily: fontFamily.bold, fontSize: 15, lineHeight: 19 },
  buttonSm: { fontFamily: fontFamily.bold, fontSize: 14, lineHeight: 18 },
  buttonXs: { fontFamily: fontFamily.bold, fontSize: 13.5, lineHeight: 17 },
  buttonTiny: { fontFamily: fontFamily.bold, fontSize: 12.5, lineHeight: 16 },
  stepper: { fontFamily: fontFamily.bold, fontSize: 17, lineHeight: 21 },
  star: { fontFamily: fontFamily.bold, fontSize: 15, lineHeight: 19 },

  // Rótulos e formulário
  fieldValue: { fontFamily: fontFamily.semibold, fontSize: 14.5, lineHeight: 19 },
  inputValue: { fontFamily: fontFamily.semibold, fontSize: 14, lineHeight: 18 },
  rowLabel: { fontFamily: fontFamily.semibold, fontSize: 13.5, lineHeight: 17 },
  rowText: { fontFamily: fontFamily.semibold, fontSize: 13, lineHeight: 17 },
  chipLabel: { fontFamily: fontFamily.semibold, fontSize: 12.5, lineHeight: 16 },
  label: { fontFamily: fontFamily.semibold, fontSize: 12, lineHeight: 15 },
  fieldLabel: { fontFamily: fontFamily.semibold, fontSize: 11.5, lineHeight: 15 },
  tag: { fontFamily: fontFamily.semibold, fontSize: 11, lineHeight: 14 },
  axisLabel: { fontFamily: fontFamily.semibold, fontSize: 10.5, lineHeight: 13 },

  // Corpo
  body: { fontFamily: fontFamily.medium, fontSize: 15, lineHeight: 19 },
  bodyInput: { fontFamily: fontFamily.medium, fontSize: 14.5, lineHeight: 19 },
  bodyMd: { fontFamily: fontFamily.medium, fontSize: 14, lineHeight: 21 },
  bodyRelaxed: { fontFamily: fontFamily.medium, fontSize: 13.5, lineHeight: 21 },
  bodySm: { fontFamily: fontFamily.medium, fontSize: 13, lineHeight: 20 },
  bodyLoose: { fontFamily: fontFamily.medium, fontSize: 14.5, lineHeight: 23 },
  caption: { fontFamily: fontFamily.medium, fontSize: 12.5, lineHeight: 16 },
  captionSm: { fontFamily: fontFamily.medium, fontSize: 12, lineHeight: 16 },
  hint: { fontFamily: fontFamily.medium, fontSize: 11.5, lineHeight: 16 },
  micro: { fontFamily: fontFamily.medium, fontSize: 10.5, lineHeight: 14 },
} as const;

/**
 * O mapa de tokens semânticos.
 *
 * O tipo `Cores` alarga cada valor para `string`. Sem isso, o TS infere o hex
 * LITERAL vindo da paleta (`'#eef2f4'`) e o tema escuro deixa de compilar —
 * `'#0b1a21'` não é atribuível a `'#eef2f4'`. As CHAVES continuam precisas, que
 * é o que importa: são elas que viram `ThemeColor`.
 */
const tokensClaros = {
  transparent: palette.transparent,
  white: palette.white,

  bg: palette.bgLight,
  surface: palette.surfaceLight,
  surface2: palette.surface2Light,
  line: palette.lineLight,
  textPrimary: palette.textLight,
  textMuted: palette.mutedLight,

  primary: palette.tealLight,
  primarySoft: palette.tealSoftLight,
  onPrimary: palette.white,

  success: palette.greenLight,
  successSoft: palette.greenSoftLight,
  danger: palette.redLight,
  dangerSoft: palette.redSoftLight,
  warning: palette.amberLight,
  warningSoft: palette.amberSoftLight,
  warningBorder: palette.amberBorder,
  warningIconBg: palette.amberIconBg,

  petrol: palette.petrolLight,
  onPetrol: palette.onPetrolLight,
  onPetrolMuted: palette.onPetrolMuted,
  onPetrolFaint: palette.onPetrolFaint,
  onPetrolGhost: palette.onPetrolGhost,
  onPetrolLink: palette.onPetrolLink,
  fieldOnPetrol: palette.fieldOnPetrol,
  fieldBorderOnPetrol: palette.fieldBorderOnPetrol,
  pillOnPetrol: palette.pillOnPetrol,
  pillGhost: palette.pillGhost,
  pillGhostSoft: palette.pillGhostSoft,
  shiftPillBg: palette.shiftPillBg,
  shiftPillFg: palette.shiftPillFg,

  toastBg: palette.toast,
  scrimSheet: palette.scrimSheet,
  scrimDialog: palette.scrimDialog,
};

type Cores = { [K in keyof typeof tokensClaros]: string };

const lightColors: Cores = tokensClaros;

const darkColors: Cores = {
  ...lightColors,

  bg: palette.bgDark,
  surface: palette.surfaceDark,
  surface2: palette.surface2Dark,
  line: palette.lineDark,
  textPrimary: palette.textDark,
  textMuted: palette.mutedDark,

  primary: palette.tealDark,
  primarySoft: palette.tealSoftDark,

  success: palette.greenDark,
  successSoft: palette.greenSoftDark,
  danger: palette.redDark,
  dangerSoft: palette.redSoftDark,
  warning: palette.amberDark,
  warningSoft: palette.amberSoftDark,

  petrol: palette.petrolDark,
  onPetrol: palette.onPetrolDark,
};

export const lightTheme = createTheme({
  colors: lightColors,
  spacing,
  borderRadii,
  textVariants,
});

export const darkTheme: Theme = {
  ...lightTheme,
  colors: darkColors,
};

export type Theme = typeof lightTheme;
export type ThemeColor = keyof Theme['colors'];

/**
 * `defaults` fica de fora: é o fallback que o restyle aplica sozinho, não uma
 * variante que alguém deva passar em `variant`. Deixá-la no tipo faria o
 * autocomplete oferecer uma opção que não existe visualmente.
 */
export type TextVariant = Exclude<keyof Theme['textVariants'], 'defaults'>;
