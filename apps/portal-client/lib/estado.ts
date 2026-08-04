import { FORMAS } from "@/lib/dados/vendas";
import type {
  DadosPortal,
  FormCaixa,
  FormChamado,
  FormCusto,
  FormMov,
  FormPapel,
  FormProduto,
  FormResposta,
  PortalState,
} from "@/types/estado";
import type { DadosNegocio, Tema } from "@/types/types";

export const FORM_PRODUTO_VAZIO: FormProduto = {
  id: null,
  nome: "",
  preco: "",
  categoria: "",
  catNova: false,
  ativo: true,
  fav: false,
  servico: false,
  codigo: "",
  custo: "",
  estoque: "",
  minimo: "",
  unidade: "un",
  tentouSalvar: false,
};

export const FORM_CUSTO_VAZIO: FormCusto = {
  id: null,
  tipo: "variavel",
  descricao: "",
  categoria: "",
  valor: "",
  d: 0,
  recorrente: false,
  tentouSalvar: false,
};

export const FORM_MOV_VAZIO: FormMov = {
  tipo: "entrada",
  produtoId: null,
  qtd: "",
  custo: "",
  motivo: "",
  tentouSalvar: false,
};

export const FORM_CAIXA_VAZIO: FormCaixa = {
  valor: "",
  motivo: "",
  obs: "",
  contadoDinheiro: "",
};

export const FORM_PAPEL_VAZIO: FormPapel = {
  id: null,
  nome: "",
  modulos: [],
  tentouSalvar: false,
};

export const FORM_CHAMADO_VAZIO: FormChamado = {
  assunto: "",
  categoria: "Dúvida",
  descricao: "",
  anexo: "",
  tentouEnviar: false,
};

export const FORM_RESPOSTA_VAZIA: FormResposta = { texto: "", anexo: "" };

/** O retrato vazio, usado enquanto a leitura falha ou o ambiente não tem banco. */
export const DADOS_VAZIOS: DadosPortal = {
  negocio: {
    id: "",
    nome: "Seu negócio",
    sigla: "?",
    tipo: "",
    user: { nome: "Você", sigla: "?" },
    modulos: ["dashboard", "config"],
  },
  dados: { nome: "", tipo: "", telefone: "", cidade: "" },
  produtos: [],
  vendas: [],
  movs: [],
  custos: [],
  caixaAberto: null,
  caixasFechados: [],
  papeis: [],
  equipe: [],
  chamados: [],
  erro: null,
};

/**
 * Monta o estado da SESSÃO — tema, filtros, carrinho, rascunhos.
 *
 * O retrato do negócio não entra aqui: ele chega como prop do servidor e é
 * lido direto. Copiá-lo para o estado criaria duas verdades, e a do cliente
 * ficaria velha no instante seguinte a uma escrita.
 */
export function estadoInicial(
  dados: DadosNegocio,
  manter?: { tema: Tema; larguraTela: number; colapsada: boolean },
): PortalState {
  return {
    tema: manter?.tema ?? "claro",
    larguraTela: manter?.larguraTela ?? 1440,
    colapsada: manter?.colapsada ?? false,
    navAberto: false,
    notifAberto: false,
    logoutAberto: false,
    dica: null,

    formasAceitas: FORMAS.slice(),
    imprimirComprovante: true,
    pedirCliente: false,

    dadosRascunho: { ...dados },

    carrinho: [],
    pagAtual: "Dinheiro",
    buscaProd: "",
    codigo: "",
    carrinhoAberto: false,
    editandoVenda: null,

    fVendas: { periodo: "hoje", pag: "Todas as formas", produto: "Todos os produtos", busca: "" },
    fProdutos: { busca: "", cat: "Todas as categorias", status: "Todos", soBaixo: false },
    fEstoque: {
      aba: "itens",
      busca: "",
      status: "Todas as situações",
      cat: "Todas as categorias",
      ordem: "Estoque mais baixo",
      movTipo: "Todos os tipos",
      movProduto: "Todos os produtos",
      movPeriodo: "Últimos 30 dias",
    },
    fCustos: { tipo: "Todos", cat: "Todas as categorias", periodo: "Este mês" },
    fRel: { periodo: "30", comparar: false },
    fConfig: { aba: "dados" },
    fSuporte: { busca: "", status: "todos" },

    menuLinha: null,
    modal: null,
    conf: null,
    toast: "",
    salvando: false,

    formProduto: { ...FORM_PRODUTO_VAZIO },
    formCusto: { ...FORM_CUSTO_VAZIO },
    formMov: { ...FORM_MOV_VAZIO },
    formCaixa: { ...FORM_CAIXA_VAZIO },
    formPapel: { ...FORM_PAPEL_VAZIO },
    formChamado: { ...FORM_CHAMADO_VAZIO },
    formResposta: { ...FORM_RESPOSTA_VAZIA },
  };
}

/** Rascunho de dados do negócio diferente do que está salvo. */
export function dadosSujos(s: PortalState, salvo: DadosNegocio): boolean {
  return (Object.keys(salvo) as (keyof DadosNegocio)[]).some(
    (k) => salvo[k] !== s.dadosRascunho[k],
  );
}
