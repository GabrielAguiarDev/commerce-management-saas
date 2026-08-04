import type { MovEstoque, TipoMovEstoque } from "@/types/types";

/** A cor e o rótulo de cada tipo de movimentação. */
export const MOV_ESTILO: Record<TipoMovEstoque, { nome: string; cor: string; bg: string }> = {
  entrada: { nome: "Entrada", cor: "var(--pos)", bg: "var(--pos-soft)" },
  saida: { nome: "Saída ou perda", cor: "var(--danger)", bg: "var(--warn-soft)" },
  ajuste: { nome: "Ajuste", cor: "var(--warn)", bg: "var(--warn-soft)" },
  venda: { nome: "Venda", cor: "var(--accent)", bg: "var(--accent-soft)" },
};

/**
 * `stock_movements.type` — as chaves que a função `apply_stock_movement`
 * espera. O ajuste é o único que fala em saldo final, não em variação.
 */
export const MOV_DB: Record<TipoMovEstoque, string> = {
  entrada: "in",
  saida: "out",
  ajuste: "adjustment",
  venda: "sale",
};

const DB_PARA_PORTAL: Record<string, TipoMovEstoque> = Object.fromEntries(
  Object.entries(MOV_DB).map(([pt, db]) => [db, pt as TipoMovEstoque]),
) as Record<string, TipoMovEstoque>;

export function movDoBanco(v: string | null): TipoMovEstoque {
  return DB_PARA_PORTAL[v ?? ""] ?? "ajuste";
}

/**
 * Baixa por venda é consequência, não lançamento: quem quiser desfazer estorna
 * a venda. Só o que foi digitado à mão pode ser revertido no Estoque.
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
