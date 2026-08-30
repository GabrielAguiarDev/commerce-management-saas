import type { Messages } from '@i18n';

/**
 * O NOME VISÍVEL de uma forma de pagamento, a partir da chave do banco.
 *
 * Existe porque `sales.payment_method` guarda uma CHAVE (`cash`, `pix`) e três
 * telas precisam mostrar um nome. Sem um lugar só, a tela de pendentes traduz,
 * o Início mostra "cash" cru — que era exatamente o estado das duas antes
 * deste arquivo.
 *
 * ⚠️ O CATÁLOGO TEM SEIS CHAVES PARA QUATRO FORMAS, e as duas sobrando são
 * históricas. O app gravava `debit_card`/`credit_card` enquanto o portal web
 * gravava `debit`/`credit` NA MESMA COLUNA; hoje os dois gravam a mesma coisa
 * (`preferencesStore` reexporta a lista de `domain/shared/dbEnums`), mas as
 * linhas escritas antes disso continuam no banco até a migration de
 * normalização rodar. Enquanto elas existirem, tirar `debit_card` daqui faz o
 * histórico mostrar o identificador cru no lugar do nome.
 *
 * A forma desconhecida cai no PRÓPRIO identificador, nunca em branco: uma
 * linha sem forma de pagamento parece um defeito da venda, e a chave crua pelo
 * menos diz ao suporte o que veio do banco.
 */
export function paymentLabel(t: Messages, method: string): string {
  return (t.paymentMethods as Record<string, string | undefined>)[method] ?? method;
}
