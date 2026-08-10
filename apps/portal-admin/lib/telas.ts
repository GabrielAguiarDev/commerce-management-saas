import { MOBILE_BREAKPOINT } from "@aguiar/ui";

/**
 * As larguras em que o painel muda de forma.
 *
 * O painel se veste com `style` inline — não existe folha de estilo onde uma
 * `@media` pudesse morar —, então quem escolhe o desenho é JavaScript, lendo
 * `s.screenWidth`. Estes são os dois cortes, e ficam num arquivo só para que o
 * ouvinte de `resize` (em `AdminProvider`) saiba exatamente quando vale a pena
 * gravar uma largura nova.
 *
 * `MOBILE_BREAKPOINT` (900px) vem de `@aguiar/ui` e é o mesmo dos dois portais:
 * abaixo dele a barra lateral vira gaveta, as tabelas viram cartões e o diálogo
 * vira folha. Uma tela não pode ser "estreita" num portal e larga no outro.
 */
export { MOBILE_BREAKPOINT };

/**
 * A faixa intermediária — tablet deitado, janela de notebook dividida ao meio.
 *
 * Cabe mais que num celular, mas não a tabela de sete colunas do Financeiro nem
 * os dois painéis do Suporte lado a lado. Era o `1000` escrito à mão nessas duas
 * telas; agora as duas leem a mesma constante.
 */
export const COMPACT_BREAKPOINT = 1000;

/** Ordenado do menor para o maior — é a lista que o `resize` observa. */
export const LARGURAS = [MOBILE_BREAKPOINT, COMPACT_BREAKPOINT];
