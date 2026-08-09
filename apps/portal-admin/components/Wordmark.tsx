/**
 * "Aguiar One" por extenso, com "One" no azul da marca.
 *
 * As duas palavras saem DENTRO do mesmo `<span>`, e não em duas caixas lado a
 * lado: assim elas dividem a mesma linha de base e o espaço entre elas é o da
 * própria fonte. Em dois elementos com `gap`, esse espaço seria um número
 * imitando um espaço — e erraria por um fio a cada tamanho.
 *
 * É o mesmo letreiro do app mobile (`AuthScreen.tsx`, o `Brand`), e é dele que
 * vem a regra: o nome é uma palavra branca e uma palavra azul, não um bloco de
 * cor única.
 */

interface WordmarkProps {
  /** O corpo da fonte, em pixels. */
  size?: number;
  /**
   * Onde o letreiro está assentado.
   *
   * `side` é a barra lateral, que é escura nos dois temas e por isso recebe
   * branco e o azul de link da entrada do app. `surface` é qualquer fundo claro
   * do console — lá o azul da entrada sumiria, e quem entra é o `--accent`.
   */
  on?: "side" | "surface";
}

const TONES = {
  side: { name: "#fff", one: "var(--side-accent)" },
  surface: { name: "var(--text)", one: "var(--accent)" },
} as const;

export function Wordmark({ size = 15.5, on = "side" }: WordmarkProps) {
  const tone = TONES[on];

  return (
    <span
      style={{
        fontSize: size + "px",
        fontWeight: 600,
        letterSpacing: "-.015em",
        color: tone.name,
        whiteSpace: "nowrap",
      }}
    >
      Aguiar <span style={{ color: tone.one }}>One</span>
    </span>
  );
}
