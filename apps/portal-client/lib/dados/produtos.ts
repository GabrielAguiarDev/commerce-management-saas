import { proximoId } from "@/lib/dados/uid";
import type { PerfilKey, Produto } from "@/types/types";

/** [nome, preço, código de barras, "fav" quando é dos mais vendidos] */
type LinhaProduto = [string, number, string, string];

const CATALOGO: Record<PerfilKey, LinhaProduto[]> = {
  petshop: [
    ["Ração premium 15kg", 189.9, "7891000101", "fav"],
    ["Banho e tosa", 90, "7891000102", "fav"],
    ["Areia sanitária 4kg", 32, "7891000103", "fav"],
    ["Antipulgas", 48.5, "7891000104", "fav"],
    ["Consulta veterinária", 120, "7891000105", ""],
    ["Brinquedo mordedor", 24.9, "7891000106", ""],
    ["Coleira ajustável", 26, "7891000107", ""],
    ["Shampoo neutro 500ml", 34.9, "7891000108", ""],
    ["Ração filhote 3kg", 72.5, "7891000109", ""],
    ["Ração gatos 10kg", 154, "7891000110", ""],
    ["Petisco bifinho 500g", 28.9, "7891000111", ""],
    ["Osso natural", 18, "7891000112", ""],
    ["Vermífugo comprimido", 39.9, "7891000113", ""],
    ["Vacina V10", 110, "7891000114", ""],
    ["Tosa higiênica", 55, "7891000115", ""],
    ["Corte de unhas", 25, "7891000116", ""],
    ["Comedouro inox", 42, "7891000117", ""],
    ["Bebedouro automático", 89.9, "7891000118", ""],
    ["Caixa de transporte P", 119, "7891000119", ""],
    ["Cama pet média", 149, "7891000120", ""],
    ["Arranhador para gatos", 97.5, "7891000121", ""],
    ["Tapete higiênico 30un", 54.9, "7891000122", ""],
    ["Condicionador pet 300ml", 31.5, "7891000123", ""],
    ["Escova removedora de pelos", 36, "7891000124", ""],
    ["Guia retrátil 5m", 68, "7891000125", ""],
    ["Peitoral acolchoado", 59.9, "7891000126", ""],
    ["Sachê ração úmida", 6.9, "7891000127", ""],
    ["Areia sílica 3,6kg", 48, "7891000128", ""],
    ["Coleira antipulgas", 79.9, "7891000129", ""],
    ["Suplemento vitamínico", 64, "7891000130", ""],
  ],
  acaraje: [
    ["Acarajé completo", 12, "001", "fav"],
    ["Acarajé sem pimenta", 11, "002", "fav"],
    ["Abará", 10, "003", "fav"],
    ["Vatapá extra", 5, "004", ""],
    ["Refrigerante lata", 6, "005", "fav"],
    ["Água mineral", 4, "006", ""],
  ],
};

/**
 * A categoria sai do nome do produto. Ninguém digita categoria ao cadastrar um
 * item no balcão, então o portal chuta pelo que reconhece e deixa a pessoa
 * corrigir depois em Produtos.
 */
const CAT_REGRAS: Record<PerfilKey, [RegExp, string][]> = {
  petshop: [
    [/banho|tosa|consulta|vacina|unhas|vermífugo|antipulgas|suplemento/i, "Serviços e saúde"],
    [/ração|sachê|petisco|bifinho|osso/i, "Alimentação"],
    [/shampoo|condicionador|areia|tapete|escova/i, "Higiene"],
  ],
  acaraje: [[/refrigerante|água/i, "Bebidas"]],
};

const CAT_PADRAO: Record<PerfilKey, string> = {
  petshop: "Acessórios",
  acaraje: "Comidas",
};

/** Serviço não tem prateleira: estoque e mínimo ficam nulos. */
const SERVICOS = /banho|tosa|consulta|vacina|unhas/i;

/** Os itens que o design deixa em falta de propósito, para o alerta ter o que mostrar. */
const ESTOQUE_FIXO: Record<string, number> = {
  "Ração premium 15kg": 3,
  "Areia sanitária 4kg": 2,
  "Shampoo neutro 500ml": 0,
};

const INATIVOS: Record<string, boolean> = { "Osso natural": true };

export const UNIDADES = ["un", "kg", "L", "serviço"];

export function mkProdutos(perfil: PerfilKey): Produto[] {
  return CATALOGO[perfil].map((x) => {
    const [nome, preco, codigo, fav] = x;
    const regra = (CAT_REGRAS[perfil] || []).find((r) => r[0].test(nome));
    const servico = perfil === "petshop" && SERVICOS.test(nome);

    // Quantidade estável a partir do nome: o mesmo produto abre sempre com o
    // mesmo saldo, então servidor e cliente concordam e a tela não pisca.
    const est =
      ESTOQUE_FIXO[nome] != null
        ? ESTOQUE_FIXO[nome]
        : servico
          ? null
          : 4 + ((nome.length * 7 + nome.charCodeAt(0)) % 34);

    return {
      id: proximoId(),
      nome,
      preco,
      codigo,
      fav: fav === "fav",
      ativo: !INATIVOS[nome],
      categoria: regra ? regra[1] : CAT_PADRAO[perfil],
      custo: Math.round(preco * (servico ? 0.35 : 0.6) * 100) / 100,
      estoque: est,
      minimo: est == null ? null : 5,
      unidade: servico ? "serviço" : "un",
    };
  });
}

/** Produto controlado que chegou (ou passou) do mínimo — o que dispara alerta. */
export function estoqueBaixo(p: Produto): boolean {
  return p.estoque != null && p.minimo != null && p.estoque <= p.minimo;
}

/** Só o que tem prateleira entra na tela de Estoque. */
export function controlaEstoque(p: Produto): boolean {
  return p.estoque != null;
}
