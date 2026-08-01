import type { SyntheticEvent } from "react";
import type { Dic } from "@/lib/dictionary";

export type Idioma = "pt" | "en";
export type Tema = "claro" | "escuro";

/** A string translated into both panel languages. */
export type Loc = { pt: string; en: string };

export type StatusCliente = "ativo" | "inativo";
export type StatusChamado = "aberto" | "andamento" | "resolvido";
export type Prioridade = "alta" | "media" | "baixa";
export type StatusPagamento = "emdia" | "atrasado" | "pendente";

export interface Modulo {
  k: string;
  /** `acesso` modules unlock a channel (the mobile app) rather than a section. */
  tipo?: "acesso";
  nome: Loc;
  sigla: string;
  desc: Loc;
  planos: string[];
}

export interface Plano {
  k: string;
  nome: Loc;
  tipo: "fixo" | "custom";
  preco: string | null;
  desc: Loc;
  mods: string[];
}

export interface Cliente {
  id: number;
  nome: string;
  segmento: Loc;
  plano: string;
  status: StatusCliente;
  data: string;
  cidade: string;
  resp: string;
  valor: string;
  mods: string[];
}

export interface Mensagem {
  de: "cliente" | "admin";
  /** Seeded messages are translated; replies typed in the panel are not. */
  texto: Loc | string;
  quando: string;
}

export interface Chamado {
  id: string;
  clienteId: number;
  assunto: Loc;
  status: StatusChamado;
  prioridade: Prioridade;
  data: string;
  msgs: Mensagem[];
}

export interface Pagamento {
  status: StatusPagamento;
  ultimo: string;
  vencimento: string;
  hist: [string, string][];
}

export interface ConfigItem {
  id: string;
  rotulo: Loc;
  tipo: "mods" | "numero" | "select";
  valor: string | number | string[];
  opcoes?: [string, Loc][];
}

export interface ReceitaMes {
  mes: Loc;
  valor: number;
}

/** Pending edits on a customer record, applied only on "Salvar alterações". */
export interface Rascunho {
  id: number;
  plano: string;
  mods: string[];
  valor: string;
}

export type ModalTipo =
  | "sair"
  | "descartar"
  | "modOff"
  | "limpar"
  | "todos"
  | "pagar"
  | "reverter"
  | "historico"
  | "plano"
  | "modulo"
  | "excluir"
  | "desativar"
  | "reativar";

export interface ModalEstado {
  tipo: ModalTipo;
  alvo?: number | null;
  /** Where to go once a "discard changes" prompt is confirmed — an href. */
  destino?: string | null;
  mod?: string | null;
}

export interface FormEstado {
  tipo: "plano" | "modulo";
  k: string | null;
  novo: boolean;
  nome: string;
  preco: string;
  desc: string;
  /** Modules for a plan form, plans for a module form. */
  sel: string[];
  fixo: boolean;
}

export interface ToastEstado {
  id: string;
  msg: string;
  tipo: "ok" | "erro" | "alerta";
}

export interface DicaEstado {
  texto: string;
  top: number;
  left: number;
}

export type AuthView = "login" | "esqueci" | "enviado" | "redefinir";

/** Presentation knobs the design exposes; set once on `<AdminProvider>`. */
export interface AdminOpcoes {
  mostrarEstadosVazios: boolean;
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
  /** Modal de cadastro de cliente aberto. */
  novoClienteAberto: boolean;
  busca: string;
  plano: string;
  status: string;
  menuLinha: number | null;
  tema: Tema;
  idioma: Idioma;
  colapsada: boolean;
  modal: ModalEstado | null;
  confirmacao: string;
  dica: DicaEstado | null;
  rascunho: Rascunho | null;
  notifAberta: boolean;
  lidas: boolean;
  form: FormEstado | null;
  cfgEditando: string | null;
  cfgRascunho: string | number | string[] | null;
  filtroPag: string;
  buscaPag: string;
  menuPag: number | null;
  larguraTela: number;
  toasts: ToastEstado[];
  authView: AuthView;
  senha1: string;
  senha2: string;
  emailRec: string;
  receita: ReceitaMes[];
  pagamentos: Record<number, Pagamento>;
  modulos: Modulo[];
  planos: Plano[];
  config: ConfigItem[];
  chamadoSel: string;
  filtroChamado: string;
  buscaChamado: string;
  resposta: string;
  loginEmail: string;
  loginSenha: string;
  ultimaAcao: string | null;
  clientes: Cliente[];
  chamados: Chamado[];
}

/** Returning `null` from an updater leaves the state untouched. */
export type Patch = Partial<AdminState> | ((s: AdminState) => Partial<AdminState> | null);

export interface AdminActions {
  set: (patch: Patch) => void;
  L: Dic;
  toast: (msg: string, tipo?: ToastEstado["tipo"]) => void;
  abrirModal: (
    tipo: ModalTipo,
    alvo?: number | null,
    destino?: string | null,
    mod?: string | null,
  ) => void;
  fecharModal: () => void;
  confirmarModal: () => void;
  /** Navigate, prompting first when a customer record has unsaved edits. */
  ir: (href: string) => void;
  abrirCliente: (id: number) => void;
  /** Makes sure a draft exists for the customer the detail route is showing. */
  garantirRascunho: (id: number) => void;
  editarRascunho: (fn: (r: Rascunho) => Rascunho) => void;
  descartarRascunho: () => void;
  salvarRascunho: () => void;
  abrirFormPlano: (k: string | null) => void;
  abrirFormModulo: (k: string) => void;
  editarForm: (campo: "nome" | "preco" | "desc", valor: string) => void;
  alternarSel: (v: string) => void;
  baixarCsv: (linhas: string[], nome: string) => void;
  alternarTema: () => void;
  alternarIdioma: () => void;
  mostrarDica: (e: SyntheticEvent<HTMLElement>) => void;
  ocultarDica: () => void;
}
