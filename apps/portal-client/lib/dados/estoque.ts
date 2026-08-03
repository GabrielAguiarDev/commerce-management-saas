import { proximoId } from "@/lib/dados/uid";
import type { MovEstoque, PerfilKey, TipoMovEstoque } from "@/types/types";

/** [dias atrás, hora, produto, tipo, delta assinado, motivo] */
type LinhaMov = [number, string, string, TipoMovEstoque, number, string];

const SEED: Record<PerfilKey, LinhaMov[]> = {
  petshop: [
    [1, "08:40", "Ração premium 15kg", "entrada", 10, "Compra — Distribuidora Pet Sul"],
    [1, "17:20", "Areia sanitária 4kg", "saida", -1, "Embalagem rasgada"],
    [2, "09:15", "Shampoo neutro 500ml", "ajuste", -2, "Contagem física: nada na prateleira"],
    [3, "10:05", "Antipulgas", "entrada", 6, "Compra — Vet Distribuidora"],
  ],
  acaraje: [],
};

export function mkMovs(perfil: PerfilKey, quem: string): MovEstoque[] {
  return (SEED[perfil] || []).map((m) => ({
    id: proximoId(),
    d: m[0],
    hora: m[1],
    produto: m[2],
    tipo: m[3],
    delta: m[4],
    motivo: m[5],
    quem,
  }));
}

/** A cor e o rótulo de cada tipo de movimentação, no estoque e no caixa. */
export const MOV_ESTILO: Record<TipoMovEstoque, { nome: string; cor: string; bg: string }> = {
  entrada: { nome: "Entrada", cor: "var(--pos)", bg: "var(--pos-soft)" },
  saida: { nome: "Saída ou perda", cor: "var(--danger)", bg: "var(--warn-soft)" },
  ajuste: { nome: "Ajuste", cor: "var(--warn)", bg: "var(--warn-soft)" },
  venda: { nome: "Venda", cor: "var(--accent)", bg: "var(--accent-soft)" },
};

/**
 * Baixa por venda é consequência, não lançamento: quem quiser desfazer estorna
 * a venda. Só o que foi digitado à mão pode ser revertido aqui.
 */
export function podeReverter(m: MovEstoque): boolean {
  return m.tipo !== "venda";
}

export const SUGESTOES_MOTIVO: Record<TipoMovEstoque, string[]> = {
  entrada: ["Compra de mercadoria", "Devolução de cliente", "Transferência"],
  saida: ["Perda ou quebra", "Vencimento", "Uso interno"],
  ajuste: ["Contagem física", "Correção de cadastro"],
  venda: [],
};
