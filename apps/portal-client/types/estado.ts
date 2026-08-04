import type {
  CaixaAberto,
  CaixaFechado,
  Chamado,
  Custo,
  DadosNegocio,
  FormaPagamento,
  Funcionario,
  ItemCarrinho,
  ModuloKey,
  MovEstoque,
  Negocio,
  Papel,
  Produto,
  Tema,
  TipoCusto,
  TipoMovCaixa,
  TipoMovEstoque,
  Venda,
} from "./types";

/* -------------------------------------------------------------------------- */
/* Sobreposições                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Os modais do portal. Um de cada vez — abrir um fecha o anterior, que é o
 * comportamento do design e o que evita duas camadas empilhadas no celular.
 */
export type Modal =
  | { k: "detalheVenda"; id: string }
  | { k: "produto"; id: string | null }
  | { k: "movEstoque" }
  | { k: "custo"; id: string | null }
  | { k: "caixaAbrir" }
  | { k: "caixaMov"; tipo: TipoMovCaixa }
  | { k: "caixaFechar" }
  | { k: "caixaDetalhe"; id: string }
  | { k: "funcionario"; id: string }
  | { k: "papel"; id: string | null }
  | { k: "novoChamado" };

/**
 * A confirmação é sempre a mesma caixa: o que vai acontecer, sobre o quê, e se
 * dá para voltar atrás. `acao` é o que roda quando a pessoa confirma.
 */
export interface Confirmacao {
  titulo: string;
  texto: string;
  resumo: string;
  sub: string;
  /** "Dá para desfazer depois" — o que tira o medo de clicar. */
  reversao: string;
  btn: string;
  btnBg: string;
  btnFg: string;
  cor: string;
  acao: () => void;
}

export interface Dica {
  texto: string;
  x: number;
  y: number;
}

/* -------------------------------------------------------------------------- */
/* Rascunhos dos formulários                                                   */
/* -------------------------------------------------------------------------- */

export interface FormProduto {
  id: string | null;
  nome: string;
  preco: string;
  categoria: string;
  /** Digitando uma categoria nova em vez de escolher da lista. */
  catNova: boolean;
  ativo: boolean;
  fav: boolean;
  servico: boolean;
  codigo: string;
  custo: string;
  estoque: string;
  minimo: string;
  unidade: string;
  tentouSalvar: boolean;
}

export interface FormCusto {
  id: string | null;
  tipo: TipoCusto;
  descricao: string;
  categoria: string;
  valor: string;
  /** Dias atrás, escolhido na lista. Vira `cost_date` na hora de salvar. */
  d: number;
  recorrente: boolean;
  tentouSalvar: boolean;
}

export interface FormMov {
  tipo: TipoMovEstoque;
  produtoId: string | null;
  qtd: string;
  custo: string;
  motivo: string;
  tentouSalvar: boolean;
}

export interface FormCaixa {
  valor: string;
  motivo: string;
  obs: string;
  /**
   * Quanto foi contado na gaveta. Só dinheiro: Pix e cartão caem na conta e são
   * conferidos no extrato — é o que `close_cash_register` espera.
   */
  contadoDinheiro: string;
}

export interface FormPapel {
  id: string | null;
  nome: string;
  modulos: ModuloKey[];
  tentouSalvar: boolean;
}

export interface FormChamado {
  assunto: string;
  categoria: string;
  descricao: string;
  anexo: string;
  tentouEnviar: boolean;
}

export interface FormResposta {
  texto: string;
  anexo: string;
}

/* -------------------------------------------------------------------------- */
/* Filtros                                                                     */
/* -------------------------------------------------------------------------- */

export type PeriodoVendas = "hoje" | "7" | "30" | "tudo";
export type PeriodoRel = "hoje" | "7" | "30" | "90";
export type AbaEstoque = "itens" | "movs";
export type AbaConfig = "dados" | "prefs" | "equipe" | "conta";

export interface FiltrosVendas {
  periodo: PeriodoVendas;
  pag: string;
  produto: string;
  busca: string;
}

export interface FiltrosProdutos {
  busca: string;
  cat: string;
  status: string;
  soBaixo: boolean;
}

export interface FiltrosEstoque {
  aba: AbaEstoque;
  busca: string;
  status: string;
  cat: string;
  ordem: string;
  movTipo: string;
  movProduto: string;
  movPeriodo: string;
}

export interface FiltrosCustos {
  tipo: string;
  cat: string;
  periodo: string;
}

export interface FiltrosConfig {
  aba: AbaConfig;
}

export interface FiltrosSuporte {
  busca: string;
  status: string;
}

/* -------------------------------------------------------------------------- */
/* Os dados que o servidor entrega                                             */
/* -------------------------------------------------------------------------- */

/**
 * O retrato do negócio lido no servidor a cada navegação.
 *
 * O provider NÃO edita nada disto: toda escrita vai a uma Server Action e o
 * `router.refresh()` traz o retrato novo. É o que garante que a tela mostre o
 * que está no banco, e não o que o navegador acha que gravou.
 */
export interface DadosPortal {
  negocio: Negocio;
  dados: DadosNegocio;
  produtos: Produto[];
  vendas: Venda[];
  movs: MovEstoque[];
  custos: Custo[];
  caixaAberto: CaixaAberto | null;
  caixasFechados: CaixaFechado[];
  papeis: Papel[];
  equipe: Funcionario[];
  chamados: Chamado[];
  /** Preenchido quando a leitura falhou — a tela avisa em vez de mentir "vazio". */
  erro: string | null;
}

/* -------------------------------------------------------------------------- */
/* O estado                                                                    */
/* -------------------------------------------------------------------------- */

export interface PortalState {
  /* Aparência e ambiente */
  tema: Tema;
  /**
   * Assume desktop até o listener de resize contar a verdade, para que o
   * render do servidor e o primeiro render do cliente concordem.
   */
  larguraTela: number;
  colapsada: boolean;
  navAberto: boolean;
  notifAberto: boolean;
  logoutAberto: boolean;
  dica: Dica | null;

  /**
   * Preferências de uso.
   *
   * Ainda NÃO têm tabela: valem só nesta sessão e voltam ao padrão no próximo
   * login. A tela de Configurações diz isso em voz alta. Ver a análise.
   */
  formasAceitas: FormaPagamento[];
  imprimirComprovante: boolean;
  pedirCliente: boolean;

  /**
   * Rascunho dos dados do negócio. O salvo vive no retrato do servidor (`d`);
   * este é só o que está sendo digitado.
   */
  dadosRascunho: DadosNegocio;

  /* PDV */
  carrinho: ItemCarrinho[];
  pagAtual: FormaPagamento;
  buscaProd: string;
  codigo: string;
  carrinhoAberto: boolean;
  /** Venda em edição no PDV — `null` quando é uma venda nova. */
  editandoVenda: string | null;

  /* Filtros */
  fVendas: FiltrosVendas;
  fProdutos: FiltrosProdutos;
  fEstoque: FiltrosEstoque;
  fCustos: FiltrosCustos;
  fRel: { periodo: PeriodoRel; comparar: boolean };
  fConfig: FiltrosConfig;
  fSuporte: FiltrosSuporte;

  /* Sobreposições */
  menuLinha: string | null;
  modal: Modal | null;
  conf: Confirmacao | null;
  toast: string;
  /** Uma escrita em andamento — trava os botões que a disparariam de novo. */
  salvando: boolean;

  /* Rascunhos */
  formProduto: FormProduto;
  formCusto: FormCusto;
  formMov: FormMov;
  formCaixa: FormCaixa;
  formPapel: FormPapel;
  formChamado: FormChamado;
  formResposta: FormResposta;
}

export type Patch = Partial<PortalState>;

export interface PortalActions {
  set: (p: Patch) => void;
  toggleTema: () => void;
  irPara: (rota: string) => void;
  avisar: (texto: string) => void;
  confirmar: (c: Confirmacao) => void;
  fecharConf: () => void;
  fecharModal: () => void;
  abrirModal: (m: Modal) => void;
  /** Abre o menu de linha da chave dada, ou fecha o que estiver aberto. */
  abrirMenu: (chave: string | null) => void;
  sair: () => void;

  /* Vendas e PDV */
  addCarrinho: (p: Produto) => void;
  mudarQtd: (nome: string, delta: number) => void;
  removerItem: (nome: string) => void;
  limparCarrinho: () => void;
  registrarVenda: () => void;
  editarVenda: (id: string) => void;
  estornarVenda: (id: string) => void;
  desfazerEstorno: (id: string) => void;

  /* Produtos */
  abrirProduto: (id: string | null) => void;
  salvarProduto: () => void;
  toggleFav: (id: string) => void;
  toggleAtivo: (id: string) => void;
  excluirProduto: (id: string) => void;

  /* Estoque */
  abrirMov: (produtoId?: string, tipo?: TipoMovEstoque) => void;
  salvarMov: () => void;
  reverterMov: (id: string) => void;

  /* Custos */
  abrirCusto: (id: string | null) => void;
  salvarCusto: () => void;
  excluirCusto: (id: string) => void;

  /* Caixa */
  abrirCaixa: () => void;
  registrarMovCaixa: () => void;
  reverterMovCaixa: (id: string) => void;
  fecharCaixa: () => void;
  reabrirCaixa: (id: string) => void;

  /* Configurações */
  salvarDados: () => void;
  descartarDados: () => void;
  toggleForma: (f: FormaPagamento) => void;
  abrirPapel: (id: string | null) => void;
  salvarPapel: () => void;
  removerPapel: (id: string) => void;
  toggleFuncionario: (id: string) => void;
  mudarPapelDoFuncionario: (id: string, papelId: string) => void;

  /* Suporte */
  abrirNovoChamado: () => void;
  enviarChamado: () => void;
  responderChamado: (id: string) => void;
  resolverChamado: (id: string) => void;
  reabrirChamado: (id: string) => void;
  marcarLido: (id: string) => void;
}

/** O que toda tela recebe — a forma que `usePortal()` devolve. */
export interface ViewProps {
  s: PortalState;
  a: PortalActions;
  /** Módulos que o plano deste cliente liga. */
  modulos: ModuloKey[];
  tem: (m: ModuloKey) => boolean;
  isMobile: boolean;
  isDesktop: boolean;
  /** Atalhos para o retrato do servidor, para as telas não escreverem `s.dados.` */
  d: DadosPortal;
}
