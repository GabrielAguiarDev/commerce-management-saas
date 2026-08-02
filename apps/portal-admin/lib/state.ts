import type { AdminState, Chamado, Cliente } from "@/types/types";

export const ESTADO_INICIAL: AdminState = {
  novoClienteSujo: false,
  busca: "",
  plano: "todos",
  status: "todos",
  menuLinha: null,
  tema: "claro",
  idioma: "pt",
  colapsada: false,
  modal: null,
  confirmacao: "",
  dica: null,
  rascunho: null,
  notifAberta: false,
  lidas: false,
  form: null,
  cfgEditando: null,
  cfgRascunho: null,
  filtroPag: "todos",
  buscaPag: "",
  menuPag: null,
  // Assume desktop until the resize listener reports the truth, so the server
  // render and the first client render agree.
  larguraTela: 1440,
  toasts: [],
  authView: "login",
  senha1: "",
  senha2: "",
  emailRec: "",
  // Tudo abaixo vem do Supabase pelo layout (server component) e entra aqui
  // pelas props do <AdminProvider>. Sem semente local em lugar nenhum:
  //   receita/pagamentos → platform_payments   config → platform_settings
  //   modulos → modules                        planos → plans
  receita: [],
  pagamentos: {},
  erroFinanceiro: null,
  config: [],
  erroConfig: null,
  modulos: [],
  erroModulos: null,
  planos: [],
  erroPlanos: null,
  filtroChamado: "todos",
  buscaChamado: "",
  resposta: "",
  loginEmail: "",
  loginSenha: "",
  ultimaAcao: null,
  // Clientes e chamados vêm do Supabase pelo layout (server component) e entram
  // aqui via `clientesIniciais` / `chamadosIniciais` no <AdminProvider>. Nunca
  // há semente local — `chamadoSel` também é definido lá, a partir da lista.
  adminNome: null,
  clientes: [],
  erroClientes: null,
  chamados: [],
  erroChamados: null,
  chamadoSel: "",
};

/** True when the customer draft differs from the saved record. */
export function estaSujo(s: AdminState): boolean {
  const r = s.rascunho;
  if (!r) return false;
  const x = s.clientes.find((y) => y.id === r.id);
  if (!x) return false;
  return (
    x.plano !== r.plano ||
    x.valor !== r.valor ||
    x.mods.length !== r.mods.length ||
    r.mods.some((k) => !x.mods.includes(k))
  );
}

export function clientePorId(s: AdminState, id: string): Cliente | undefined {
  return s.clientes.find((c) => c.id === id);
}

export function chamadoAtual(s: AdminState): Chamado | undefined {
  return s.chamados.find((t) => t.id === s.chamadoSel) || s.chamados[0];
}
