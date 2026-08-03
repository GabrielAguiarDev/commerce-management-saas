/**
 * O vocabulário do Portal do Cliente.
 *
 * O portal é modular: o plano do cliente liga um conjunto de módulos, e tanto o
 * menu quanto o dashboard montam-se a partir dele. Por isso `ModuloKey` é o
 * tipo mais importante daqui — quase toda decisão de "isto aparece?" passa por
 * uma checagem contra a lista de módulos ativos.
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

export type PerfilKey = "petshop" | "acaraje";

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

/** O negócio do cliente: identidade, plano e textos de exemplo do perfil. */
export interface Negocio {
  nome: string;
  sigla: string;
  tipo: string;
  user: Usuario;
  /** Módulos que o plano deste cliente liga. */
  modulos: ModuloKey[];
  itemPlaceholder: string;
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
  id: number;
  /** Dias atrás: 0 = hoje, 1 = ontem. É como o design semeia o histórico. */
  d: number;
  hora: string;
  pag: FormaPagamento;
  estornada: boolean;
  itens: ItemVenda[];
}

/** Um item no carrinho do PDV. */
export interface ItemCarrinho {
  nome: string;
  preco: number;
  qtd: number;
}

/* -------------------------------------------------------------------------- */
/* Produtos e estoque                                                          */
/* -------------------------------------------------------------------------- */

export interface Produto {
  id: number;
  nome: string;
  preco: number;
  codigo: string;
  fav: boolean;
  ativo: boolean;
  categoria: string;
  custo: number;
  /** `null` em serviços — banho, consulta: não há o que contar na prateleira. */
  estoque: number | null;
  minimo: number | null;
  unidade: string;
}

export interface MovEstoque {
  id: number;
  d: number;
  hora: string;
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
  id: number;
  tipo: TipoCusto;
  descricao: string;
  categoria: string;
  valor: number;
  d: number;
  recorrente: boolean;
  /** Lançado automaticamente por uma entrada de mercadoria no Estoque. */
  doEstoque?: boolean;
}

/* -------------------------------------------------------------------------- */
/* Caixa                                                                       */
/* -------------------------------------------------------------------------- */

export interface MovCaixa {
  id: number;
  hora: string;
  tipo: TipoMovCaixa;
  valor: number;
  motivo: string;
}

export interface CaixaAberto {
  id: number;
  abertura: string;
  inicial: number;
  operador: string;
  movs: MovCaixa[];
}

export interface CaixaFechado {
  id: number;
  d: number;
  abertura: string;
  fechamento: string;
  inicial: number;
  operador: string;
  vendas: Partial<Record<FormaPagamento, number>>;
  contado: Partial<Record<FormaPagamento, number>>;
  movs: MovCaixa[];
  obs: string;
}

/* -------------------------------------------------------------------------- */
/* Equipe e auditoria                                                          */
/* -------------------------------------------------------------------------- */

export interface Papel {
  id: number;
  nome: string;
  modulos: ModuloKey[];
  /** O "Dono" não pode ser removido nem ter acessos tirados. */
  fixo: boolean;
}

export interface Funcionario {
  id: number;
  nome: string;
  email: string;
  papel: string;
  ativo: boolean;
  acesso: string;
  dono: boolean;
}

export type TagLog = "venda" | "caixa" | "estoque" | "custos" | "config";

export interface LinhaLog {
  id: number;
  d: number;
  hora: string;
  quem: string;
  tag: TagLog;
  texto: string;
  detalhe: string;
}

/* -------------------------------------------------------------------------- */
/* Suporte                                                                     */
/* -------------------------------------------------------------------------- */

export interface MensagemChamado {
  autor: AutorMensagem;
  d: number;
  hora: string;
  texto: string;
  anexo: string;
}

export interface Chamado {
  id: string;
  assunto: string;
  categoria: string;
  status: StatusChamado;
  naoLido: boolean;
  msgs: MensagemChamado[];
}

/* -------------------------------------------------------------------------- */
/* Configurações                                                               */
/* -------------------------------------------------------------------------- */

export interface DadosNegocio {
  nome: string;
  tipo: string;
  documento: string;
  telefone: string;
  endereco: string;
}

export interface Preferencias {
  imprimirComprovante: boolean;
  pedirCliente: boolean;
  alertaEstoque: boolean;
}
