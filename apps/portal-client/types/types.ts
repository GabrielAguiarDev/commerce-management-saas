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

export type ModuleKey =
  | "dashboard"
  | "sales"
  | "products"
  | "stock"
  | "register"
  | "costs"
  | "reports"
  | "settings"
  | "support";

export type Theme = "light" | "dark";

export type PaymentMethod = "cash" | "pix" | "debit" | "credit";

export type CostType = "fixed" | "variable";

export type StockMovementType = "in" | "out" | "adjustment" | "sale";

export type RegisterMovementType = "withdrawal" | "deposit";

export type TicketStatus = "open" | "inProgress" | "waiting" | "resolved";

export type MessageAuthor = "customer" | "support" | "system";

/* -------------------------------------------------------------------------- */
/* Negócio                                                                     */
/* -------------------------------------------------------------------------- */

export interface User {
  name: string;
  initials: string;
}

/** O negócio do cliente: identidade e módulos que o plano liga. */
export interface Business {
  id: string;
  name: string;
  initials: string;
  /** Ramo do comércio — `tenants.segment`. */
  type: string;
  user: User;
  modules: ModuleKey[];
}

/* -------------------------------------------------------------------------- */
/* Vendas                                                                      */
/* -------------------------------------------------------------------------- */

export interface SaleItem {
  name: string;
  qtd: number;
  price: number;
}

export interface Sale {
  id: string;
  /**
   * Dias atrás, calculado de `sales.sold_at` na leitura: 0 = hoje, 1 = ontem.
   * Os filtros e gráficos do portal raciocinam em "quantos dias", então a
   * conta é feita uma vez, na borda, em vez de em cada tela.
   */
  d: number;
  time: string;
  /** O carimbo original, para quando a escrita precisa da data exata. */
  at: string;
  payment: PaymentMethod;
  refunded: boolean;
  items: SaleItem[];
}

/** Um item no carrinho do PDV. */
export interface CartItem {
  /** `null` num item avulso, que não veio do catálogo. */
  productId: string | null;
  name: string;
  price: number;
  qtd: number;
}

/* -------------------------------------------------------------------------- */
/* Produtos e estoque                                                          */
/* -------------------------------------------------------------------------- */

export interface Product {
  id: string;
  name: string;
  price: number;
  code: string;
  fav: boolean;
  active: boolean;
  category: string;
  cost: number;
  /** `null` em quem não controla estoque — serviços e afins. */
  stock: number | null;
  minimum: number | null;
  unit: string;
  /** `products.is_service`: banho, consulta. Não tem prateleira. */
  service: boolean;
}

export interface StockMovement {
  id: string;
  d: number;
  time: string;
  productId: string;
  product: string;
  type: StockMovementType;
  /** Assinado: entrada é positiva, saída e perda são negativas. */
  delta: number;
  reason: string;
  who: string;
  /** Custo unitário informado numa entrada, quando houver. */
  cost?: number;
}

/* -------------------------------------------------------------------------- */
/* Custos                                                                      */
/* -------------------------------------------------------------------------- */

export interface Cost {
  id: string;
  type: CostType;
  description: string;
  category: string;
  amount: number;
  d: number;
  /** A data exata (`costs.cost_date`), para editar sem recalcular. */
  data: string;
  recurring: boolean;
  /** `costs.origin = 'stock'`: veio de uma entrada de mercadoria. */
  fromStock: boolean;
}

/* -------------------------------------------------------------------------- */
/* Caixa                                                                       */
/* -------------------------------------------------------------------------- */

export interface RegisterMovement {
  id: string;
  time: string;
  type: RegisterMovementType;
  amount: number;
  reason: string;
}

export interface OpenRegister {
  id: string;
  openedAt: string;
  /** Carimbo da abertura, para somar só as vendas deste turno. */
  openedAtStamp: string;
  opening: number;
  operator: string;
  movements: RegisterMovement[];
}

export interface ClosedRegister {
  id: string;
  d: number;
  openedAt: string;
  closedAt: string;
  opening: number;
  operator: string;
  /** Quanto entrou por forma de pagamento durante o turno. */
  sales: Partial<Record<PaymentMethod, number>>;
  /**
   * A conferência é só do dinheiro em espécie — é o único que fica numa gaveta
   * para ser contado. Pix e cartão são conferidos no extrato, fora do portal.
   */
  expectedCash: number;
  countedCash: number;
  difference: number;
  movements: RegisterMovement[];
  obs: string;
}

/* -------------------------------------------------------------------------- */
/* Equipe                                                                      */
/* -------------------------------------------------------------------------- */

export interface Role {
  id: string;
  name: string;
  modules: ModuleKey[];
  /** O dono não pode ser removido nem ter acessos tirados. */
  fixed: boolean;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  owner: boolean;
}

/* -------------------------------------------------------------------------- */
/* Suporte                                                                     */
/* -------------------------------------------------------------------------- */

export interface TicketMessage {
  id: string;
  author: MessageAuthor;
  d: number;
  time: string;
  text: string;
  attachment: string;
}

export interface Ticket {
  id: string;
  /** Número curto mostrado como protocolo — os 6 primeiros dígitos do uuid. */
  protocol: string;
  subject: string;
  category: string;
  status: TicketStatus;
  unread: boolean;
  messages: TicketMessage[];
}

/* -------------------------------------------------------------------------- */
/* Configurações                                                               */
/* -------------------------------------------------------------------------- */

/** O que `tenants` guarda hoje. Documento e endereço ainda não têm coluna. */
export interface BusinessData {
  name: string;
  type: string;
  phone: string;
  city: string;
}
