import type { AdminState, Ticket, Customer } from "@/types/types";

export const INITIAL_STATE: AdminState = {
  newCustomerDirty: false,
  search: "",
  plan: "all",
  status: "all",
  rowMenu: null,
  theme: "light",
  language: "pt",
  collapsed: false,
  navOpen: false,
  modal: null,
  confirmation: "",
  hint: null,
  draft: null,
  notificationsOpen: false,
  lidas: false,
  form: null,
  editingSetting: null,
  settingDraft: null,
  paymentFilter: "all",
  buscaPag: "",
  paymentMenu: null,
  // Assume desktop until the resize listener reports the truth, so the server
  // render and the first client render agree.
  screenWidth: 1440,
  toasts: [],
  authView: "login",
  password1: "",
  password2: "",
  recoveryEmail: "",
  // Tudo abaixo vem do Supabase pelo layout (server component) e entra aqui
  // pelas props do <AdminProvider>. Sem semente local em lugar nenhum:
  //   receita/pagamentos → platform_payments   config → platform_settings
  //   modulos → modules                        planos → plans
  revenue: [],
  payments: {},
  billingError: null,
  settings: [],
  settingsError: null,
  modules: [],
  modulesError: null,
  plans: [],
  plansError: null,
  ticketFilter: "all",
  ticketSearch: "",
  resposta: "",
  loginEmail: "",
  loginPassword: "",
  lastAction: null,
  // Clientes e chamados vêm do Supabase pelo layout (server component) e entram
  // aqui via `clientesIniciais` / `chamadosIniciais` no <AdminProvider>. Nunca
  // há semente local — `chamadoSel` também é definido lá, a partir da lista.
  adminName: null,
  customers: [],
  customersError: null,
  tickets: [],
  ticketsError: null,
  chamadoSel: "",
};

/** True when the customer draft differs from the saved record. */
export function isDirty(s: AdminState): boolean {
  const r = s.draft;
  if (!r) return false;
  const x = s.customers.find((y) => y.id === r.id);
  if (!x) return false;
  return (
    x.plan !== r.plan ||
    x.amount !== r.amount ||
    x.mods.length !== r.mods.length ||
    r.mods.some((k) => !x.mods.includes(k))
  );
}

export function customerById(s: AdminState, id: string): Customer | undefined {
  return s.customers.find((c) => c.id === id);
}

export function currentTicket(s: AdminState): Ticket | undefined {
  return s.tickets.find((t) => t.id === s.chamadoSel) || s.tickets[0];
}
