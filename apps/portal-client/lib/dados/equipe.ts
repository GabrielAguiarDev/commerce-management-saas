import { MODULOS_PERM } from "@/lib/dados/perfis";
import { proximoId } from "@/lib/dados/uid";
import type { Funcionario, LinhaLog, ModuloKey, Papel, PerfilKey, TagLog } from "@/types/types";

const PAPEIS_SEED: Record<PerfilKey, [string, ModuloKey[], boolean][]> = {
  petshop: [
    ["Dono", MODULOS_PERM.slice(), true],
    ["Gerente", ["vendas", "produtos", "estoque", "caixa", "custos", "relatorios"], false],
    ["Vendedor", ["vendas", "produtos"], false],
    ["Caixa", ["vendas", "caixa"], false],
  ],
  acaraje: [
    ["Dono", MODULOS_PERM.slice(), true],
    ["Ajudante", ["vendas"], false],
  ],
};

const EQUIPE_SEED: Record<PerfilKey, [string, string, string, boolean, string][]> = {
  petshop: [
    ["Marcela Dias", "marcela@petecia.com.br", "Dono", true, "agora"],
    ["João Batista", "joao@petecia.com.br", "Gerente", true, "hoje, 07:50"],
    ["Ana Souza", "ana@petecia.com.br", "Vendedor", true, "hoje, 09:12"],
    ["Carla Menezes", "carla@petecia.com.br", "Caixa", false, "há 12 dias"],
  ],
  acaraje: [["Rita Nascimento", "rita@email.com", "Dono", true, "agora"]],
};

/** [dias atrás, hora, quem, tag, texto, detalhe] */
const LOG_SEED: Record<PerfilKey, [number, string, string, TagLog, string, string][]> = {
  petshop: [
    [0, "14:32", "Marcela Dias", "venda", "registrou uma venda de R$ 90,00", "Banho e tosa"],
    [0, "13:58", "Ana Souza", "venda", "registrou uma venda de R$ 128,00", "Ração premium 15kg"],
    [0, "11:40", "Marcela Dias", "caixa", "fez uma sangria de R$ 200,00", "Retirada para o cofre"],
    [0, "10:15", "João Batista", "estoque", "ajustou o estoque de Shampoo neutro 500ml", "Contagem física"],
    [1, "17:20", "João Batista", "estoque", "registrou uma perda de 1 un", "Areia sanitária 4kg"],
    [1, "16:05", "Marcela Dias", "venda", "estornou uma venda de R$ 64,00", "Venda das 15:48"],
    [1, "08:40", "João Batista", "estoque", "deu entrada em 10 un", "Ração premium 15kg"],
    [2, "18:10", "Marcela Dias", "caixa", "fechou o caixa com sobra de R$ 12,00", "Turno de 08:00 às 18:10"],
    [2, "09:30", "Marcela Dias", "config", "cadastrou o funcionário Ana Souza", "Tipo de acesso: Vendedor"],
    [3, "15:22", "Ana Souza", "venda", "registrou uma venda de R$ 245,00", "3 itens"],
    [5, "11:02", "Marcela Dias", "custos", "lançou o aluguel de R$ 2.400,00", "Custo fixo · Contas"],
  ],
  acaraje: [
    [0, "15:10", "Rita Nascimento", "venda", "registrou uma venda de R$ 24,00", "2 acarajés completos"],
    [0, "08:20", "Rita Nascimento", "custos", "lançou o feijão fradinho de R$ 68,00", "Custo variável"],
    [1, "19:05", "Rita Nascimento", "venda", "registrou uma venda de R$ 36,00", "3 acarajés"],
    [2, "12:40", "Rita Nascimento", "venda", "estornou uma venda de R$ 12,00", "Cliente desistiu"],
  ],
};

export const LOG_TAGS: Record<TagLog, { nome: string; cor: string; bg: string }> = {
  venda: { nome: "Venda", cor: "var(--accent)", bg: "var(--accent-soft)" },
  caixa: { nome: "Caixa", cor: "var(--pos)", bg: "var(--pos-soft)" },
  estoque: { nome: "Estoque", cor: "var(--warn)", bg: "var(--warn-soft)" },
  custos: { nome: "Custos", cor: "var(--text2)", bg: "var(--surface3)" },
  config: { nome: "Configurações", cor: "var(--petrol)", bg: "var(--surface3)" },
};

export function mkPapeis(perfil: PerfilKey): Papel[] {
  return (PAPEIS_SEED[perfil] || []).map((p) => ({
    id: proximoId(),
    nome: p[0],
    modulos: p[1].slice(),
    fixo: p[2],
  }));
}

export function mkEquipe(perfil: PerfilKey): Funcionario[] {
  return (EQUIPE_SEED[perfil] || []).map((f) => ({
    id: proximoId(),
    nome: f[0],
    email: f[1],
    papel: f[2],
    ativo: f[3],
    acesso: f[4],
    dono: f[2] === "Dono",
  }));
}

export function mkLog(perfil: PerfilKey): LinhaLog[] {
  return (LOG_SEED[perfil] || []).map((l) => ({
    id: proximoId(),
    d: l[0],
    hora: l[1],
    quem: l[2],
    tag: l[3],
    texto: l[4],
    detalhe: l[5],
  }));
}
