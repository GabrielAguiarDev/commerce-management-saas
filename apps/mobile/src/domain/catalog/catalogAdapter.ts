import type { ProductAPI, ProductCreateAPI } from './catalogApiTypes';
import type { NovoProduto, Produto, SituacaoEstoque } from './catalogTypes';

/**
 * Regra de saúde do estoque, isolada porque três telas dependem dela:
 * o badge em Produtos, a barra colorida em Estoque e os contadores do topo.
 *
 * Zerado tem precedência sobre baixo. `minimo` 0 significa "não me avise":
 * com mínimo 0 e quantidade 1, a situação é em dia, não baixo.
 */
export function situacaoDoEstoque(quantidade: number, minimo: number): SituacaoEstoque {
  if (quantidade <= 0) return 'zerado';
  if (minimo > 0 && quantidade <= minimo) return 'baixo';
  return 'em_dia';
}

/**
 * `ProductAPI` → `Produto`.
 *
 * O que acontece aqui, e em nenhum outro lugar:
 *  - renomeia (`sku` → `codigo`, `is_service` → `ehServico`);
 *  - defende contra nulo (`price_cents: null` → 0; `is_favorite: null` → true,
 *    porque no protótipo o produto nasce favorito e some da grade só depois de
 *    ser desfavoritado à mão);
 *  - achata `stock_qty`/`stock_min` num objeto `estoque` e deriva a situação;
 *  - descarta `tenant_id`, `created_at` e `updated_at`, que a UI não usa.
 *
 * `stock_qty: null` e `stock_qty: 0` são coisas DIFERENTES: nulo é "não
 * controla estoque" (some o badge), zero é "acabou" (badge vermelho).
 */
export function toProduto(raw: ProductAPI): Produto {
  const ehServico = raw.is_service === true;
  const controlaEstoque = !ehServico && raw.stock_qty !== null && raw.stock_qty !== undefined;
  const quantidade = raw.stock_qty ?? 0;
  const minimo = raw.stock_min ?? 0;

  return {
    id: raw.id,
    nome: raw.name,
    codigo: raw.sku,
    precoCentavos: raw.price_cents ?? 0,
    custoCentavos: raw.cost_cents,
    ehServico,
    favorito: raw.is_favorite ?? true,
    estoque: controlaEstoque
      ? { quantidade, minimo, situacao: situacaoDoEstoque(quantidade, minimo) }
      : null,
    categoria: raw.category,
  };
}

/** Domínio → payload de escrita. O caminho de volta do adapter. */
export function toProductCreatePayload(tenantId: string, novo: NovoProduto): ProductCreateAPI {
  return {
    tenant_id: tenantId,
    name: novo.nome.trim(),
    price_cents: novo.precoCentavos,
    cost_cents: novo.custoCentavos,
    stock_qty: novo.estoqueInicial,
    stock_min: novo.estoqueMinimo,
    is_service: false,
  };
}
