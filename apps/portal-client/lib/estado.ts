import { EMPTY_FISCAL } from "@/lib/dados/fiscal";
import { METHODS } from "@/lib/dados/vendas";
import type {
  FiscalForm,
  PortalData,
  RegisterForm,
  TicketForm,
  CostForm,
  MovementForm,
  RoleForm,
  ProductForm,
  ReplyForm,
  PortalState,
  Toast,
  ToastTone,
} from "@/types/estado";
import type { BusinessData, Theme } from "@/types/types";

/**
 * Quanto tempo cada aviso fica na tela.
 *
 * Uma confirmação some rápido — quem gravou já sabe o que fez. O que deu errado
 * fica mais, porque aí a mensagem precisa ser LIDA: é ela que diz o que mudar
 * antes de tentar de novo. O `Toast` desenha a mesma contagem na barrinha do
 * rodapé, então os dois números têm de sair daqui.
 */
export const TOAST_MS: Record<ToastTone, number> = {
  ok: 2800,
  warn: 4200,
  error: 5200,
};

/**
 * A saída do aviso. Espelha a duração de `.toast-out` em `tokens.css`: o estado
 * já foi limpo, e este é o tempo que o `Toast` continua na tela terminando de
 * sair. Mexeu num, mexa no outro — sobrando aqui ele fica parado no fim da
 * animação, faltando ele é cortado no meio dela.
 */
export const TOAST_OUT_MS = 200;

let toastSeq = 0;

/** Monta um aviso. O número de série é o que distingue dois avisos iguais. */
export function toast(text: string, tone: ToastTone = "ok"): Toast {
  return { id: ++toastSeq, text, tone };
}

export const EMPTY_PRODUCT_FORM: ProductForm = {
  id: null,
  name: "",
  price: "",
  category: "",
  newCategory: false,
  active: true,
  fav: false,
  service: false,
  code: "",
  cost: "",
  stock: "",
  minimum: "",
  unit: "un",
  // Vazio em tudo: o produto novo herda o padrão fiscal do negócio, e é isso
  // que a tela mostra como placeholder.
  fiscal: {
    ncm: "",
    cest: "",
    origin: "",
    gtin: "",
    taxUnit: "",
    cfop: "",
    icmsCode: "",
    pisCst: "",
    cofinsCst: "",
  },
  submitted: false,
};

/**
 * O rascunho fiscal vazio.
 *
 * `cscTokenInput` nasce vazio SEMPRE, inclusive quando já há token gravado:
 * vazio quer dizer "mantém o que está no banco". O portal nunca recebeu o
 * token para poder devolvê-lo ao campo.
 */
export const EMPTY_FISCAL_FORM: FiscalForm = {
  ...EMPTY_FISCAL,
  cscTokenInput: "",
  submitted: false,
};

/** O rascunho fiscal a partir do que o servidor entregou. */
export function fiscalForm(f: PortalData["fiscal"]): FiscalForm {
  return { ...f, cscTokenInput: "", submitted: false };
}

export const EMPTY_COST_FORM: CostForm = {
  id: null,
  type: "variable",
  description: "",
  category: "",
  amount: "",
  d: 0,
  recurring: false,
  submitted: false,
};

export const EMPTY_MOVEMENT_FORM: MovementForm = {
  type: "in",
  productId: null,
  qtd: "",
  cost: "",
  reason: "",
  submitted: false,
};

export const EMPTY_REGISTER_FORM: RegisterForm = {
  amount: "",
  reason: "",
  obs: "",
  countedCash: "",
};

export const EMPTY_ROLE_FORM: RoleForm = {
  id: null,
  name: "",
  modules: [],
  submitted: false,
};

export const EMPTY_TICKET_FORM: TicketForm = {
  subject: "",
  category: "Dúvida",
  description: "",
  attachment: "",
  submitted: false,
};

export const EMPTY_REPLY_FORM: ReplyForm = { text: "", attachment: "" };

/** O retrato vazio, usado enquanto a leitura falha ou o ambiente não tem banco. */
export const EMPTY_DATA: PortalData = {
  business: {
    id: "",
    name: "Seu negócio",
    initials: "?",
    type: "",
    user: { name: "Você", initials: "?" },
    modules: ["dashboard", "settings"],
    catalog: [],
  },
  data: { name: "", type: "", phone: "", city: "" },
  fiscal: EMPTY_FISCAL,
  fiscalDocuments: [],
  products: [],
  sales: [],
  movements: [],
  costs: [],
  openRegister: null,
  caixasFechados: [],
  roles: [],
  team: [],
  tickets: [],
  error: null,
};

/**
 * Monta o estado da SESSÃO — tema, filtros, carrinho, rascunhos.
 *
 * O retrato do negócio não entra aqui: ele chega como prop do servidor e é
 * lido direto. Copiá-lo para o estado criaria duas verdades, e a do cliente
 * ficaria velha no instante seguinte a uma escrita.
 */
export function initialState(
  data: BusinessData,
  fiscal: PortalData["fiscal"],
  manter?: { theme: Theme; screenWidth: number; collapsed: boolean },
): PortalState {
  return {
    theme: manter?.theme ?? "light",
    screenWidth: manter?.screenWidth ?? 1440,
    // Só o login levanta isto. Nascendo falso, um documento novo — F5, ou um
    // link colado na barra — abre direto no portal, sem tela de espera.
    entering: false,
    collapsed: manter?.collapsed ?? false,
    navOpen: false,
    notificationsOpen: false,
    signOutOpen: false,
    hint: null,

    acceptedMethods: METHODS.slice(),
    imprimirComprovante: true,
    pedirCliente: false,

    draftData: { ...data },
    draftFiscal: fiscalForm(fiscal),

    cart: [],
    currentMethod: "cash",
    productSearch: "",
    code: "",
    cartOpen: false,
    editingSale: null,
    customerDocument: "",

    fVendas: { period: "today", payment: "Todas as formas", product: "Todos os produtos", search: "" },
    fProdutos: { search: "", cat: "Todas as categorias", status: "Todos", onlyLow: false },
    fEstoque: {
      tab: "items",
      search: "",
      status: "Todas as situações",
      cat: "Todas as categorias",
      ordem: "Estoque mais baixo",
      movTipo: "Todos os tipos",
      movProduto: "Todos os produtos",
      movPeriodo: "Últimos 30 dias",
    },
    fCustos: { type: "Todos", cat: "Todas as categorias", period: "Este mês" },
    fRel: { period: "30", compare: false },
    fConfig: { tab: "data" },
    fSuporte: { search: "", status: "all" },

    rowMenu: null,
    modal: null,
    confirmDialog: null,
    toast: null,
    saving: false,

    productForm: { ...EMPTY_PRODUCT_FORM },
    costForm: { ...EMPTY_COST_FORM },
    movementForm: { ...EMPTY_MOVEMENT_FORM },
    registerForm: { ...EMPTY_REGISTER_FORM },
    roleForm: { ...EMPTY_ROLE_FORM },
    ticketForm: { ...EMPTY_TICKET_FORM },
    replyForm: { ...EMPTY_REPLY_FORM },
  };
}

/** Rascunho de dados do negócio diferente do que está salvo. */
export function dataDirty(s: PortalState, saved: BusinessData): boolean {
  return (Object.keys(saved) as (keyof BusinessData)[]).some(
    (k) => saved[k] !== s.draftData[k],
  );
}

/**
 * Rascunho fiscal diferente do que está salvo.
 *
 * `cscTokenInput` conta como alteração por si só — é o único campo cujo valor
 * salvo o portal não conhece, então qualquer coisa digitada nele é, por
 * definição, algo ainda não gravado.
 */
export function fiscalDirty(s: PortalState, saved: PortalData["fiscal"]): boolean {
  if (s.draftFiscal.cscTokenInput.trim() !== "") return true;
  return (Object.keys(saved) as (keyof PortalData["fiscal"])[]).some(
    (k) => saved[k] !== s.draftFiscal[k],
  );
}
