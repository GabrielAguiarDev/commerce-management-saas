import type { PaymentMethod, RegisterMovement, RegisterMovementType } from "@/types/types";
import { METHODS } from "@/lib/dados/vendas";

/** Reforço entra na gaveta, sangria sai dela. */
export function movementsBalance(movements: RegisterMovement[] | undefined): number {
  return (movements || []).reduce((a, m) => a + (m.type === "deposit" ? m.amount : -m.amount), 0);
}

export function sumByMethod(o: Partial<Record<PaymentMethod, number>> | undefined): number {
  return METHODS.reduce((a, f) => a + (o?.[f] ?? 0), 0);
}

/**
 * O que deveria haver na gaveta agora.
 *
 * Só dinheiro entra na conta: Pix e cartão caem na conta bancária, não na
 * gaveta, e por isso não são contados no fechamento — são conferidos no
 * extrato. É a mesma regra da função `expected_cash_for_register` do banco.
 */
export function expectedInCash(opening: number, vendasEmDinheiro: number, movements: RegisterMovement[]) {
  return opening + vendasEmDinheiro + movementsBalance(movements);
}

/** `cash_movements.type` e `cash_registers.status`. */
export const REGISTER_MOVEMENT_DB: Record<RegisterMovementType, string> = {
  withdrawal: "withdrawal",
  deposit: "deposit",
};

export function registerMovementFromDb(v: string | null): RegisterMovementType {
  return v === "deposit" ? "deposit" : "withdrawal";
}

export const REGISTER_OPEN = "open";
export const REGISTER_CLOSED = "closed";

export const REGISTER_MOVEMENT_STYLE: Record<RegisterMovementType, { label: string; color: string; bg: string }> = {
  withdrawal: { label: "Sangria", color: "var(--warn)", bg: "var(--warn-soft)" },
  deposit: { label: "Reforço", color: "var(--pos)", bg: "var(--pos-soft)" },
};

export const WITHDRAWAL_REASONS = ["Retirada para o cofre", "Pagamento de fornecedor", "Depósito"];
export const DEPOSIT_REASONS = ["Troco extra do cofre", "Aporte do dono"];

/** Valores de troco que a pessoa costuma deixar na gaveta ao abrir. */
export const QUICK_CHANGE = [100, 200, 300, 500];
