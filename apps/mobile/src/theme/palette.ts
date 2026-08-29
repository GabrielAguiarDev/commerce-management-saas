import { BRAND } from '@aguiar/brand';

/**
 * Cores brutas do Aguiar One.
 *
 * Este é o ÚNICO arquivo do app onde hexadecimal é permitido (o ESLint bloqueia
 * hex fora daqui). Componentes falam por token semântico — ver `theme.ts`.
 *
 * Os valores vêm literalmente do protótipo de design (`design.html`, variáveis
 * CSS das linhas 29 e 848). Não "arredonde" nenhum deles.
 *
 * O QUE NÃO É MAIS ESCRITO AQUI: a identidade. O azul da marca em cada
 * luminosidade, o petrol e as três cores de estado chegam de `@aguiar/brand` —
 * o mesmo arquivo de onde saem os tokens dos portais e do site. Trocar a marca
 * é mexer lá, uma vez, e não aqui e em mais quatro lugares. O que continua
 * sendo deste app são as SUPERFÍCIES (o chão, o card, o campo) e as telas de
 * entrada, que são decisão do app sobre o app.
 */

/**
 * A mesma cor, lavada.
 *
 * O React Native não tem `color-mix`, então uma cor com alfa tem que ser
 * escrita por extenso. Sem este helper ela era escrita EM DECIMAL —
 * `rgba(53,181,218,0.16)` —, e naquela forma ninguém reconhece a marca: eram
 * sete cópias do azul e do petrol que nenhuma busca por `#35b5da` encontrava, e
 * que uma troca de marca deixaria para trás em silêncio.
 */
const alpha = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/**
 * As duas cores da MARCA, lidas do arquivo do logo: o azul do "A" e o petrol
 * quase preto em que ele se assenta.
 *
 * Ganham um apelido local — em vez de `BRAND.primary` repetido pelo objeto
 * inteiro — porque cada uma tem MAIS DE UM PAPEL aqui: a primária é a cor do
 * tema claro e também a base do degradê do próprio "A" e o fim do degradê do
 * botão "Entrar"; o secundário é o fundo do ícone e o chão do tema escuro.
 * Nomeados, esses papéis se leem no lugar onde são usados.
 *
 * O VALOR não é decidido aqui: vem de `@aguiar/brand`, e é o mesmo que
 * `--brand` / `--brand-ink` levam para os portais e para o site, e que
 * `pnpm brand:sync` escreve no `app.json` do splash e do ícone adaptativo.
 */
const BRAND_PRIMARY = BRAND.primary;
const BRAND_SECONDARY = BRAND.ink;

/**
 * A marca nos dois outros pontos de luminosidade de que os temas precisam.
 *
 * As duas são o MESMO AZUL — matiz 193°, o do "A" — e só isso: uma é a marca
 * aberta para sobreviver sobre o fundo escuro, a outra é a marca fechada para
 * poder ser LIDA sobre o fundo claro. Não existem sozinhas: são degraus da
 * primária, e por isso moram junto com ela, em `@aguiar/brand`.
 *
 * O que NÃO pode voltar a acontecer: a primária do tema escuro escorregar para
 * o teal (`#2fb3ba`, matiz 183°). Foi o que estava aqui, e o problema não era
 * o tom em si — era ter saído do azul da marca e ido parar ao lado do verde de
 * lucro, de forma que "primário" e "positivo" viravam a mesma cor de relance.
 * Azul é a marca; verde é dinheiro. Nunca a mesma família.
 *
 * `PRIMARY_DARK` dá 7,1:1 sobre `surfaceDark`, contra 5,2:1 da marca chapada.
 * `PRIMARY_TEXT` dá 5,3:1 sobre branco e 4,7:1 sobre `bgLight`, onde a marca
 * chapada dá 3,3:1 — suficiente para um botão ou uma borda, não para uma
 * palavra.
 */
const BRAND_PRIMARY_DARK = BRAND.lifted;
const BRAND_PRIMARY_TEXT = BRAND.text;

/**
 * A TINTA do tema claro — o petrol quase preto em que todo texto é escrito
 * sobre superfície clara.
 *
 * Fora do objeto pelo mesmo motivo das cores da marca: tem dois papéis. É o
 * `textLight` do app e é a tinta das telas de ENTRADA, que não seguem o tema.
 * Escrito duas vezes, um dia só um dos dois muda — e o título do login sai de
 * um preto e o do resto do app de outro.
 */
const INK = '#0f2a34';

export const palette = {
  // ── Claro ────────────────────────────────────────────────────────────────
  brandPrimary: BRAND_PRIMARY,
  brandSecondary: BRAND_SECONDARY,
  bgLight: '#eef2f4',
  surfaceLight: '#ffffff',
  surface2Light: '#f4f8f9',
  lineLight: alpha(INK, 0.11),
  textLight: INK,
  mutedLight: '#5f7783',
  /** A marca ESCRITA sobre superfície clara — ver `BRAND_PRIMARY_TEXT`. */
  primaryTextLight: BRAND_PRIMARY_TEXT,
  /** A marca lavada em branco a 12%. Fundo de avatar, chip e ícone destacado. */
  primarySoftLight: BRAND.soft,
  greenLight: BRAND.pos,
  greenSoftLight: BRAND.posSoft,
  redLight: BRAND.danger,
  redSoftLight: BRAND.dangerSoft,
  amberLight: BRAND.warn,
  amberSoftLight: BRAND.warnSoft,
  petrolLight: BRAND.petrol,
  onPetrolLight: '#eaf4f5',

  // ── Escuro ───────────────────────────────────────────────────────────────
  // O chão do tema escuro é o CHÃO DA LOGO: `bgDark` é o secundário da marca
  // levantado o mínimo para não ser preto, e cada superfície acima dele sobe
  // pelo mesmo azul quase-marinho. O app escuro e a marca que ele carrega
  // passam a estar na mesma luz. Os degraus continuam onde estavam: `surface`
  // é o card, `surface2` o campo.
  bgDark: '#030f1a',
  surfaceDark: '#0a1e2b',
  surface2Dark: '#102836',
  lineDark: 'rgba(255,255,255,0.10)',
  textDark: '#e9f2f4',
  mutedDark: '#94aeb8',
  primaryDark: BRAND_PRIMARY_DARK,
  primarySoftDark: alpha(BRAND_PRIMARY_DARK, 0.16),
  /** Verde de lucro, um passo mais verde para não vizinhar com o azul. */
  greenDark: BRAND.posDark,
  greenSoftDark: alpha(BRAND.posDark, 0.15),
  redDark: BRAND.dangerDark,
  redSoftDark: alpha(BRAND.dangerDark, 0.15),
  amberDark: BRAND.warnDark,
  amberSoftDark: alpha(BRAND.warnDark, 0.14),
  petrolDark: '#061a28',
  onPetrolDark: '#e9f2f4',

  // ── Constantes de marca (não mudam com o tema) ───────────────────────────
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',

  /**
   * A sombra colorida sob o FAB do carrinho.
   *
   * É a marca fechada em direção ao seu próprio escuro — a sombra de um botão
   * azul é azul. Era `#0b6b74`, verde-petróleo herdado do teal: com o botão em
   * `primary`, a sombra saía de uma família de cor diferente do objeto que a
   * projeta.
   */
  primaryShadow: '#0b5f77',

  /**
   * Fundo do toast. Fixo nos dois temas de propósito: no protótipo o toast é
   * sempre petrol escuro com texto branco (`toastBg: '#0f2a34'`), inclusive no
   * tema escuro, para destacar do card que está por baixo.
   */
  toast: '#0f2a34',

  /**
   * As cores POR TIPO do toast do Reactix (`@components/ui/toast`).
   *
   * Só aparecem em quem chama `Toast.show` direto pedindo um `type`: a fachada
   * do app (`useUIStore().showToast`) sempre passa `backgroundColor` e cai no
   * `toast` petrol acima, ou no vermelho do tema quando é erro.
   *
   * Os valores são os do componente original — não são cores da marca. Estão
   * aqui porque a paleta é o único lugar onde hex pode morar, e porque o dia em
   * que alguém quiser um verde nosso no toast de sucesso é aqui que ele mexe.
   */
  toastSuccess: '#10B981',
  toastError: '#EF4444',
  toastWarning: '#F59E0B',
  toastInfo: '#3B82F6',
  toastNeutral: '#262626',
  /** Ripple do Android sobre o toast — branco quase apagado. */
  toastRipple: 'rgba(255,255,255,0.1)',

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

  /**
   * Pill "Aberto às 08:12" do card de caixa aberto. Fica sobre o card petrol,
   * nos dois temas — daí ser a marca aberta, e não o `primary` do tema.
   */
  shiftPillBg: alpha(BRAND_PRIMARY_DARK, 0.22),
  shiftPillFg: '#8ad4ea',

  /** Borda do card de alerta de estoque (âmbar com alpha). */
  amberBorder: alpha(BRAND.warn, 0.2),
  amberIconBg: alpha(BRAND.warn, 0.14),

  // ── Telas de ENTRADA ─────────────────────────────────────────────────────
  // Fixas nos dois temas, como o toast: a entrada é sempre CLARA. Ela acontece
  // ANTES de haver usuário, e portanto antes de haver preferência de tema — uma
  // primeira tela que muda de cor conforme o que ficou salvo do dono anterior
  // do aparelho é uma tela que não se parece com ela mesma.
  //
  // Foi petrol escuro até 2026-08-13, e a troca é de LUZ, não de identidade: a
  // marca continua o azul sobre petrol, só que agora é o petrol que está na
  // tinta e o azul que está no fundo, lavado.

  /** O "A" da marca, do topo claro à base na cor primária. */
  logoTop: BRAND.hi,
  logoBottom: BRAND_PRIMARY,

  /**
   * O fundo, do azul lavado do topo ao branco quase puro da base.
   *
   * O `authBase` tem DOIS papéis: é a última parada do degradê do login e é o
   * fundo chapado das três telas de recuperação de senha. É de propósito que
   * seja a mesma cor — quem sai do login para "Esqueci minha senha" continua no
   * mesmo chão, e só o clarão do topo fica para trás.
   */
  authTop: '#d3e9f6',
  authMid: '#eaf4fa',
  authBase: '#f8fbfd',

  /** O halo atrás da marca. A opacidade é dada nas paradas do gradiente. */
  authGlow: '#8ec9e8',

  /**
   * A marca gigante e quase invisível atrás do topo.
   *
   * É a MARCA, não um cinza: sobre fundo claro, um véu neutro sujaria o azul do
   * degradê em vez de se somar a ele.
   *
   * CHAPADA, como o `authGlow` logo acima — a lavagem é dada por quem a usa, em
   * opacidade (ver `AuthBackdrop`). Já foi um `rgba(...,0.065)` e não funcionou:
   * a marca d'água é pintada por um gradiente do SVG, e o `stopColor` do
   * react-native-svg descarta o alfa da cor. O "A" saía chapado na marca cheia,
   * gritando no topo da tela.
   */
  authWatermark: BRAND_PRIMARY,

  /** A tinta da entrada — a mesma do tema claro. Ver `INK`. */
  authInk: INK,
  /** Rótulo de campo, assinatura da marca, texto de apoio. */
  authMuted: '#5a7480',
  /** O tom mais apagado que ainda se lê: contagem, rodapé, placeholder. */
  authFaint: '#88a0ab',

  /** Campo e cartão: branco chapado sobre o degradê, com borda de contorno. */
  authSurface: '#ffffff',
  authBorder: alpha(INK, 0.1),
  /** O quadrado atrás do ícone do cartão de suporte, e o aviso do mock. */
  authPill: '#eef4f7',
  /** As réguas do separador "ou". */
  authLine: alpha(INK, 0.09),

  /**
   * O azul ESCRITO da entrada — "Esqueceu a senha?", "Fale com o suporte".
   *
   * É a marca fechada (`BRAND_PRIMARY_TEXT`), e não a chapada: sobre branco, a
   * chapada dá 3,3:1, que sustenta um botão ou uma borda, não uma palavra. Era
   * a marca ABERTA enquanto o fundo era escuro — a inversão do fundo inverte
   * também qual das três luminosidades da marca pode ser lida.
   */
  authLink: BRAND_PRIMARY_TEXT,

  /**
   * A marca DESENHADA sobre a entrada: o "One" do letreiro e a borda do campo
   * em foco. Aqui pode ser a chapada — são traço e tipografia grande, não
   * palavra em corpo de texto.
   */
  authBrand: BRAND_PRIMARY,

  /** O gradiente do botão "Entrar" — termina na marca chapada. */
  ctaTop: BRAND.bright,
  ctaBottom: BRAND_PRIMARY,
} as const;

export type PaletteColor = keyof typeof palette;
