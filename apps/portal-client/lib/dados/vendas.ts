import type { FormaPagamento } from "@/types/types";

export const FORMAS: FormaPagamento[] = ["Dinheiro", "Pix", "Débito", "Crédito"];

/** O que a pessoa precisa lembrar de conferir em cada forma, no fechamento. */
export const NOTA_FORMA: Record<FormaPagamento, string> = {
  Dinheiro: "Entra na gaveta automaticamente",
  Pix: "Cai na conta, não na gaveta",
  Débito: "Confira na maquininha",
  Crédito: "Confira na maquininha",
};

/**
 * `sales.payment_method` guarda a chave em inglês; a tela mostra o nome em
 * português. A tradução mora aqui para o banco não depender do idioma da
 * interface — e para trocar o rótulo não virar migração.
 */
export const PAGAMENTO_DB: Record<FormaPagamento, string> = {
  Dinheiro: "cash",
  Pix: "pix",
  Débito: "debit",
  Crédito: "credit",
};

const DB_PARA_PORTAL: Record<string, FormaPagamento> = Object.fromEntries(
  Object.entries(PAGAMENTO_DB).map(([pt, db]) => [db, pt as FormaPagamento]),
) as Record<string, FormaPagamento>;

/** Forma desconhecida cai em Dinheiro — não vale perder a venda por um rótulo. */
export function pagamentoDoBanco(v: string | null): FormaPagamento {
  return DB_PARA_PORTAL[v ?? ""] ?? "Dinheiro";
}

/**
 * Venda estornada continua no histórico, riscada, fora do faturamento —
 * `sales.status`.
 */
export const STATUS_VENDA = { normal: "completed", estornada: "refunded" } as const;
