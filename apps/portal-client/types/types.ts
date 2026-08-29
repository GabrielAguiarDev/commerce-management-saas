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
  | "fiscal"
  | "settings"
  | "support";

/**
 * Um módulo do catálogo, já traduzido para o vocabulário do portal.
 *
 * É só APRESENTAÇÃO: chave, nome e a frase que explica para que serve. Nunca
 * carrega dado do módulo — o cliente que não tem Estoque continua sem ver
 * saldo nenhum, porque não há saldo nenhum aqui dentro.
 */
export interface CatalogModule {
  key: ModuleKey;
  name: string;
  benefit: string;
}

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
  /**
   * Todo módulo vendável, ativo ou não — só nome e frase, nunca dado.
   *
   * É o que permite oferecer o que falta sem consultar nada do módulo que o
   * cliente não tem: o cartão de sugestão do dashboard lê daqui.
   */
  catalog: CatalogModule[];
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
  /**
   * O que a nota fiscal precisa saber deste item.
   *
   * Campo VAZIO significa "usa o padrão do negócio" (`FiscalData.default*`),
   * não "faltando" — é o que permite cadastrar 400 produtos sem repetir 400
   * vezes o mesmo NCM. Ver `lib/dados/fiscal.ts`.
   */
  fiscal: ProductFiscal;
}

/**
 * Os campos fiscais de um produto. Todos em texto, inclusive os numéricos:
 * são CÓDIGOS, não quantidades — "00" e "0" são situações tributárias
 * diferentes, e um número perderia o zero à esquerda no caminho.
 */
export interface ProductFiscal {
  ncm: string;
  cest: string;
  /** Origem da mercadoria, "0" a "8". Vazio herda o padrão do negócio. */
  origin: string;
  /**
   * O código de barras REAL, com dígito verificador válido.
   *
   * Não é o `code` do PDV: aquele é campo livre, onde cabe o código interno da
   * balança — ótimo para bipar, recusado pela SEFAZ. `"SEM GTIN"` é o valor
   * oficial de quem não tem código de barras.
   */
  gtin: string;
  /** Unidade tributável, quando diferente da comercial (vende fardo, tributa KG). */
  taxUnit: string;
  cfop: string;
  /** CSOSN (Simples) ou CST de ICMS (Normal) — o regime do emitente diz qual. */
  icmsCode: string;
  pisCst: string;
  cofinsCst: string;
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

/* -------------------------------------------------------------------------- */
/* Fiscal                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * O ciclo de vida de um documento fiscal.
 *
 * `authorized` é uma porta de mão única: dali em diante o documento não se
 * apaga nem se edita — só admite cancelamento (dentro do prazo da UF) ou uma
 * nota de devolução.
 */
export type FiscalStatus =
  | "pending"
  | "processing"
  | "authorized"
  | "rejected"
  | "cancelled"
  | "denied";

/** Um documento fiscal de uma venda. Vem de `fiscal_documents`. */
export interface FiscalDocument {
  id: string;
  saleId: string | null;
  /** "65" NFC-e, "55" NF-e, "nfse" serviço. Hoje só a NFC-e é emitida. */
  model: string;
  environment: FiscalEnvironment;
  status: FiscalStatus;
  series: number | null;
  number: number | null;
  /** Os 44 dígitos, sem o prefixo "NFe". Vazio até a SEFAZ autorizar. */
  accessKey: string;
  /** O que a SEFAZ respondeu quando recusou. Vazio quando não recusou. */
  rejectionReason: string;
  xmlUrl: string;
  danfeUrl: string;
  /** Dias atrás, como no resto do portal. */
  d: number;
  time: string;
  attempts: number;
}

/** CRT — 1 Simples, 2 Simples com excesso de sublimite, 3 Normal, 4 MEI. */
export type TaxRegime = 1 | 2 | 3 | 4;

/**
 * Cliente novo começa em `homologation` e só passa a `production` quando a
 * SEFAZ libera. Inverter isso faria a primeira nota de teste virar documento
 * fiscal de verdade — receita declarada sem venda.
 */
export type FiscalEnvironment = "homologation" | "production";

/**
 * O cadastro fiscal do negócio: quem emite, de onde, e com que padrões.
 *
 * Vem de `tenant_fiscal_settings`, exceto os dois últimos campos, que vêm da
 * view `v_fiscal_credentials_status`. **O token do CSC nunca chega aqui** — o
 * portal só sabe SE ele está configurado, nunca qual é. Ver a migration.
 */
export interface FiscalData {
  /** Razão social. `Business.name` é o nome de fachada; a nota sai com este. */
  legalName: string;
  /** CNPJ ou CPF, só dígitos. A máscara é da tela. */
  taxId: string;
  stateRegistration: string;
  /** Quem não tem inscrição estadual é ISENTO — que é diferente de "não preenchi". */
  stateRegistrationExempt: boolean;
  cityRegistration: string;
  regime: TaxRegime | null;

  /* Endereço do ESTABELECIMENTO — nem sempre é o de contato em `tenants`. */
  street: string;
  streetNumber: string;
  complement: string;
  district: string;
  zipCode: string;
  cityName: string;
  stateCode: string;
  /** O XML leva o código IBGE do município (7 dígitos), não o nome dele. */
  cityIbgeCode: string;

  environment: FiscalEnvironment;
  nfceSeries: number;

  /* Os padrões que os produtos herdam quando não têm o campo próprio. */
  defaultNcm: string;
  defaultCfop: string;
  defaultIcmsCode: string;
  defaultPisCst: string;
  defaultCofinsCst: string;
  defaultOrigin: string;

  /** O Id do CSC não é segredo: ele viaja no próprio QR Code da nota. */
  cscId: string;
  /** Só o fato, nunca o valor. */
  cscTokenSet: boolean;
  certificateSet: boolean;
  /** ISO, ou vazio. O certificado A1 vale 12 meses e para de emitir ao vencer. */
  certificateExpiresAt: string;
}
