/**
 * A ALTURA DO HEADER DE TELA — o número que o `Screen` desenha e o toast precisa
 * conhecer.
 *
 * Existe por um motivo só: o toast é `position: 'absolute'` sobre a tela inteira
 * e nasce no topo. Sem esta medida ele pousava em `insets.top + 10`, ou seja,
 * EM CIMA do header — cobrindo título, subtítulo e avatar, e sobrando metade
 * dele por cima do primeiro campo do conteúdo. Quem lê o toast perde a
 * referência de onde está.
 *
 * Não é medido em runtime de propósito: o toast entra animado e ler o layout do
 * header pediria um `onLayout` num componente que não é ancestral dele, mais um
 * estado global só para transportar o número. O header tem altura FIXA (nada
 * aqui depende de conteúdo — o título é uma linha só, com `numberOfLines`
 * implícito no prumo do avatar), então a constante basta.
 *
 * ⚠️ Espelha os paddings e os `lineHeight` que o `Screen` usa. Se um dos dois
 * mudar lá, muda aqui — é o mesmo acordo do `ALTURA_ROTULO_TAB` em
 * `tabBarGeometry`.
 */

/** `paddingTop="s2"` do header. */
const RESPIRO_ACIMA = 2;

/** `lineHeight` da variante `screenTitle`. */
const ALTURA_TITULO = 24;

/** `marginTop="s3"` do subtítulo. */
const GAP_SUBTITULO = 3;

/** `lineHeight` da variante `caption`. */
const ALTURA_SUBTITULO = 16;

/** `paddingBottom="s12"` do header. */
const RESPIRO_ABAIXO = 12;

/**
 * A altura ÚTIL do header, sem a safe area — quem soma `insets.top` é o `Screen`
 * (num `paddingTop` na raiz) e, do outro lado, o toast.
 */
export const ALTURA_HEADER =
  RESPIRO_ACIMA + ALTURA_TITULO + GAP_SUBTITULO + ALTURA_SUBTITULO + RESPIRO_ABAIXO;
