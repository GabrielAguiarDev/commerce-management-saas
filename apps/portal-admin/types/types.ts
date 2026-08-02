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

/**
 * Um cliente (tenant) da plataforma, já traduzido da linha do banco para o
 * vocabulário da interface. Ver `lib/clientes.ts` para o mapeamento.
 *
 * `id` é o UUID do tenant — não um número. `segmento` guarda o mesmo texto nos
 * dois idiomas porque o banco tem uma coluna só; a forma `Loc` fica para o dia
 * em que houver tradução de verdade.
 */
export interface Cliente {
  id: string;
  nome: string;
  segmento: Loc;
  /** Chave do plano no banco: "free" | "paid" | "custom". */
  plano: string;
  status: StatusCliente;
  /** Data de cadastro em dd/mm/aaaa, formatada no servidor. */
  data: string;
  /** Nome do dono do comércio, vindo de `profiles.full_name`. */
  resp: string;
  /** Mensalidade formatada ("R$ 89,00"), ou "—" quando não há cobrança. */
  valor: string;
  /** Chaves dos módulos ativos, as mesmas da tabela `modules`. */
  mods: string[];
}

export interface Mensagem {
  de: "cliente" | "admin";
  /**
   * Mensagens do banco vêm num idioma só (`string`); a forma `Loc` fica de pé
   * para textos do próprio painel que tenham tradução.
   */
  texto: Loc | string;
  quando: string;
}

/**
 * Um chamado de suporte, já traduzido da linha do banco para o vocabulário da
 * interface. Ver `lib/chamados.ts` para o mapeamento.
 */
export interface Chamado {
  id: string;
  /** UUID do tenant que abriu o chamado (`support_tickets.tenant_id`). */
  clienteId: string;
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
  id: string;
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
  alvo?: string | null;
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
  /** Formulário de novo cliente com algo preenchido — usado pelo guard de saída. */
  novoClienteSujo: boolean;
  busca: string;
  plano: string;
  status: string;
  menuLinha: string | null;
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
  menuPag: string | null;
  larguraTela: number;
  toasts: ToastEstado[];
  authView: AuthView;
  senha1: string;
  senha2: string;
  emailRec: string;
  receita: ReceitaMes[];
  pagamentos: Record<string, Pagamento>;
  modulos: Modulo[];
  /** Falha ao ler o catálogo de módulos no Supabase. */
  erroModulos: string | null;
  planos: Plano[];
  config: ConfigItem[];
  chamadoSel: string;
  filtroChamado: string;
  buscaChamado: string;
  resposta: string;
  loginEmail: string;
  loginSenha: string;
  ultimaAcao: string | null;
  /** Nome do admin logado (`profiles.full_name`), para a barra lateral. */
  adminNome: string | null;
  clientes: Cliente[];
  /** Falha ao ler os clientes no Supabase, para a lista poder explicar o vazio. */
  erroClientes: string | null;
  chamados: Chamado[];
  /** Falha ao ler os chamados no Supabase, pelo mesmo motivo. */
  erroChamados: string | null;
}

/** Returning `null` from an updater leaves the state untouched. */
export type Patch = Partial<AdminState> | ((s: AdminState) => Partial<AdminState> | null);

export interface AdminActions {
  set: (patch: Patch) => void;
  L: Dic;
  toast: (msg: string, tipo?: ToastEstado["tipo"]) => void;
  abrirModal: (
    tipo: ModalTipo,
    alvo?: string | null,
    destino?: string | null,
    mod?: string | null,
  ) => void;
  fecharModal: () => void;
  confirmarModal: () => void;
  /** Navigate, prompting first when a customer record has unsaved edits. */
  ir: (href: string) => void;
  abrirCliente: (id: string) => void;
  /** Makes sure a draft exists for the customer the detail route is showing. */
  garantirRascunho: (id: string) => void;
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
