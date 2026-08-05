import type { StockMovement, StockMovementType } from "@/types/types";

/** A cor e o rótulo de cada tipo de movimentação. */
export const MOVEMENT_STYLE: Record<StockMovementType, { name: string; color: string; bg: string }> = {
  in: { name: "Entrada", color: "var(--pos)", bg: "var(--pos-soft)" },
  out: { name: "Saída ou perda", color: "var(--danger)", bg: "var(--warn-soft)" },
  adjustment: { name: "Ajuste", color: "var(--warn)", bg: "var(--warn-soft)" },
  sale: { name: "Venda", color: "var(--accent)", bg: "var(--accent-soft)" },
};

/**
 * `stock_movements.type` — as chaves que a função `apply_stock_movement`
 * espera. O ajuste é o único que fala em saldo final, não em variação.
 */
export const MOVEMENT_DB: Record<StockMovementType, string> = {
  in: "in",
  out: "out",
  adjustment: "adjustment",
  sale: "sale",
};

const DB_TO_PORTAL: Record<string, StockMovementType> = Object.fromEntries(
  Object.entries(MOVEMENT_DB).map(([pt, db]) => [db, pt as StockMovementType]),
) as Record<string, StockMovementType>;

export function movementFromDb(v: string | null): StockMovementType {
  return DB_TO_PORTAL[v ?? ""] ?? "adjustment";
}

/**
 * Baixa por venda é consequência, não lançamento: quem quiser desfazer estorna
 * a venda. Só o que foi digitado à mão pode ser revertido no Estoque.
 */
export function canUndo(m: StockMovement): boolean {
  return m.type !== "sale";
}

export const REASON_SUGGESTIONS: Record<StockMovementType, string[]> = {
  in: ["Compra de mercadoria", "Devolução de cliente", "Transferência"],
  out: ["Perda ou quebra", "Vencimento", "Uso interno"],
  adjustment: ["Contagem física", "Correção de cadastro"],
  sale: [],
};
