import { pluralizar } from '@utils/texto';

import type { DailySummaryAPI, SaleAPI, SaleCreateAPI, SaleItemAPI } from './salesApiTypes';
import type { ItemCarrinho, ResumoDoDia, Venda } from './salesTypes';

/**
 * Hora local em `HH:mm`.
 *
 * Fica no adapter porque converter fuso é tradução de contrato: o servidor
 * manda UTC, o balconista pensa em hora do balcão. Se isso vivesse na tela,
 * cada lista formataria de um jeito.
 */
function horaLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--:--';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function resumir(itens: SaleItemAPI[]): string {
  return itens.map((i) => `${i.qty}× ${i.product_name}`).join(' · ');
}

/**
 * `SaleAPI` → `Venda`.
 *
 * Renomeia, deriva `hora` e `resumoItens` (campos compostos que a lista usa
 * direto) e inverte a semântica de `is_synced` para `pendenteDeSincronia` —
 * porque a tela pergunta "está pendente?", não "está sincronizada?". Nulo é
 * tratado como sincronizada: o servidor antigo não mandava a coluna.
 */
export function toVenda(raw: SaleAPI): Venda {
  return {
    id: raw.id,
    hora: horaLocal(raw.created_at),
    itens: raw.items.map((i) => ({
      produtoId: i.product_id,
      nome: i.product_name,
      quantidade: i.qty,
      precoUnitarioCentavos: i.unit_price_cents,
    })),
    resumoItens: resumir(raw.items),
    formaPagamento: raw.payment_method,
    totalCentavos: raw.total_cents,
    pendenteDeSincronia: raw.is_synced === false,
  };
}

/**
 * `DailySummaryAPI` → `ResumoDoDia`.
 *
 * O ticket médio NÃO vem do servidor: é derivado aqui, porque é razão entre
 * dois campos que já vieram. Duplicar o cálculo no backend seria mais um lugar
 * para as duas contas discordarem. Divisão por zero vira zero, não `NaN`.
 */
export function toResumoDoDia(raw: DailySummaryAPI): ResumoDoDia {
  const total = raw.gross_cents ?? 0;
  const vendas = raw.sale_count ?? 0;

  return {
    totalCentavos: total,
    lucroCentavos: raw.profit_cents ?? 0,
    quantidadeDeVendas: vendas,
    itensVendidos: raw.item_count ?? 0,
    ticketMedioCentavos: vendas > 0 ? Math.round(total / vendas) : 0,
    maisVendido: raw.top_product_name
      ? {
          nome: raw.top_product_name,
          detalhe: `${pluralizar(raw.top_product_qty ?? 0, 'unidade', 'unidades')} hoje`,
        }
      : null,
  };
}

export function toSaleCreatePayload(
  tenantId: string,
  itens: readonly ItemCarrinho[],
  formaPagamento: string,
  online: boolean,
): SaleCreateAPI {
  return {
    tenant_id: tenantId,
    payment_method: formaPagamento,
    total_cents: itens.reduce((s, i) => s + i.precoUnitarioCentavos * i.quantidade, 0),
    items: itens.map((i) => ({
      product_id: i.produtoId,
      product_name: i.nome,
      qty: i.quantidade,
      unit_price_cents: i.precoUnitarioCentavos,
    })),
    is_synced: online,
  };
}
