import type { Messages } from '@i18n';

/**
 * O NOME VISÍVEL de uma forma de pagamento, a partir da chave do banco.
 *
 * Existe porque `sales.payment_method` guarda uma CHAVE (`cash`, `pix`) e três
 * telas precisam mostrar um nome. Sem um lugar só, a tela de pendentes traduz,
 * o Início mostra "cash" cru — que era exatamente o estado das duas antes
 * deste arquivo.
 *
 * ⚠️ DUAS GRAFIAS CONVIVEM NA MESMA COLUNA, e por isso o catálogo tem seis
 * chaves para quatro formas: o app grava `debit_card`/`credit_card` (as chaves
 * de `preferencesStore.PAYMENT_METHODS`) e o portal web grava `debit`/`credit`
 * (`apps/portal-client/lib/dados/vendas.ts`). Um negócio que vende pelos dois
 * tem as duas grafias no histórico. Unificar é migração de dados, não é
 * mudança de rótulo — está anotado em DEVELOPMENT.md › Pendências.
 *
 * A forma desconhecida cai no PRÓPRIO identificador, nunca em branco: uma
 * linha sem forma de pagamento parece um defeito da venda, e a chave crua pelo
 * menos diz ao suporte o que veio do banco.
 */
export function paymentLabel(t: Messages, method: string): string {
  return (t.paymentMethods as Record<string, string | undefined>)[method] ?? method;
}
