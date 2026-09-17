/**
 * AS REGRAS da fila offline de vendas do PDV — sem navegador, sem React.
 *
 * Este arquivo não importa nada em tempo de execução (só tipos), e é isso que
 * permite testá-lo com o `node --test` puro, sem framework: ver
 * `salesQueue.test.mjs` e o `README.md` desta pasta.
 *
 * O desenho é o mesmo da fila do app mobile (`apps/mobile/src/domain/sales`):
 * a venda recebe um uuid gerado AQUI, e é esse uuid que vai como `p_id` para a
 * `create_sale`. Reenviar a mesma venda bate na chave primária de `sales` e o
 * Postgres responde `23505` — que significa "essa venda já entrou", não erro.
 * É o que torna o reenvio seguro depois de uma resposta perdida.
 */

import type { PaymentMethod } from "@/types/types";

/** Um item como o carrinho do portal o monta — o mesmo `ItemToSave` da action. */
export interface QueuedSaleItem {
  productId: string | null;
  name: string;
  qtd: number;
  price: number;
}

/**
 * `pending`: será reenviada sozinha (sem rede, servidor fora do ar).
 * `failed`: o banco RECUSOU — reenviar igual daria o mesmo erro. Fica parada
 * até a pessoa decidir entre tentar de novo e descartar.
 *
 * Não existe `done`: a venda que entrou no banco SAI da fila. Guardá-la aqui
 * criaria uma segunda lista de vendas no computador, que envelheceria calada.
 */
export type QueuedSaleStatus = "pending" | "failed";

export interface QueuedSaleError {
  /** Código do Postgres/PostgREST, ou um dos nossos (`network`, `session`). */
  code: string | null;
  message: string;
}

export interface QueuedSale {
  /** O uuid que vira `sales.id`. Estável: nasce no clique e nunca muda. */
  clientId: string;
  /**
   * De quem é a venda. A fila só é enviada pela MESMA pessoa no MESMO
   * negócio: a `create_sale` grava o tenant e o `user_id` da sessão que
   * chama, e reenviar sob outro login atribuiria a venda à conta errada.
   */
  tenantId: string;
  userId: string;
  /** ISO 8601 do clique em "Registrar venda" — não da sincronização. */
  soldAt: string;
  payment: PaymentMethod;
  customerDocument: string;
  items: QueuedSaleItem[];
  status: QueuedSaleStatus;
  attempts: number;
  lastError: QueuedSaleError | null;
  /** ISO 8601 da última tentativa (ou da criação). */
  updatedAt: string;
}

export interface QueueScope {
  tenantId: string;
  userId: string;
}

/* -------------------------------------------------------------------------- */
/* Criação                                                                     */
/* -------------------------------------------------------------------------- */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * uuid v4. `crypto.randomUUID` só existe em contexto seguro (https ou
 * localhost); o recurso a `getRandomValues` cobre o resto sem perder a
 * aleatoriedade criptográfica — um id previsível colidiria com outra venda.
 */
export function newClientId(
  cryptoImpl: Pick<Crypto, "getRandomValues"> & { randomUUID?: () => string } = globalThis.crypto,
): string {
  if (typeof cryptoImpl.randomUUID === "function") return cryptoImpl.randomUUID();

  const b = cryptoImpl.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function createQueuedSale(input: {
  clientId: string;
  scope: QueueScope;
  items: readonly QueuedSaleItem[];
  payment: PaymentMethod;
  customerDocument: string;
  now: Date;
}): QueuedSale {
  const iso = input.now.toISOString();
  return {
    clientId: input.clientId,
    tenantId: input.scope.tenantId,
    userId: input.scope.userId,
    soldAt: iso,
    payment: input.payment,
    customerDocument: input.customerDocument,
    // Cópia: o carrinho continua sendo estado da tela e muda depois do clique.
    items: input.items.map((i) => ({ ...i })),
    status: "pending",
    attempts: 0,
    lastError: null,
    updatedAt: iso,
  };
}

/* -------------------------------------------------------------------------- */
/* Classificação do resultado                                                  */
/* -------------------------------------------------------------------------- */

/**
 * O que fazer depois de uma tentativa.
 *
 * - `done`: a venda está no banco (inclusive a duplicata `23505`) → sai da fila.
 * - `retry`: problema de caminho (rede, servidor, sessão) → continua pendente.
 * - `failed`: o banco recusou a venda → para de tentar sozinha.
 */
export type AttemptVerdict = "done" | "retry" | "failed";

/** Códigos nossos, para o que não vem do Postgres. */
export const NETWORK_CODE = "network";
export const SESSION_CODE = "session";

/**
 * Classes do Postgres que são sobre o CAMINHO e não sobre a venda:
 * `08` conexão, `53` recursos, `57` operador (timeout, shutdown), `40001`
 * serialização e `40P01` deadlock, `55P03` lock. `PGRST000`–`PGRST003` são o
 * PostgREST sem conseguir falar com o banco.
 */
function isTransientCode(code: string): boolean {
  return (
    /^(08|53|57)/.test(code) ||
    code === "40001" ||
    code === "40P01" ||
    code === "55P03" ||
    /^PGRST00[0-3]$/.test(code)
  );
}

/** Mensagens de falha de transporte que chegam sem código (fetch do Supabase). */
const NETWORK_MESSAGE_RE = /failed to fetch|fetch failed|network|timeout|timed out|econn|socket|load failed/i;

/**
 * ⚠️ NA DÚVIDA, `failed`. Um erro desconhecido tratado como passageiro faria a
 * venda ser reenviada para sempre, e cada reenvio é uma ida ao banco que ele
 * recusa do mesmo jeito. Parada, ela pelo menos aparece para alguém decidir.
 */
export function classifyAttempt(error: QueuedSaleError | null): AttemptVerdict {
  if (error === null) return "done";

  const code = error.code?.trim() || null;
  if (code === "23505") return "done";
  if (code === NETWORK_CODE || code === SESSION_CODE) return "retry";
  if (code !== null) return isTransientCode(code) ? "retry" : "failed";

  return NETWORK_MESSAGE_RE.test(error.message) ? "retry" : "failed";
}

/**
 * Espera antes da próxima tentativa AUTOMÁTICA: 5s, 10s, 20s… até 5 min.
 * Voltar a conexão, abrir o portal ou clicar em "enviar agora" ignoram a
 * espera — ela só existe para o servidor fora do ar não levar uma rajada.
 */
export function retryDelayMs(attempts: number): number {
  const n = Math.max(0, Math.min(attempts, 16));
  return Math.min(5_000 * 2 ** Math.max(0, n - 1), 5 * 60_000);
}

/** A venda, depois de uma tentativa. `null` = sai da fila. */
export function applyAttempt(
  sale: QueuedSale,
  error: QueuedSaleError | null,
  now: Date,
): QueuedSale | null {
  const verdict = classifyAttempt(error);
  if (verdict === "done") return null;

  return {
    ...sale,
    status: verdict === "failed" ? "failed" : "pending",
    attempts: sale.attempts + 1,
    lastError: error,
    updatedAt: now.toISOString(),
  };
}

/** "Tentar de novo" numa venda recusada: volta a ser pendente, do zero. */
export function resetForRetry(sale: QueuedSale, now: Date): QueuedSale {
  return { ...sale, status: "pending", attempts: 0, updatedAt: now.toISOString() };
}

/**
 * Quais vendas esta rodada deve enviar, na ORDEM em que foram feitas.
 *
 * Só as pendentes do escopo atual; com `force` (conexão voltou, portal
 * aberto, clique), ignora a espera entre tentativas.
 */
export function dueForSync(
  sales: readonly QueuedSale[],
  scope: QueueScope,
  now: Date,
  force: boolean,
): QueuedSale[] {
  return inScope(sales, scope)
    .filter((s) => s.status === "pending")
    .filter(
      (s) =>
        force ||
        s.attempts === 0 ||
        Date.parse(s.updatedAt) + retryDelayMs(s.attempts) <= now.getTime(),
    );
}

/** Quando vale acordar para a próxima tentativa automática (ms a partir de agora). */
export function nextWakeMs(sales: readonly QueuedSale[], scope: QueueScope, now: Date): number | null {
  let best: number | null = null;
  for (const s of inScope(sales, scope)) {
    if (s.status !== "pending") continue;
    const wait = Math.max(0, Date.parse(s.updatedAt) + retryDelayMs(s.attempts) - now.getTime());
    if (best === null || wait < best) best = wait;
  }
  return best;
}

/* -------------------------------------------------------------------------- */
/* Leitura para a tela                                                          */
/* -------------------------------------------------------------------------- */

export function inScope(sales: readonly QueuedSale[], scope: QueueScope): QueuedSale[] {
  if (!scope.tenantId || !scope.userId) return [];
  return sales
    .filter((s) => s.tenantId === scope.tenantId && s.userId === scope.userId)
    .sort((a, b) => a.soldAt.localeCompare(b.soldAt));
}

export function saleTotal(sale: Pick<QueuedSale, "items">): number {
  return sale.items.reduce((sum, i) => sum + i.qtd * i.price, 0);
}

export interface QueueSummary {
  pending: number;
  failed: number;
  totalValue: number;
}

export function summarize(sales: readonly QueuedSale[]): QueueSummary {
  let pending = 0;
  let failed = 0;
  let totalValue = 0;
  for (const s of sales) {
    if (s.status === "failed") failed += 1;
    else pending += 1;
    totalValue += saleTotal(s);
  }
  return { pending, failed, totalValue };
}

/**
 * Quanto de cada produto está em vendas que o banco ainda não viu — o que o
 * estoque exibido NÃO descontou. Por `productId`; item avulso não entra.
 */
export function queuedQtyByProduct(sales: readonly QueuedSale[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const s of sales) {
    for (const i of s.items) {
      if (!i.productId) continue;
      out.set(i.productId, (out.get(i.productId) ?? 0) + i.qtd);
    }
  }
  return out;
}

/** A frase que explica à pessoa por que a venda está parada. */
export function describeError(error: QueuedSaleError | null, status: QueuedSaleStatus): string {
  if (status === "pending") {
    if (!error) return "Será enviada automaticamente quando a conexão voltar.";
    if (error.code === SESSION_CODE) return "Sua sessão expirou. Entre novamente para enviar.";
    return "Sem conexão com o servidor. Será enviada automaticamente.";
  }

  const detail = error?.message ? ` (${error.message})` : "";
  switch (error?.code) {
    case "42501":
      return `Sem permissão para registrar vendas nesta conta${detail}.`;
    case "23503":
      return `Um produto desta venda não existe mais no cadastro${detail}.`;
    case "22023":
    case "22P02":
    case "23502":
    case "23514":
      return `O servidor recusou os dados da venda${detail}.`;
    default:
      return `O servidor recusou a venda${detail}.`;
  }
}
