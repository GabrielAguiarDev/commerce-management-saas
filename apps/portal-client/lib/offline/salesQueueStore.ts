"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { recordSale as recordSaleAction, type SaleActionResult } from "@/app/vendas/actions";
import {
  applyAttempt,
  classifyAttempt,
  describeError,
  dueForSync,
  inScope,
  NETWORK_CODE,
  nextWakeMs,
  resetForRetry,
  summarize,
  type QueuedSale,
  type QueuedSaleError,
  type QueueScope,
  type QueueSummary,
} from "@/lib/offline/salesQueue";
import * as db from "@/lib/offline/salesQueueDb";

/**
 * A FILA OFFLINE DE VENDAS no navegador: guarda, envia e avisa a tela.
 *
 * ⚠️ SÓ VENDAS NOVAS DO PDV. Editar, estornar, caixa, estoque e o resto do
 * portal continuam exigindo internet — nenhum deles tem um id idempotente no
 * banco que torne o reenvio seguro.
 *
 * É um store fora do React (lido com `useSyncExternalStore`) porque quem grava
 * (o `recordSale` do provider) e quem mostra (PDV, tarja do shell) vivem em
 * lugares diferentes, e o `ViewProps` do provider não precisa crescer por isso.
 */

interface QueueState {
  /** Já leu o IndexedDB ao menos uma vez. */
  loaded: boolean;
  /** Todas as vendas guardadas neste navegador, de qualquer conta. */
  all: QueuedSale[];
  /** Uma rodada de envio em andamento nesta aba. */
  syncing: boolean;
}

const SERVER_STATE: QueueState = { loaded: false, all: [], syncing: false };

let state: QueueState = SERVER_STATE;
const listeners = new Set<() => void>();

function setState(patch: Partial<QueueState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/* -------------------------------------------------------------------------- */
/* Entre abas                                                                  */
/* -------------------------------------------------------------------------- */

const CHANNEL = "aguiar-sales-queue";
let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  channel ??= new BroadcastChannel(CHANNEL);
  return channel;
}

/** Relê o IndexedDB e avisa as outras abas que a fila mudou. */
async function reload(broadcast: boolean): Promise<void> {
  if (!db.isQueueStorageAvailable()) {
    setState({ loaded: true, all: [] });
    return;
  }
  try {
    setState({ loaded: true, all: await db.listSales() });
  } catch {
    setState({ loaded: true });
  }
  if (broadcast) getChannel()?.postMessage("changed");
}

/* -------------------------------------------------------------------------- */
/* Envio                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Sem resposta nesse tempo, a venda vai para a fila. O pedido original pode
 * ainda chegar ao banco — e aí o reenvio recebe `23505` e sai da fila como
 * "já registrada". É o `clientId` que torna seguro desistir de esperar.
 */
const SUBMIT_TIMEOUT_MS = 20_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

const NETWORK_ERROR: QueuedSaleError = {
  code: NETWORK_CODE,
  message: "Sem conexão com o servidor.",
};

/** Uma tentativa. Nunca lança: falha de transporte vira `NETWORK_ERROR`. */
async function attempt(sale: QueuedSale, timeoutMs?: number): Promise<QueuedSaleError | null> {
  let r: SaleActionResult;
  try {
    const call = recordSaleAction(
      sale.items,
      sale.payment,
      sale.customerDocument,
      sale.clientId,
      sale.soldAt,
    );
    r = timeoutMs ? await withTimeout(call, timeoutMs) : await call;
  } catch {
    return NETWORK_ERROR;
  }
  return r.ok ? null : { code: r.code, message: r.message };
}

function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export type SubmitOutcome =
  | { kind: "recorded" }
  | { kind: "queued"; reason: string }
  | { kind: "rejected"; message: string }
  | { kind: "lost"; message: string };

/**
 * FECHA UMA VENDA NOVA: manda agora, ou guarda para depois.
 *
 * Sem rede (`navigator.onLine`), nem tenta: o `fetch` de uma Server Action
 * sem internet pode levar dezenas de segundos para desistir, com o balcão
 * parado. Com rede, tenta — e só guarda se a falha for de CAMINHO. Se o banco
 * recusar (permissão, validação), a venda NÃO vai para a fila: a pessoa está
 * na frente da tela, e o carrinho continua montado para ela corrigir.
 */
export async function submitSale(sale: QueuedSale): Promise<SubmitOutcome> {
  let stored: QueuedSale = sale;

  if (!isOffline()) {
    const error = await attempt(sale, SUBMIT_TIMEOUT_MS);
    const verdict = classifyAttempt(error);
    if (verdict === "done") return { kind: "recorded" };
    if (verdict === "failed") {
      return { kind: "rejected", message: error?.message ?? "Não foi possível registrar a venda." };
    }
    stored = applyAttempt(sale, error, new Date()) ?? sale;
  }

  try {
    await db.putSale(stored);
  } catch {
    // O pior caso da feature: sem servidor E sem banco local. A venda não
    // existe em lugar nenhum, e a tela precisa dizer isso com o carrinho intacto.
    return {
      kind: "lost",
      message:
        "Sem conexão e não foi possível guardar a venda neste computador. A venda NÃO foi registrada.",
    };
  }

  await reload(true);
  return { kind: "queued", reason: describeError(stored.lastError, stored.status) };
}

export interface SyncReport {
  sent: number;
  failed: number;
}

let running: Promise<SyncReport> | null = null;

/**
 * ENVIA A FILA — uma venda por vez, da mais antiga para a mais nova.
 *
 * Uma por vez porque cada uma tem destino próprio (uma recusada não segura as
 * outras) e porque o que já subiu já saiu da fila, mesmo se a aba fechar no
 * meio. Falha de CAMINHO interrompe a rodada: se a rede caiu para uma, cairia
 * para todas.
 *
 * Entre abas, o Web Lock evita duas rodadas simultâneas. Sem ele (navegador
 * antigo), duas abas podem mandar a mesma venda — e a segunda recebe `23505`,
 * que é tratado como sucesso. O lock economiza requisições; quem impede a
 * duplicata é o banco.
 */
export function syncQueue(scope: QueueScope, force: boolean): Promise<SyncReport> {
  const empty: SyncReport = { sent: 0, failed: 0 };
  if (!scope.tenantId || !scope.userId || !db.isQueueStorageAvailable() || isOffline()) {
    return Promise.resolve(empty);
  }
  if (running) return running;

  const round = async (): Promise<SyncReport> => {
    const report: SyncReport = { sent: 0, failed: 0 };
    const all = await db.listSales();
    const due = dueForSync(all, scope, new Date(), force);

    for (const queued of due) {
      // Outra aba pode ter enviado ou descartado esta venda enquanto isso.
      const current = await db.getSale(queued.clientId);
      if (!current || current.status !== "pending") continue;

      const error = await attempt(current);
      const next = applyAttempt(current, error, new Date());

      if (next === null) {
        await db.deleteSale(current.clientId);
        report.sent += 1;
      } else {
        await db.putSale(next);
        if (next.status === "failed") report.failed += 1;
        else break;
      }
    }
    return report;
  };

  const locked = (): Promise<SyncReport> => {
    const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
    if (!locks) return round();
    // `request` resolve com o valor da promessa do callback; o tipo do DOM
    // aninha as duas promessas.
    return locks.request(CHANNEL, { ifAvailable: true }, (lock) =>
      lock ? round() : empty,
    ) as unknown as Promise<SyncReport>;
  };

  setState({ syncing: true });
  running = locked()
    .catch(() => empty)
    .finally(async () => {
      running = null;
      setState({ syncing: false });
      await reload(true);
    });
  return running;
}

/** "Descartar": a venda sai da fila sem ser registrada. */
export async function discardSale(clientId: string): Promise<void> {
  await db.deleteSale(clientId);
  await reload(true);
}

/** "Tentar de novo": volta a ser pendente e é enviada na hora. */
export async function retrySale(clientId: string, scope: QueueScope): Promise<SyncReport> {
  const sale = await db.getSale(clientId);
  if (sale) await db.putSale(resetForRetry(sale, new Date()));
  await reload(true);
  return syncQueue(scope, true);
}

/* -------------------------------------------------------------------------- */
/* React                                                                        */
/* -------------------------------------------------------------------------- */

export interface QueueView {
  loaded: boolean;
  syncing: boolean;
  sales: QueuedSale[];
  summary: QueueSummary;
}

/** As vendas guardadas da conta atual, da mais antiga para a mais nova. */
export function useQueuedSales(tenantId: string, userId: string): QueueView {
  const snap = useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
  return useMemo(() => {
    const sales = inScope(snap.all, { tenantId, userId });
    return { loaded: snap.loaded, syncing: snap.syncing, sales, summary: summarize(sales) };
  }, [snap, tenantId, userId]);
}

/**
 * Liga o envio automático: ao abrir o portal, ao voltar a conexão, ao voltar
 * para a aba e, com a fila parada por erro de caminho, em intervalos que
 * crescem (`retryDelayMs`). Montado UMA vez, no provider.
 */
export function useSalesQueueSync(
  tenantId: string,
  userId: string,
  onReport: (report: SyncReport) => void,
): void {
  const snap = useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);

  useEffect(() => {
    if (!tenantId || !userId) return;
    const scope = { tenantId, userId };
    const run = (force: boolean) => {
      void syncQueue(scope, force).then((r) => {
        if (r.sent || r.failed) onReport(r);
      });
    };

    void reload(false).then(() => run(true));

    const onOnline = () => run(true);
    const onVisible = () => {
      if (document.visibilityState === "visible") run(false);
    };
    const ch = getChannel();
    const onMessage = () => void reload(false);

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    ch?.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      ch?.removeEventListener("message", onMessage);
    };
    // `onReport` muda a cada render do provider; o efeito não deve reiniciar
    // (e reenviar a fila) por isso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, userId]);

  // O despertador da próxima tentativa automática, refeito a cada mudança.
  useEffect(() => {
    if (!tenantId || !userId || snap.syncing) return;
    const scope = { tenantId, userId };
    const wait = nextWakeMs(snap.all, scope, new Date());
    if (wait === null) return;
    const t = setTimeout(() => {
      void syncQueue(scope, false).then((r) => {
        if (r.sent || r.failed) onReport(r);
      });
    }, Math.max(wait, 1_000));
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap, tenantId, userId]);
}
