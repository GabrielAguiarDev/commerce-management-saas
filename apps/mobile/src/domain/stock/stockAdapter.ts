import type { StockMovementAPI, StockMovementCreateAPI } from './stockApiTypes';
import type { StockMovement } from './stockTypes';

/**
 * `reason` é um enum técnico no banco ('sale', 'purchase'...). A frase que o
 * dono lê é decisão de produto e mora aqui, na tradução — não na tela, senão
 * cada lista escreveria de um jeito.
 *
 * "entrada · virou custo variável" carrega uma regra do produto: repor estoque
 * gera custo automaticamente. Está no texto de propósito, para o dono entender
 * por que aquele custo apareceu sozinho na aba Custos.
 */
function descreverOrigem(reason: string, ator: string | null): string {
  switch (reason) {
    case 'sale':
      return 'saída automática por venda';
    case 'purchase':
      return 'entrada · virou custo variável';
    case 'loss':
      return ator ? `perda registrada por ${ator}` : 'perda registrada';
    default:
      return ator ? `ajuste manual de ${ator}` : 'ajuste manual';
  }
}

/** Traço tipográfico (U+2212) para saída, como no design — não hífen ASCII. */
export function formatSign(delta: number): string {
  return delta < 0 ? `−${Math.abs(delta)}` : `+${delta}`;
}

export function toStockMovement(raw: StockMovementAPI): StockMovement {
  return {
    id: raw.id,
    productName: raw.product_name,
    delta: raw.delta,
    sinal: formatSign(raw.delta),
    origem: descreverOrigem(raw.reason, raw.actor_name),
    quando: raw.happened_label,
  };
}

export function toStockMovementPayload(
  tenantId: string,
  productId: string | null,
  productName: string,
  delta: number,
): StockMovementCreateAPI {
  return {
    tenant_id: tenantId,
    product_id: productId,
    product_name: productName.trim(),
    delta,
    reason: delta > 0 ? 'purchase' : 'manual',
  };
}

/**
 * Lê a quantidade digitada no sheet "Movimentar estoque".
 *
 * O campo aceita "+10", "10" e "-3": o design pede explicitamente
 * "Quantidade (use − para saída)". Aceita tanto o hífen ASCII quanto o traço
 * U+2212 porque o teclado do iOS insere o segundo em alguns idiomas — e um
 * "−3" que virasse +3 tiraria o dono do controle do próprio estoque.
 */
export function parseMovementQuantity(text: string): number | null {
  const limpo = String(text ?? '')
    .trim()
    .replace(/−/g, '-');
  if (!/^[+-]?\d+$/.test(limpo)) return null;
  const n = Number(limpo);
  return n === 0 ? null : n;
}
