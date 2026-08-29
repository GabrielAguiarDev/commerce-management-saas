/**
 * Como a última linha de um grid fecha sem sobrar buraco.
 *
 * POR QUE ISTO EXISTE: a quantidade de cartões do dashboard varia com o plano
 * do cliente — cinco para quem não tem Caixa nem Estoque, sete para quem tem
 * tudo, oito quando ainda cabe uma sugestão de módulo. Num grid de colunas
 * iguais, qualquer contagem que não seja múltipla do número de colunas deixa a
 * última linha pela metade, e é isso que faz a tela parecer inacabada.
 *
 * `repeat(auto-fit, minmax(...))` NÃO resolve isso, e a confusão é fácil de
 * fazer: `auto-fit` colapsa colunas VAZIAS EM TODAS AS LINHAS. Com sete
 * cartões em cinco colunas, as cinco colunas têm item na primeira linha, então
 * nenhuma colapsa — e os três slots vazios da segunda linha continuam lá.
 * `auto-fit` escolhe quantas colunas cabem; ele não redistribui a sobra.
 *
 * Quem redistribui é esta função: as colunas são fixas e conhecidas por
 * breakpoint, e os itens da última linha se esticam via `grid-column: span N`
 * até somarem a largura inteira. Não mede o DOM, não observa redimensionamento
 * e não guarda estado — a mesma contagem devolve sempre o mesmo resultado, no
 * servidor e no navegador.
 */

/**
 * O `span` de cada um dos `itemCount` itens, em ordem.
 *
 * As linhas cheias saem todas com 1. Os itens da última linha dividem entre si
 * as colunas que sobraram: cada um leva pelo menos `base`, e os `extra`
 * ÚLTIMOS levam uma coluna a mais — é o que absorve o resto da divisão sem
 * deixar nenhum item com meia coluna.
 *
 * POR QUE O EXTRA VAI PARA O FIM, e não para o começo: o cartão de módulo
 * sugerido é sempre o último item da lista, e é justamente ele que se
 * beneficia de largura — tem título, nome, uma frase e um botão, enquanto um
 * cartão de métrica tem um número. Jogando a sobra para o fim, quem estica é o
 * cartão certo, e os demais da última linha continuam alinhados com as colunas
 * da linha de cima: o alargamento acontece todo na borda direita.
 *
 * Garantias, que os testes de mesa cobrem: a soma dos spans de cada linha é
 * sempre igual a `columns`, e nenhum span passa de `columns`.
 */
export function distribuirSpans(itemCount: number, columns: number): number[] {
  if (itemCount <= 0 || columns <= 0) return [];
  if (columns === 1) return Array(itemCount).fill(1);

  const rest = itemCount % columns;

  // A contagem fecha certo: toda linha está cheia, ninguém precisa esticar.
  if (rest === 0) return Array(itemCount).fill(1);

  const leftover = columns - rest;
  const base = 1 + Math.floor(leftover / rest);
  const extra = leftover % rest;

  const spans = Array(itemCount).fill(1);
  const firstOfLastRow = itemCount - rest;

  for (let i = 0; i < rest; i++) {
    spans[firstOfLastRow + i] = i >= rest - extra ? base + 1 : base;
  }

  return spans;
}

/** As colunas que o desktop pode usar, da mais densa para a menos densa. */
export const COLUNAS_DESKTOP = [4, 3];

/** No celular só cabem duas, e não há escolha a fazer. */
export const COLUNAS_MOBILE = [2];

/**
 * A fatia da linha que um item ocupa, de 0 a 1.
 *
 * É esta a medida que interessa, e não o `span` cru: um `span` 2 é metade da
 * tela em quatro colunas e a tela inteira em duas. Quem decide se um cartão
 * ficou largo demais para o layout empilhado é a fração, nunca o span.
 */
export function fracaoDeLargura(span: number, columns: number): number {
  return columns > 0 ? span / columns : 1;
}

/**
 * Quantas colunas usar para `itemCount` itens, entre as `opcoes` oferecidas.
 *
 * POR QUE ESCOLHER: com quatro colunas fixas, cinco cartões viram
 * `[1,1,1,1] + [4]` — o quinto sozinho ocupando a linha inteira, um retângulo
 * de 1300px com um número de 24px dentro. Trocando para três colunas os mesmos
 * cinco viram `[1,1,1] + [1,2]`, e o mais largo para em dois terços. A mesma
 * contagem, sem buraco nas duas, mas uma delas não constrange nenhum cartão.
 *
 * O CRITÉRIO É A MAIOR FRAÇÃO DE LARGURA, não o maior `span`. Minimizar o span
 * levaria a respostas sem sentido: com um único item, quatro colunas dão span
 * 4, três dão 3 e duas dão 2 — e os três resultados são o mesmo cartão de 100%
 * de largura. Empate resolve para MAIS colunas, que é o que preserva a
 * densidade da tela; cair para três só se paga quando compra alguma coisa.
 *
 * Pura de propósito: depende só da contagem, que por sua vez depende só dos
 * módulos do plano. Não mede o DOM e não olha dado transacional — se as colunas
 * pudessem mudar porque uma venda entrou, o dashboard inteiro reflowaria na
 * frente do usuário, o que é pior que o buraco que tudo isto veio consertar.
 */
export function melhorNumeroDeColunas(itemCount: number, opcoes: number[]): number {
  const validas = opcoes.filter((c) => c > 0);
  if (validas.length === 0) return 1;

  const maiorOpcao = Math.max(...validas);
  if (itemCount <= 0) return maiorOpcao;

  let escolhida = maiorOpcao;
  let melhorFracao = Infinity;

  for (const columns of validas) {
    const spans = distribuirSpans(itemCount, columns);
    const fracao = fracaoDeLargura(Math.max(...spans), columns);

    // Empate fica com a opção de mais colunas: mesma largura máxima, mais densidade.
    if (fracao < melhorFracao || (fracao === melhorFracao && columns > escolhida)) {
      melhorFracao = fracao;
      escolhida = columns;
    }
  }

  return escolhida;
}

/** As duas leituras da mesma grade: a do desktop e a do celular. */
export interface LayoutDaGrade {
  colunasDesktop: number;
  colunasMobile: number;
  spansDesktop: number[];
  spansMobile: number[];
}

/**
 * Os DOIS layouts da grade, calculados de uma vez.
 *
 * POR QUE OS DOIS, e não só o do breakpoint atual: a largura real da janela só
 * é conhecida no navegador. O `screenWidth` do provider começa em 1440 e só é
 * medido num efeito depois da montagem — quem lesse `isMobile` para escolher as
 * colunas pintaria o primeiro quadro do celular com quatro colunas e saltaria
 * para duas no quadro seguinte. Não é um ajuste de espaçamento: é a ESTRUTURA
 * da grade mudando na frente de quem abriu a página.
 *
 * Calculando os dois aqui, o servidor manda ambos como variáveis CSS e quem
 * escolhe é a media query, antes do primeiro pixel. Nenhum efeito, nenhuma
 * medição de DOM, nenhum salto — e a mesma função pura serve às duas leituras.
 */
export function layoutDaGrade(itemCount: number): LayoutDaGrade {
  const colunasDesktop = melhorNumeroDeColunas(itemCount, COLUNAS_DESKTOP);
  const colunasMobile = melhorNumeroDeColunas(itemCount, COLUNAS_MOBILE);

  return {
    colunasDesktop,
    colunasMobile,
    spansDesktop: distribuirSpans(itemCount, colunasDesktop),
    spansMobile: distribuirSpans(itemCount, colunasMobile),
  };
}

/**
 * O cartão ganhou mais largura do que a cota de uma coluna?
 *
 * É este o gatilho do layout horizontal, e não uma fração fixa. "Fração >= 0,5"
 * parecia equivalente e não é: no celular, com duas colunas, MEIA LINHA É A
 * LARGURA NORMAL de um cartão — a regra por fração deixaria o portal inteiro
 * horizontal no celular sem que nenhum cartão tivesse recebido nada a mais.
 * `span > 1` diz exatamente o que importa, e diz igual nos dois breakpoints.
 */
export function ehLargo(span: number): boolean {
  return span > 1;
}
