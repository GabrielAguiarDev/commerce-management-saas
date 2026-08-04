/**
 * O vocabulário do Portal do Cliente.
 *
 * O portal é modular: o plano do cliente liga um conjunto de módulos, e tanto o
 * menu quanto o dashboard montam-se a partir dele. Por isso `ModuloKey` é o
 * tipo mais importante daqui — quase toda decisão de "isto aparece?" passa por
 * uma checagem contra a lista de módulos ativos.
 *
 * SOBRE O FORMATO: estes tipos são o modelo do PORTAL, não o do banco. As
 * linhas do Supabase são traduzidas para cá em `lib/dados/*` — é lá que
 * `sold_at` vira `d`/`hora`, que `payment_method` vira "Pix" e que os nomes em
 * inglês viram os do produto. As telas nunca veem uma linha crua.
 *
 * Todo `id` é o uuid do banco, em texto.
 */

export type ModuloKey =
  | "dashboard"
  | "vendas"
  | "produtos"
  | "estoque"
  | "caixa"
  | "custos"
  | "relatorios"
  | "config"
  | "suporte";

export type Tema = "claro" | "escuro";

export type FormaPagamento = "Dinheiro" | "Pix" | "Débito" | "Crédito";

export type TipoCusto = "fixo" | "variavel";

export type TipoMovEstoque = "entrada" | "saida" | "ajuste" | "venda";

export type TipoMovCaixa = "sangria" | "reforco";

export type StatusChamado = "aberto" | "andamento" | "aguardando" | "resolvido";

export type AutorMensagem = "cliente" | "suporte" | "sistema";

/* -------------------------------------------------------------------------- */
/* Negócio                                                                     */
/* -------------------------------------------------------------------------- */

export interface Usuario {
  nome: string;
  sigla: string;
}

/** O negócio do cliente: identidade e módulos que o plano liga. */
export interface Negocio {
  id: string;
  nome: string;
  sigla: string;
  /** Ramo do comércio — `tenants.segment`. */
  tipo: string;
  user: Usuario;
  modulos: ModuloKey[];
}

/* -------------------------------------------------------------------------- */
/* Vendas                                                                      */
/* -------------------------------------------------------------------------- */

export interface ItemVenda {
  nome: string;
  qtd: number;
  preco: number;
}

export interface Venda {
  id: string;
  /**
   * Dias atrás, calculado de `sales.sold_at` na leitura: 0 = hoje, 1 = ontem.
   * Os filtros e gráficos do portal raciocinam em "quantos dias", então a
   * conta é feita uma vez, na borda, em vez de em cada tela.
   */
  d: number;
  hora: string;
  /** O carimbo original, para quando a escrita precisa da data exata. */
  quando: string;
  pag: FormaPagamento;
  estornada: boolean;
  itens: ItemVenda[];
}

/** Um item no carrinho do PDV. */
export interface ItemCarrinho {
  /** `null` num item avulso, que não veio do catálogo. */
  produtoId: string | null;
  nome: string;
  preco: number;
  qtd: number;
}

/* -------------------------------------------------------------------------- */
/* Produtos e estoque                                                          */
/* -------------------------------------------------------------------------- */

export interface Produto {
  id: string;
  nome: string;
  preco: number;
  codigo: string;
  fav: boolean;
  ativo: boolean;
  categoria: string;
  custo: number;
  /** `null` em quem não controla estoque — serviços e afins. */
  estoque: number | null;
  minimo: number | null;
  unidade: string;
  /** `products.is_service`: banho, consulta. Não tem prateleira. */
  servico: boolean;
}

export interface MovEstoque {
  id: string;
  d: number;
  hora: string;
  produtoId: string;
  produto: string;
  tipo: TipoMovEstoque;
  /** Assinado: entrada é positiva, saída e perda são negativas. */
  delta: number;
  motivo: string;
  quem: string;
  /** Custo unitário informado numa entrada, quando houver. */
  custo?: number;
}

/* -------------------------------------------------------------------------- */
/* Custos                                                                      */
/* -------------------------------------------------------------------------- */

export interface Custo {
  id: string;
  tipo: TipoCusto;
  descricao: string;
  categoria: string;
  valor: number;
  d: number;
  /** A data exata (`costs.cost_date`), para editar sem recalcular. */
  data: string;
  recorrente: boolean;
  /** `costs.origin = 'stock'`: veio de uma entrada de mercadoria. */
  doEstoque: boolean;
}

/* -------------------------------------------------------------------------- */
/* Caixa                                                                       */
/* -------------------------------------------------------------------------- */

export interface MovCaixa {
  id: string;
  hora: string;
  tipo: TipoMovCaixa;
  valor: number;
  motivo: string;
}

export interface CaixaAberto {
  id: string;
  abertura: string;
  /** Carimbo da abertura, para somar só as vendas deste turno. */
  abertoEm: string;
  inicial: number;
  operador: string;
  movs: MovCaixa[];
}

export interface CaixaFechado {
  id: string;
  d: number;
  abertura: string;
  fechamento: string;
  inicial: number;
  operador: string;
  /** Quanto entrou por forma de pagamento durante o turno. */
  vendas: Partial<Record<FormaPagamento, number>>;
  /**
   * A conferência é só do dinheiro em espécie — é o único que fica numa gaveta
   * para ser contado. Pix e cartão são conferidos no extrato, fora do portal.
   */
  esperadoDinheiro: number;
  contadoDinheiro: number;
  diferenca: number;
  movs: MovCaixa[];
  obs: string;
}

/* -------------------------------------------------------------------------- */
/* Equipe                                                                      */
/* -------------------------------------------------------------------------- */

export interface Papel {
  id: string;
  nome: string;
  modulos: ModuloKey[];
  /** O dono não pode ser removido nem ter acessos tirados. */
  fixo: boolean;
}

export interface Funcionario {
  id: string;
  nome: string;
  email: string;
  papel: string;
  ativo: boolean;
  dono: boolean;
}

/* -------------------------------------------------------------------------- */
/* Suporte                                                                     */
/* -------------------------------------------------------------------------- */

export interface MensagemChamado {
  id: string;
  autor: AutorMensagem;
  d: number;
  hora: string;
  texto: string;
  anexo: string;
}

export interface Chamado {
  id: string;
  /** Número curto mostrado como protocolo — os 6 primeiros dígitos do uuid. */
  protocolo: string;
  assunto: string;
  categoria: string;
  status: StatusChamado;
  naoLido: boolean;
  msgs: MensagemChamado[];
}

/* -------------------------------------------------------------------------- */
/* Configurações                                                               */
/* -------------------------------------------------------------------------- */

/** O que `tenants` guarda hoje. Documento e endereço ainda não têm coluna. */
export interface DadosNegocio {
  nome: string;
  tipo: string;
  telefone: string;
  cidade: string;
}
