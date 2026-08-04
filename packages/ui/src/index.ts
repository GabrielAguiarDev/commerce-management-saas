/**
 * A biblioteca de componentes dos portais Aguiar One.
 *
 * O que entra aqui é o que os dois portais desenham igual: o campo, o select, o
 * menu de ações, a moldura do modal, o painel, o selo. O que é próprio de um
 * produto — uma tela, um cartão de módulo, um item de navegação — continua no
 * `components/` do app, montado sobre estas peças.
 *
 * Os tokens vivem em `@aguiar/ui/tokens.css` e são importados uma vez pelo
 * `globals.css` de cada app.
 */

export { css, fonte, MONO, SANS } from "./css";
export { ChevronBaixoIcone, FecharIcone, LupaIcone, type IconeProps } from "./icons";

export {
  BOTAO_MENU,
  botaoPrimario,
  botaoSecundario,
  CABECA_PAINEL,
  CABECALHO_TABELA,
  CAIXA_VAZIA,
  campo,
  chip,
  corDoTom,
  faixaKpis,
  GRUPO_PILULAS,
  iniciais,
  ITEM_MENU,
  itemMenuDestaque,
  LISTA,
  NUM,
  PAINEL,
  PAINEL_GRANDE,
  PAINEL_MENU,
  pilula,
  ponto,
  fundoDoTom,
  QUEBRA_MOBILE,
  ROTULO_CAMPO,
  ROTULO_KPI,
  rotuloColuna,
  selo,
  SUB_TELA,
  TITULO_PAINEL,
  TITULO_TELA,
  trilha,
  type Tom,
} from "./styleKit";

export {
  AreaTexto,
  Campo,
  CampoBusca,
  CampoDinheiro,
  CampoRotulado,
  Rotulado,
  Selecao,
  SelecaoSimples,
} from "./components/Campos";

export {
  ItemMenu,
  MenuAcoes,
  MenuDeAcoes,
  type AcaoMenu,
} from "./components/MenuAcoes";

export {
  EscolhaCartao,
  IconeModal,
  ModalBase,
  PilulaEscolha,
  RodapeModal,
} from "./components/Modal";

export {
  BotaoNovo,
  CabecalhoTela,
  FaixaKpis,
  GrupoPilulas,
  Interruptor,
  LimparFiltros,
  Painel,
  RolagemH,
  Sugestoes,
  Vazio,
  type Kpi,
} from "./components/Layout";
