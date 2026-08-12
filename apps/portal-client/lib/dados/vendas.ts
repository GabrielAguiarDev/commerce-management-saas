import type { PaymentMethod } from "@/types/types";

export const METHODS: PaymentMethod[] = ["cash", "pix", "debit", "credit"];

/** O que a pessoa precisa lembrar de conferir em cada forma, no fechamento. */
export const METHOD_NOTE: Record<PaymentMethod, string> = {
  cash: "Entra na gaveta automaticamente",
  pix: "Cai na conta, não na gaveta",
  debit: "Confira na maquininha",
  credit: "Confira na maquininha",
};

/**
 * `sales.payment_method` guarda a chave em inglês; a tela mostra o nome em
 * português. A tradução mora aqui para o banco não depender do idioma da
 * interface — e para trocar o rótulo não virar migração.
 */
export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: "Dinheiro",
  pix: "Pix",
  debit: "Débito",
  credit: "Crédito",
};

export const PAYMENT_DB: Record<PaymentMethod, string> = {
  cash: "cash",
  pix: "pix",
  debit: "debit",
  credit: "credit",
};

const DB_TO_PORTAL: Record<string, PaymentMethod> = Object.fromEntries(
  Object.entries(PAYMENT_DB).map(([pt, db]) => [db, pt as PaymentMethod]),
) as Record<string, PaymentMethod>;

/** Forma desconhecida cai em Dinheiro — não vale perder a venda por um rótulo. */
export function paymentFromDb(v: string | null): PaymentMethod {
  return DB_TO_PORTAL[v ?? ""] ?? "cash";
}

/**
 * Venda estornada continua no histórico, riscada, fora do faturamento —
 * `sales.status`.
 */
export const SALE_STATUS = { normal: "completed", refunded: "refunded" } as const;
