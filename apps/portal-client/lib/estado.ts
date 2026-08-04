import { mkCaixas } from "@/lib/dados/caixa";
import { mkChamados } from "@/lib/dados/chamados";
import { CATS_CUSTO, mkCustos } from "@/lib/dados/custos";
import { mkEquipe, mkLog, mkPapeis } from "@/lib/dados/equipe";
import { mkMovs } from "@/lib/dados/estoque";
import { PERFIS } from "@/lib/dados/perfis";
import { mkProdutos } from "@/lib/dados/produtos";
import { FORMAS, mkVendas } from "@/lib/dados/vendas";
import type {
  FormCaixa,
  FormChamado,
  FormCusto,
  FormFuncionario,
  FormMov,
  FormPapel,
  FormProduto,
  FormResposta,
  PortalState,
} from "@/types/estado";
import type { DadosNegocio, PerfilKey, Preferencias, Tema } from "@/types/types";

/** Largura abaixo da qual o portal vira a versão de celular. */

export const FORM_PRODUTO_VAZIO: FormProduto = {
  id: null,
  nome: "",
  preco: "",
  categoria: "",
  catNova: false,
  ativo: true,
  fav: false,
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
  contado: {},
};

export const FORM_FUNC_VAZIO: FormFuncionario = {
  id: null,
  nome: "",
  email: "",
  papel: "",
  tentouSalvar: false,
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

/** Os dados que a tela de Configurações edita, derivados do perfil. */
function dadosDe(perfil: PerfilKey): DadosNegocio {
  const n = PERFIS[perfil];
  return perfil === "petshop"
    ? {
        nome: n.nome,
        tipo: "Petshop",
        documento: "12.345.678/0001-90",
        telefone: "(71) 99876-5432",
        endereco: "Rua das Flores, 120 — Centro, Salvador/BA",
      }
    : {
        nome: n.nome,
        tipo: "Comida de rua",
        documento: "123.456.789-00",
        telefone: "(71) 98765-4321",
        endereco: "Largo do Rio Vermelho — Salvador/BA",
      };
}

const PREFS_PADRAO: Preferencias = {
  imprimirComprovante: true,
  pedirCliente: false,
  alertaEstoque: true,
};

/**
 * Monta o estado inteiro a partir de um perfil.
 *
 * Trocar de perfil descarta tudo e semeia de novo — é uma demonstração, e
 * misturar as vendas do petshop com o catálogo da barraca não faria sentido.
 * Aparência e largura da tela sobrevivem à troca porque são de quem olha, não
 * do negócio.
 */
export function estadoDoPerfil(
  perfil: PerfilKey,
  manter?: { tema: Tema; larguraTela: number; colapsada: boolean },
): PortalState {
  const negocio = PERFIS[perfil];
  const caixas = mkCaixas(perfil, negocio.user.nome);
  const produtos = mkProdutos(perfil);
  const dados = dadosDe(perfil);

  const catsProduto = Array.from(new Set(produtos.map((p) => p.categoria))).sort();

  return {
    perfil,
    tema: manter?.tema ?? "claro",
    idioma: "Português (Brasil)",
    larguraTela: manter?.larguraTela ?? 1440,
    colapsada: manter?.colapsada ?? false,
    navAberto: false,
    notifAberto: false,
    logoutAberto: false,
    dica: null,

    produtos,
    vendas: mkVendas(perfil),
    movs: mkMovs(perfil, negocio.user.nome),
    custos: mkCustos(perfil),
    caixaAberto: caixas.aberto,
    caixasFechados: caixas.fechados,
    papeis: mkPapeis(perfil),
    equipe: mkEquipe(perfil),
    log: mkLog(perfil),
    chamados: mkChamados(perfil),

    dados,
    dadosRascunho: { ...dados },
    prefs: { ...PREFS_PADRAO },
    formasAceitas: FORMAS.slice(),
    catsProduto,
    catsCusto: CATS_CUSTO.slice(),
    novaCatProduto: "",
    novaCatCusto: "",

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
    fConfig: {
      aba: "dados",
      logUsuario: "Todos",
      logAcao: "Tudo",
      logPeriodo: "Últimos 30 dias",
    },
    fSuporte: { busca: "", status: "todos" },

    menuLinha: null,
    modal: null,
    conf: null,
    toast: "",

    formProduto: { ...FORM_PRODUTO_VAZIO },
    formCusto: { ...FORM_CUSTO_VAZIO },
    formMov: { ...FORM_MOV_VAZIO },
    formCaixa: { ...FORM_CAIXA_VAZIO },
    formFunc: { ...FORM_FUNC_VAZIO },
    formPapel: { ...FORM_PAPEL_VAZIO },
    formChamado: { ...FORM_CHAMADO_VAZIO },
    formResposta: { ...FORM_RESPOSTA_VAZIA },
  };
}

/** Rascunho de dados do negócio diferente do que está salvo. */
export function dadosSujos(s: PortalState): boolean {
  return (Object.keys(s.dados) as (keyof DadosNegocio)[]).some(
    (k) => s.dados[k] !== s.dadosRascunho[k],
  );
}
