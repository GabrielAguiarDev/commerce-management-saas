import type {
  OpenRegister,
  ClosedRegister,
  Ticket,
  Cost,
  BusinessData,
  PaymentMethod,
  Employee,
  CartItem,
  ModuleKey,
  StockMovement,
  Business,
  Role,
  Product,
  Theme,
  CostType,
  RegisterMovementType,
  StockMovementType,
  Sale,
} from "./types";

/* -------------------------------------------------------------------------- */
/* Sobreposições                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Os modais do portal. Um de cada vez — abrir um fecha o anterior, que é o
 * comportamento do design e o que evita duas camadas empilhadas no celular.
 */
export type Modal =
  | { k: "saleDetail"; id: string }
  | { k: "product"; id: string | null }
  | { k: "stockMovement" }
  | { k: "cost"; id: string | null }
  | { k: "openRegister" }
  | { k: "registerMovement"; type: RegisterMovementType }
  | { k: "closeRegister" }
  | { k: "registerDetail"; id: string }
  | { k: "employee"; id: string }
  | { k: "role"; id: string | null }
  | { k: "newTicket" };

/**
 * A confirmação é sempre a mesma caixa: o que vai acontecer, sobre o quê, e se
 * dá para voltar atrás. `acao` é o que roda quando a pessoa confirma.
 */
export interface Confirm {
  title: string;
  text: string;
  summary: string;
  detail: string;
  /** "Dá para desfazer depois" — o que tira o medo de clicar. */
  reversal: string;
  button: string;
  buttonBg: string;
  buttonInk: string;
  color: string;
  /**
   * O que roda ao confirmar. Devolvendo uma promessa — o caso de toda ação que
   * grava —, a caixa fica na tela com o botão travado e girando até o servidor
   * responder, em vez de sumir antes de haver resposta.
   */
  action: () => unknown;
}

export interface Hint {
  text: string;
  x: number;
  y: number;
}

/* -------------------------------------------------------------------------- */
/* Rascunhos dos formulários                                                   */
/* -------------------------------------------------------------------------- */

export interface ProductForm {
  id: string | null;
  name: string;
  price: string;
  category: string;
  /** Digitando uma categoria nova em vez de escolher da lista. */
  newCategory: boolean;
  active: boolean;
  fav: boolean;
  service: boolean;
  code: string;
  cost: string;
  stock: string;
  minimum: string;
  unit: string;
  submitted: boolean;
}

export interface CostForm {
  id: string | null;
  type: CostType;
  description: string;
  category: string;
  amount: string;
  /** Dias atrás, escolhido na lista. Vira `cost_date` na hora de salvar. */
  d: number;
  recurring: boolean;
  submitted: boolean;
}

export interface MovementForm {
  type: StockMovementType;
  productId: string | null;
  qtd: string;
  cost: string;
  reason: string;
  submitted: boolean;
}

export interface RegisterForm {
  amount: string;
  reason: string;
  obs: string;
  /**
   * Quanto foi contado na gaveta. Só dinheiro: Pix e cartão caem na conta e são
   * conferidos no extrato — é o que `close_cash_register` espera.
   */
  countedCash: string;
}

export interface RoleForm {
  id: string | null;
  name: string;
  modules: ModuleKey[];
  submitted: boolean;
}

export interface TicketForm {
  subject: string;
  category: string;
  description: string;
  attachment: string;
  submitted: boolean;
}

export interface ReplyForm {
  text: string;
  attachment: string;
}

/* -------------------------------------------------------------------------- */
/* Filtros                                                                     */
/* -------------------------------------------------------------------------- */

export type SalesPeriod = "today" | "7" | "30" | "all";
export type ReportPeriod = "today" | "7" | "30" | "90";
export type StockTab = "items" | "movements";
export type SettingsTab = "data" | "prefs" | "team" | "account";

export interface SalesFilters {
  period: SalesPeriod;
  payment: string;
  product: string;
  search: string;
}

export interface ProductFilters {
  search: string;
  cat: string;
  status: string;
  onlyLow: boolean;
}

export interface StockFilters {
  tab: StockTab;
  search: string;
  status: string;
  cat: string;
  ordem: string;
  movTipo: string;
  movProduto: string;
  movPeriodo: string;
}

export interface CostFilters {
  type: string;
  cat: string;
  period: string;
}

export interface SettingsFilters {
  tab: SettingsTab;
}

export interface SupportFilters {
  search: string;
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
export interface PortalData {
  business: Business;
  data: BusinessData;
  products: Product[];
  sales: Sale[];
  movements: StockMovement[];
  costs: Cost[];
  openRegister: OpenRegister | null;
  caixasFechados: ClosedRegister[];
  roles: Role[];
  team: Employee[];
  tickets: Ticket[];
  /** Preenchido quando a leitura falhou — a tela avisa em vez de mentir "vazio". */
  error: string | null;
}

/* -------------------------------------------------------------------------- */
/* O estado                                                                    */
/* -------------------------------------------------------------------------- */

export interface PortalState {
  /* Aparência e ambiente */
  theme: Theme;
  /**
   * Assume desktop até o listener de resize contar a verdade, para que o
   * render do servidor e o primeiro render do cliente concordem.
   */
  screenWidth: number;
  /**
   * A pessoa acabou de entrar e o portal ainda está sendo montado — é o que
   * mantém a tela de abertura no ar.
   *
   * Quem levanta é o login, ao ter a senha aceita; quem baixa é a própria tela
   * de abertura, depois de o portal chegar. Deliberadamente NÃO sobe num F5:
   * recarregar é continuar de onde parou, e uma tela de boas-vindas ali só
   * atrasaria quem já está trabalhando.
   */
  entering: boolean;
  collapsed: boolean;
  navOpen: boolean;
  notificationsOpen: boolean;
  signOutOpen: boolean;
  hint: Hint | null;

  /**
   * Preferências de uso.
   *
   * Ainda NÃO têm tabela: valem só nesta sessão e voltam ao padrão no próximo
   * login. A tela de Configurações diz isso em voz alta. Ver a análise.
   */
  acceptedMethods: PaymentMethod[];
  imprimirComprovante: boolean;
  pedirCliente: boolean;

  /**
   * Rascunho dos dados do negócio. O salvo vive no retrato do servidor (`d`);
   * este é só o que está sendo digitado.
   */
  draftData: BusinessData;

  /* PDV */
  cart: CartItem[];
  currentMethod: PaymentMethod;
  productSearch: string;
  code: string;
  cartOpen: boolean;
  /** Venda em edição no PDV — `null` quando é uma venda nova. */
  editingSale: string | null;

  /* Filtros */
  fVendas: SalesFilters;
  fProdutos: ProductFilters;
  fEstoque: StockFilters;
  fCustos: CostFilters;
  fRel: { period: ReportPeriod; compare: boolean };
  fConfig: SettingsFilters;
  fSuporte: SupportFilters;

  /* Sobreposições */
  rowMenu: string | null;
  modal: Modal | null;
  confirmDialog: Confirm | null;
  toast: string;
  /** Uma escrita em andamento — trava os botões que a disparariam de novo. */
  saving: boolean;

  /* Rascunhos */
  productForm: ProductForm;
  costForm: CostForm;
  movementForm: MovementForm;
  registerForm: RegisterForm;
  roleForm: RoleForm;
  ticketForm: TicketForm;
  replyForm: ReplyForm;
}

export type Patch = Partial<PortalState>;

/**
 * As ações do portal.
 *
 * Toda ação que fala com o servidor devolve a sua promessa em vez de disparar e
 * esquecer. Quem chama decide o que fazer com ela — e o `Button` de `@aguiar/ui`
 * usa isso para se travar e mostrar o girador exatamente enquanto a gravação
 * acontece, sem que cada tela precise inventar o seu próprio "salvando".
 */
export interface PortalActions {
  set: (p: Patch) => void;
  toggleTheme: () => void;
  goTo: (rota: string) => void;
  notify: (text: string) => void;
  confirm: (c: Confirm) => void;
  closeConfirm: () => void;
  closeModal: () => void;
  openModal: (m: Modal) => void;
  /** Abre o menu de linha da chave dada, ou fecha o que estiver aberto. */
  openMenu: (key: string | null) => void;
  signOut: () => Promise<void>;

  /* Vendas e PDV */
  addToCart: (p: Product) => void;
  changeQty: (name: string, delta: number) => void;
  removeItem: (name: string) => void;
  clearCart: () => void;
  recordSale: () => Promise<void>;
  editSale: (id: string) => void;
  refundSale: (id: string) => Promise<void>;
  undoRefund: (id: string) => Promise<void>;

  /* Produtos */
  openProduct: (id: string | null) => void;
  saveProduct: () => Promise<void>;
  toggleFav: (id: string) => Promise<void>;
  toggleActive: (id: string) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  /* Estoque */
  openMovement: (productId?: string, type?: StockMovementType) => void;
  saveMovement: () => Promise<void>;
  undoMovement: (id: string) => Promise<void>;

  /* Custos */
  openCost: (id: string | null) => void;
  saveCost: () => Promise<void>;
  deleteCost: (id: string) => Promise<void>;

  /* Caixa */
  openRegister: () => Promise<void>;
  recordRegisterMovement: () => Promise<void>;
  undoRegisterMovement: (id: string) => Promise<void>;
  closeRegister: () => Promise<void>;
  reopenRegister: (id: string) => Promise<void>;

  /* Configurações */
  saveData: () => Promise<void>;
  discardData: () => void;
  toggleMethod: (f: PaymentMethod) => void;
  openRole: (id: string | null) => void;
  saveRole: () => Promise<void>;
  removeRole: (id: string) => Promise<void>;
  toggleEmployee: (id: string) => Promise<void>;
  changeEmployeeRole: (id: string, roleId: string) => Promise<void>;

  /* Suporte */
  openNewTicket: () => void;
  sendTicket: () => Promise<void>;
  replyToTicket: (id: string) => Promise<void>;
  resolveTicket: (id: string) => Promise<void>;
  reopenTicket: (id: string) => Promise<void>;
  markRead: (id: string) => Promise<void>;
}

/** O que toda tela recebe — a forma que `usePortal()` devolve. */
export interface ViewProps {
  s: PortalState;
  a: PortalActions;
  /** Módulos que o plano deste cliente liga. */
  modules: ModuleKey[];
  has: (m: ModuleKey) => boolean;
  isMobile: boolean;
  isDesktop: boolean;
  /** Atalhos para o retrato do servidor, para as telas não escreverem `s.dados.` */
  d: PortalData;
}
