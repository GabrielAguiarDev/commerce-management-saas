import type {
  CaixaAberto,
  CaixaFechado,
  Chamado,
  Custo,
  DadosNegocio,
  FormaPagamento,
  Funcionario,
  ItemCarrinho,
  LinhaLog,
  ModuloKey,
  MovEstoque,
  Papel,
  PerfilKey,
  Preferencias,
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
  | { k: "detalheVenda"; id: number }
  | { k: "produto"; id: number | null }
  | { k: "movEstoque" }
  | { k: "custo"; id: number | null }
  | { k: "caixaAbrir" }
  | { k: "caixaMov"; tipo: TipoMovCaixa }
  | { k: "caixaFechar" }
  | { k: "caixaDetalhe"; id: number }
  | { k: "funcionario"; id: number | null }
  | { k: "papel"; id: number | null }
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
  id: number | null;
  nome: string;
  preco: string;
  categoria: string;
  /** Digitando uma categoria nova em vez de escolher da lista. */
  catNova: boolean;
  ativo: boolean;
  fav: boolean;
  codigo: string;
  custo: string;
  estoque: string;
  minimo: string;
  unidade: string;
  tentouSalvar: boolean;
}

export interface FormCusto {
  id: number | null;
  tipo: TipoCusto;
  descricao: string;
  categoria: string;
  valor: string;
  d: number;
  recorrente: boolean;
  tentouSalvar: boolean;
}

export interface FormMov {
  tipo: TipoMovEstoque;
  produtoId: number | null;
  qtd: string;
  custo: string;
  motivo: string;
  tentouSalvar: boolean;
}

export interface FormCaixa {
  valor: string;
  motivo: string;
  obs: string;
  /** O que a pessoa contou em cada forma, no fechamento. */
  contado: Partial<Record<FormaPagamento, string>>;
}

export interface FormFuncionario {
  id: number | null;
  nome: string;
  email: string;
  papel: string;
  tentouSalvar: boolean;
}

export interface FormPapel {
  id: number | null;
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
  logUsuario: string;
  logAcao: string;
  logPeriodo: string;
}

export interface FiltrosSuporte {
  busca: string;
  status: string;
}

/* -------------------------------------------------------------------------- */
/* O estado                                                                    */
/* -------------------------------------------------------------------------- */

export interface PortalState {
  /* Sessão e aparência */
  perfil: PerfilKey;
  tema: Tema;
  idioma: string;
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

  /* Dados do negócio */
  produtos: Produto[];
  vendas: Venda[];
  movs: MovEstoque[];
  custos: Custo[];
  caixaAberto: CaixaAberto | null;
  caixasFechados: CaixaFechado[];
  papeis: Papel[];
  equipe: Funcionario[];
  log: LinhaLog[];
  chamados: Chamado[];

  /* Configurações */
  dados: DadosNegocio;
  dadosRascunho: DadosNegocio;
  prefs: Preferencias;
  formasAceitas: FormaPagamento[];
  catsProduto: string[];
  catsCusto: string[];
  novaCatProduto: string;
  novaCatCusto: string;

  /* PDV */
  carrinho: ItemCarrinho[];
  pagAtual: FormaPagamento;
  buscaProd: string;
  codigo: string;
  carrinhoAberto: boolean;
  /** Venda em edição no PDV — `null` quando é uma venda nova. */
  editandoVenda: number | null;

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

  /* Rascunhos */
  formProduto: FormProduto;
  formCusto: FormCusto;
  formMov: FormMov;
  formCaixa: FormCaixa;
  formFunc: FormFuncionario;
  formPapel: FormPapel;
  formChamado: FormChamado;
  formResposta: FormResposta;
}

export type Patch = Partial<PortalState>;

export interface PortalActions {
  set: (p: Patch) => void;
  /** Troca o perfil demo e recarrega todas as sementes daquele negócio. */
  trocarPerfil: (p: PerfilKey) => void;
  toggleTema: () => void;
  irPara: (rota: string) => void;
  avisar: (texto: string) => void;
  confirmar: (c: Confirmacao) => void;
  fecharConf: () => void;
  fecharModal: () => void;
  abrirModal: (m: Modal) => void;
  toggleMenu: (chave: string) => void;

  /* Vendas e PDV */
  addCarrinho: (p: Produto) => void;
  mudarQtd: (nome: string, delta: number) => void;
  removerItem: (nome: string) => void;
  limparCarrinho: () => void;
  registrarVenda: () => void;
  editarVenda: (id: number) => void;
  estornarVenda: (id: number) => void;
  desfazerEstorno: (id: number) => void;

  /* Produtos */
  abrirProduto: (id: number | null) => void;
  salvarProduto: () => void;
  toggleFav: (id: number) => void;
  toggleAtivo: (id: number) => void;
  excluirProduto: (id: number) => void;

  /* Estoque */
  abrirMov: (produtoId?: number, tipo?: TipoMovEstoque) => void;
  salvarMov: () => void;
  reverterMov: (id: number) => void;

  /* Custos */
  abrirCusto: (id: number | null) => void;
  salvarCusto: () => void;
  excluirCusto: (id: number) => void;

  /* Caixa */
  abrirCaixa: () => void;
  registrarMovCaixa: () => void;
  reverterMovCaixa: (id: number) => void;
  fecharCaixa: () => void;
  reabrirCaixa: (id: number) => void;

  /* Configurações */
  salvarDados: () => void;
  descartarDados: () => void;
  toggleForma: (f: FormaPagamento) => void;
  togglePref: (k: keyof Preferencias) => void;
  criarCategoria: (grupo: "produto" | "custo") => void;
  removerCategoria: (grupo: "produto" | "custo", nome: string) => void;
  abrirFuncionario: (id: number | null) => void;
  salvarFuncionario: () => void;
  toggleFuncionario: (id: number) => void;
  removerFuncionario: (id: number) => void;
  abrirPapel: (id: number | null) => void;
  salvarPapel: () => void;
  removerPapel: (id: number) => void;

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
}
