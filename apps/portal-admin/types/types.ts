import type { SyntheticEvent } from "react";
import type { Dic } from "@/lib/dictionary";

export type Language = "pt" | "en";
export type Theme = "light" | "dark";

/** A string translated into both panel languages. */
export type Loc = { pt: string; en: string };

export type CustomerStatus = "active" | "inactive";
export type TicketStatus = "open" | "inProgress" | "resolved";
export type Priority = "alta" | "media" | "baixa";
export type PaymentStatus = "emdia" | "atrasado" | "pendente";

export interface Module {
  k: string;
  /** `acesso` modules unlock a channel (the mobile app) rather than a section. */
  type?: "acesso";
  name: Loc;
  initials: string;
  desc: Loc;
  plans: string[];
}

export interface Plan {
  k: string;
  name: Loc;
  type: "fixed" | "custom";
  price: string | null;
  desc: Loc;
  mods: string[];
}

/**
 * Um cliente (tenant) da plataforma, já traduzido da linha do banco para o
 * vocabulário da interface. Ver `lib/clientes.ts` para o mapeamento.
 *
 * `id` é o UUID do tenant — não um número. `segmento` guarda o mesmo texto nos
 * dois idiomas porque o banco tem uma coluna só; a forma `Loc` fica para o dia
 * em que houver tradução de verdade.
 */
export interface Customer {
  id: string;
  name: string;
  segment: Loc;
  /** Chave do plano no banco: "free" | "paid" | "custom". */
  plan: string;
  status: CustomerStatus;
  /** Data de cadastro em dd/mm/aaaa, formatada no servidor. */
  data: string;
  /** Nome do dono do comércio, vindo de `profiles.full_name`. */
  resp: string;
  /** Mensalidade formatada ("R$ 89,00"), ou "—" quando não há cobrança. */
  amount: string;
  /** Cidade / UF informada no cadastro (`tenants.city`). */
  city: string;
  /** Telefone de contato (`tenants.phone`). */
  phone: string;
  /** Chaves dos módulos ativos, as mesmas da tabela `modules`. */
  mods: string[];
}

export interface Message {
  from: "customer" | "admin";
  /**
   * Mensagens do banco vêm num idioma só (`string`); a forma `Loc` fica de pé
   * para textos do próprio painel que tenham tradução.
   */
  text: Loc | string;
  at: string;
}

/**
 * Um chamado de suporte, já traduzido da linha do banco para o vocabulário da
 * interface. Ver `lib/chamados.ts` para o mapeamento.
 */
export interface Ticket {
  id: string;
  /** UUID do tenant que abriu o chamado (`support_tickets.tenant_id`). */
  customerId: string;
  subject: Loc;
  status: TicketStatus;
  prioridade: Priority;
  data: string;
  messages: Message[];
}

/** Uma parcela efetivamente paga, como aparece no histórico do cliente. */
export interface PaymentHistory {
  /** Data do pagamento em dd/mm/aaaa. */
  paid: string;
  /** Mês de competência da cobrança em mm/aaaa. */
  month: string;
  /** Valor pago formatado ("R$ 89,00"). */
  amount: string;
}

export interface Payment {
  status: PaymentStatus;
  latest: string;
  vencimento: string;
  hist: PaymentHistory[];
}

export interface SettingItem {
  id: string;
  label: Loc;
  type: "mods" | "numero" | "select" | "telefone";
  value: string | number | string[];
  options?: [string, Loc][];
  /** Linha de apoio sob o rótulo, para o ajuste cujo efeito não é óbvio. */
  hint?: Loc;
}

export interface MonthlyRevenue {
  month: Loc;
  amount: number;
}

/** Pending edits on a customer record, applied only on "Salvar alterações". */
export interface Draft {
  id: string;
  plan: string;
  mods: string[];
  amount: string;
}

export type ModalTipo =
  | "signOut"
  | "discard"
  | "moduleOff"
  | "clear"
  | "all"
  | "pay"
  | "undo"
  | "history"
  | "plan"
  | "module"
  | "deletePlan"
  | "delete"
  | "deactivate"
  | "reactivate";

export interface ModalEstado {
  type: ModalTipo;
  target?: string | null;
  /** Where to go once a "discard changes" prompt is confirmed — an href. */
  destination?: string | null;
  mod?: string | null;
}

export interface FormState {
  type: "plan" | "module";
  k: string | null;
  new: boolean;
  name: string;
  price: string;
  desc: string;
  /** Modules for a plan form, plans for a module form. */
  sel: string[];
  fixed: boolean;
}

export interface ToastState {
  id: string;
  msg: string;
  type: "ok" | "error" | "warning";
}

export interface HintState {
  text: string;
  top: number;
  left: number;
}

export type AuthView = "login" | "forgot" | "sent" | "reset";

/** Presentation knobs the design exposes; set once on `<AdminProvider>`. */
export interface AdminOptions {
  showEmptyStates: boolean;
  mostrarPainelAtividade: boolean;
  colunasModulos: number;
  mostrarValorMensal: boolean;
  destacarInativos: boolean;
}

/**
 * Session state. The URL owns *where* you are; this owns everything else —
 * filters, drafts, theme, language and the records being edited.
 */
export interface AdminState {
  /** Formulário de novo cliente com algo preenchido — usado pelo guard de saída. */
  newCustomerDirty: boolean;
  search: string;
  plan: string;
  status: string;
  rowMenu: string | null;
  theme: Theme;
  language: Language;
  collapsed: boolean;
  /**
   * A gaveta do menu, que só existe no celular. No desktop a barra lateral está
   * sempre em tela e quem manda na largura dela é `collapsed`.
   */
  navOpen: boolean;
  modal: ModalEstado | null;
  confirmation: string;
  hint: HintState | null;
  draft: Draft | null;
  notificationsOpen: boolean;
  lidas: boolean;
  form: FormState | null;
  editingSetting: string | null;
  settingDraft: string | number | string[] | null;
  paymentFilter: string;
  buscaPag: string;
  paymentMenu: string | null;
  screenWidth: number;
  toasts: ToastState[];
  authView: AuthView;
  password1: string;
  password2: string;
  recoveryEmail: string;
  revenue: MonthlyRevenue[];
  payments: Record<string, Payment>;
  /** Falha ao ler `platform_payments`. */
  billingError: string | null;
  modules: Module[];
  /** Falha ao ler o catálogo de módulos no Supabase. */
  modulesError: string | null;
  plans: Plan[];
  /** Falha ao ler `plans`. */
  plansError: string | null;
  settings: SettingItem[];
  /** Falha ao ler `platform_settings`. */
  settingsError: string | null;
  chamadoSel: string;
  ticketFilter: string;
  ticketSearch: string;
  resposta: string;
  loginEmail: string;
  loginPassword: string;
  lastAction: string | null;
  /** Nome do admin logado (`profiles.full_name`), para a barra lateral. */
  adminName: string | null;
  customers: Customer[];
  /** Falha ao ler os clientes no Supabase, para a lista poder explicar o vazio. */
  customersError: string | null;
  tickets: Ticket[];
  /** Falha ao ler os chamados no Supabase, pelo mesmo motivo. */
  ticketsError: string | null;
}

/** Returning `null` from an updater leaves the state untouched. */
export type Patch = Partial<AdminState> | ((s: AdminState) => Partial<AdminState> | null);

export interface AdminActions {
  set: (patch: Patch) => void;
  L: Dic;
  toast: (msg: string, type?: ToastState["type"]) => void;
  openModal: (
    type: ModalTipo,
    target?: string | null,
    destination?: string | null,
    mod?: string | null,
  ) => void;
  closeModal: () => void;
  /**
   * Roda o verbo do diálogo aberto e devolve a promessa da gravação — é dela
   * que o `Button` de `@aguiar/ui` tira o girador e a trava contra o segundo
   * clique, sem que cada diálogo precise do seu próprio "salvando".
   */
  confirmModal: () => Promise<void>;
  /** Navigate, prompting first when a customer record has unsaved edits. */
  goTo: (href: string) => void;
  openCustomer: (id: string) => void;
  /** Makes sure a draft exists for the customer the detail route is showing. */
  ensureDraft: (id: string) => void;
  editDraft: (fn: (r: Draft) => Draft) => void;
  discardDraft: () => void;
  saveDraft: () => Promise<void>;
  openPlanForm: (k: string | null) => void;
  openModuleForm: (k: string) => void;
  /** Move um cliente para outro plano, recalculando módulos e mensalidade. */
  moveCustomerToPlan: (customerId: string, novoPlano: string) => Promise<void>;
  editForm: (field: "name" | "preco" | "desc", amount: string) => void;
  toggleSelected: (v: string) => void;
  baixarCsv: (rows: string[], name: string) => void;
  toggleTheme: () => void;
  toggleLanguage: () => void;
  showHint: (e: SyntheticEvent<HTMLElement>) => void;
  hideHint: () => void;
}
