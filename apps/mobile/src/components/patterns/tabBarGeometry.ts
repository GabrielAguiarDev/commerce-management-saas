/**
 * A GEOMETRIA DA TAB BAR — os números que três peças precisam concordar.
 *
 * A barra (`TabBar`), o botão central (`NewSaleButton`) e quem se apoia nela
 * (`CartBar`, o rodapé de rolagem do `Screen`) mediam a mesma
 * altura em constantes separadas. Mudar a altura da barra era mudar quatro
 * arquivos e torcer para que os quatro concordassem — na prática não
 * concordavam: a barra tinha 88px de altura mas só 61px de conteúdo, e os 27px
 * restantes eram um vazio que ainda somava a safe area por cima. Num iPhone com
 * indicador de home isso dava ~122px de barra para um item de 39px.
 *
 * Agora existe UM botão de ajuste — `ALTURA_TAB_BAR` — e todo o resto é
 * derivado dele.
 */

/**
 * ⬅️ MEXA AQUI. A altura ÚTIL da barra, em pontos.
 *
 * "Útil" = o que sobra para os ícones e rótulos. A safe area do aparelho
 * (indicador de home no iPhone, barra de gestos no Android) entra POR CIMA
 * disto, nunca no lugar: `TabBar` soma `insets.bottom` à altura e o repassa
 * como `paddingBottom`, então o conteúdo nunca cai sob o indicador e a barra
 * nunca fica espremida em aparelho sem inset.
 *
 * Faixa saudável: 52 (compacto) a 66 (folgado). O bloco de um item mede
 * `TAMANHO_ICONE_TAB + GAP_ITEM_TAB + ALTURA_ROTULO_TAB` = 39pt, e o que sobra
 * vira respiro dividido igualmente em cima e embaixo — abaixo de ~46 o rótulo
 * encosta na borda.
 */
export const ALTURA_TAB_BAR = 58;

/** O ícone de cada aba. */
export const TAMANHO_ICONE_TAB = 22;

/** Entre o ícone e o rótulo. Equivale ao token `s4`. */
export const GAP_ITEM_TAB = 4;

/** O `lineHeight` da variante `tabLabel` do tema. Se ela mudar lá, muda aqui. */
const ALTURA_ROTULO_TAB = 13;

const ALTURA_ITEM_TAB = TAMANHO_ICONE_TAB + GAP_ITEM_TAB + ALTURA_ROTULO_TAB;

/**
 * O respiro embaixo do rótulo, medido da base da área útil da barra.
 *
 * É o que centraliza o item na altura escolhida, e é POR ISSO que ele é
 * exportado: o "Vender" não vive dentro da barra (é um overlay que transborda
 * por cima dela), e sem esta medida o rótulo dele desalinharia dos outros
 * quatro a cada mudança de altura.
 */
export const BASE_ROTULO_TAB = (ALTURA_TAB_BAR - ALTURA_ITEM_TAB) / 2;

/**
 * O círculo do "Vender".
 *
 * Maior que os 44 do protótipo de navegador porque é O botão que o balconista
 * aperta dezenas de vezes por dia, e menor que os 52 de antes porque a barra
 * encolheu — um círculo que transborda mais do que a própria barra tem de alto
 * deixa de parecer parte dela.
 */
export const TAMANHO_BOTAO_VENDER = 48;

/**
 * O vão que a barra reserva para ele: o círculo mais 16 de folga de cada lado.
 *
 * Precisa sair do FLUXO da barra, e não ser só um recuo do botão: as quatro
 * abas são `flex: 1` e, sem tirar essa largura, se repartiriam a barra inteira
 * e os rótulos passariam por baixo do círculo.
 */
export const VAO_BOTAO_VENDER = TAMANHO_BOTAO_VENDER + 32;
