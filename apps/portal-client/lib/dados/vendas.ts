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

/**
 * ⚠️ AS DUAS GRAFIAS QUE JÁ EXISTEM EM `sales.payment_method`.
 *
 * O app mobile gravava `debit_card`/`credit_card` enquanto este portal gravava
 * `debit`/`credit` na MESMA coluna. Os dois já foram unificados na origem
 * (`apps/mobile/src/store/preferencesStore.ts` reexporta a lista de
 * `domain/shared/dbEnums`), mas as linhas gravadas antes disso continuam lá.
 *
 * O ESTRAGO NÃO ERA COSMÉTICO: `paymentFromDb` caía em `"cash"` para o que não
 * reconhecia, então toda venda no cartão feita pelo celular virava venda em
 * DINHEIRO aqui — entrava no "esperado na gaveta" do fechamento e o caixa
 * fechava com falta todo dia, sem ninguém achar o motivo.
 *
 * A ESCRITA continua só em `PAYMENT_DB`, de propósito: passar a gravar a
 * segunda grafia espalharia o problema em vez de encerrá-lo. Estas linhas
 * saem daqui quando a migration de normalização tiver rodado em produção.
 */
const DB_TO_PORTAL: Record<string, PaymentMethod> = {
  ...(Object.fromEntries(
    Object.entries(PAYMENT_DB).map(([pt, db]) => [db, pt as PaymentMethod]),
  ) as Record<string, PaymentMethod>),
  debit_card: "debit",
  credit_card: "credit",
};

/** Forma desconhecida cai em Dinheiro — não vale perder a venda por um rótulo. */
export function paymentFromDb(v: string | null): PaymentMethod {
  return DB_TO_PORTAL[v ?? ""] ?? "cash";
}

/**
 * Venda estornada continua no histórico, riscada, fora do faturamento —
 * `sales.status`.
 */
export const SALE_STATUS = { normal: "completed", refunded: "refunded" } as const;
