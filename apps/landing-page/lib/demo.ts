/**
 * O ROTEIRO DA DEMONSTRAÇÃO DA PRIMEIRA DOBRA.
 *
 * Cada item é um QUADRO: o retrato completo do que está na tela naquele
 * instante, e não a lista do que mudou desde o anterior. É de propósito, e é o
 * que separa este arquivo de uma pilha de `setTimeout` encadeados — para saber
 * o que a tela mostra no passo 14 basta ler a linha 14, sem somar os treze
 * anteriores de cabeça.
 *
 * QUEM DESENHA NÃO É O JAVASCRIPT. `DemoDriver` só escreve estes campos como
 * atributos `data-*` na raiz; quem lê e pinta é o CSS, em `globals.css`. O
 * driver não sabe o que é um carrinho, e a marcação das três telas nunca sai do
 * servidor — ver o cabeçalho de `DemoStage.tsx`.
 *
 * ┌─ A REGRA QUE SEGURA O LCP ──────────────────────────────────────────────┐
 * │ O ESTADO SEM NENHUM ATRIBUTO — que é o HTML que o servidor manda, e o   │
 * │ que fica na tela se o JavaScript nunca chegar — é o PAINEL DEPOIS DA    │
 * │ VENDA, parado. Ele é igual, valor por valor, ao painel estático que a   │
 * │ página tinha antes desta demo existir.                                  │
 * │                                                                         │
 * │ Por isso todos os campos abaixo são "acréscimos" a esse estado, e não o │
 * │ contrário: `before` é o que REBOBINA o dia para R$ 1.208, `cart` é o    │
 * │ que ACENDE o carrinho. Nenhum quadro precisa apagar nada para o         │
 * │ primeiro pixel aparecer certo.                                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

/** Onde o ponteiro (ou, no celular, o anel de toque) está pousado. */
export type Target = "new" | "search" | "card" | "plus" | "minus" | "pay" | "confirm";

export interface Frame {
  /** Quanto este quadro fica na tela, em ms. */
  ms: number;
  /** Qual das três telas está à frente. */
  screen: "dash" | "pdv" | "sales";
  /** O dia ainda vale R$ 1.208 — a venda da demo não aconteceu. */
  before?: boolean;
  /** Onde o ponteiro está. Ausente = ponteiro fora da tela. */
  cursor?: Target;
  /** Pulso de clique neste quadro. */
  click?: boolean;
  /** Quantos caracteres de `COPY.hero.demo.pdv.typed` já foram digitados. */
  typed?: number;
  /** O catálogo está filtrado pela busca. */
  results?: boolean;
  /** O combo está no carrinho. */
  cart?: boolean;
  /** A quantidade do item no carrinho. */
  qty?: 1 | 2;
  /** O seletor de pagamento: aberto, ou já resolvido em Pix. */
  pay?: "open" | "pix";
  /** O botão de confirmar em "Registrando…". */
  saving?: boolean;
  /** O aviso de "Venda registrada" na tela. */
  toast?: boolean;
  /** A linha nova da lista, ainda destacada. */
  hl?: boolean;
}

const T = "combo".length; // 5 — o tamanho de `pdv.typed`.

/** Um quadro por caractere digitado, todos iguais menos o `typed`. */
const TYPING: Frame[] = Array.from({ length: T }, (_, i) => ({
  ms: 110,
  screen: "pdv",
  before: true,
  cursor: "search",
  typed: i + 1,
}));

/**
 * O ROTEIRO DE TELA LARGA — ~18,2s por volta.
 *
 * O primeiro quadro é o mais longo porque é o que já está na tela quando a
 * página termina de hidratar: a demo entra pelo estado parado, segura, e só
 * então rebobina para o começo do dia. Sem isso o primeiro movimento que o
 * visitante veria seria um número CAINDO de R$ 1.240 para R$ 1.208, que é o
 * contrário do que a página quer dizer.
 */
export const SCRIPT: Frame[] = [
  { ms: 3800, screen: "dash" },
  { ms: 1600, screen: "dash", before: true },
  { ms: 900, screen: "dash", before: true, cursor: "new" },
  { ms: 320, screen: "dash", before: true, cursor: "new", click: true },
  { ms: 700, screen: "pdv", before: true, cursor: "search" },
  ...TYPING,
  { ms: 700, screen: "pdv", before: true, cursor: "search", typed: T, results: true },
  { ms: 650, screen: "pdv", before: true, cursor: "card", typed: T, results: true },
  { ms: 320, screen: "pdv", before: true, cursor: "card", typed: T, results: true, click: true },
  { ms: 800, screen: "pdv", before: true, typed: T, results: true, cart: true, qty: 1 },
  {
    ms: 700,
    screen: "pdv",
    before: true,
    typed: T,
    results: true,
    cart: true,
    qty: 2,
    cursor: "plus",
    click: true,
  },
  {
    ms: 700,
    screen: "pdv",
    before: true,
    typed: T,
    results: true,
    cart: true,
    qty: 1,
    cursor: "minus",
    click: true,
  },
  {
    ms: 600,
    screen: "pdv",
    before: true,
    typed: T,
    results: true,
    cart: true,
    qty: 1,
    cursor: "pay",
    click: true,
    pay: "open",
  },
  {
    ms: 650,
    screen: "pdv",
    before: true,
    typed: T,
    results: true,
    cart: true,
    qty: 1,
    cursor: "pay",
    pay: "pix",
  },
  {
    ms: 800,
    screen: "pdv",
    before: true,
    typed: T,
    results: true,
    cart: true,
    qty: 1,
    pay: "pix",
    cursor: "confirm",
    click: true,
  },
  {
    ms: 900,
    screen: "pdv",
    before: true,
    typed: T,
    results: true,
    cart: true,
    qty: 1,
    pay: "pix",
    saving: true,
    toast: true,
  },
  /* A tela de Vendas entra AINDA COM OS NÚMEROS VELHOS. É o quadro que dá
     sentido ao seguinte: a lista sobe, e só então a venda cai no topo e o
     faturamento acompanha. Os dois juntos no mesmo quadro seriam um corte. */
  { ms: 800, screen: "sales", before: true, toast: true },
  { ms: 1400, screen: "sales", toast: true, hl: true },
  { ms: 1300, screen: "sales" },
];

/**
 * O ROTEIRO DE CELULAR — ~14,6s, treze quadros em vez de vinte.
 *
 * NÃO É O DE CIMA ENCOLHIDO. Some a digitação (num campo de 300px, cinco
 * caracteres aparecendo é ruído, e ninguém digita no balcão: toca no produto) e
 * some o ponteiro, que não existe em tela de toque — o clique vira o anel que
 * pulsa no próprio alvo. O que fica é o gesto que a pessoa realmente faz:
 * abrir, tocar no mais vendido, conferir a quantidade, escolher o Pix, cobrar.
 *
 * A TELA é a do portal no celular, e não a de desktop espremida: carrinho como
 * folha que sobe do rodapé, catálogo em duas colunas. Ver `globals.css`.
 */
export const SCRIPT_MOBILE: Frame[] = [
  { ms: 3400, screen: "dash" },
  { ms: 1400, screen: "dash", before: true },
  { ms: 700, screen: "dash", before: true, cursor: "new", click: true },
  { ms: 1000, screen: "pdv", before: true },
  { ms: 700, screen: "pdv", before: true, cursor: "card", click: true },
  { ms: 1000, screen: "pdv", before: true, cart: true, qty: 1 },
  { ms: 700, screen: "pdv", before: true, cart: true, qty: 2, cursor: "plus", click: true },
  { ms: 700, screen: "pdv", before: true, cart: true, qty: 1, cursor: "minus", click: true },
  {
    ms: 800,
    screen: "pdv",
    before: true,
    cart: true,
    qty: 1,
    pay: "pix",
    cursor: "pay",
    click: true,
  },
  {
    ms: 800,
    screen: "pdv",
    before: true,
    cart: true,
    qty: 1,
    pay: "pix",
    cursor: "confirm",
    click: true,
  },
  { ms: 900, screen: "pdv", before: true, cart: true, qty: 1, pay: "pix", saving: true, toast: true },
  { ms: 800, screen: "sales", before: true, toast: true },
  { ms: 1400, screen: "sales", toast: true, hl: true },
  { ms: 1200, screen: "sales" },
];
