"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import {
  createOfflineCost as createOfflineCostAction,
  type OfflineCostActionResult,
} from "@/app/custos/actions";
import {
  applyCostAttempt,
  classifyCostAttempt,
  COST_NETWORK_CODE,
  costsDueForSync,
  costsInScope,
  describeCostQueueError,
  nextCostWakeMs,
  resetCostForRetry,
  type QueuedCost,
  type QueuedCostError,
} from "@/lib/offline/costQueue";
import type { QueueScope } from "@/lib/offline/salesQueue";
import * as db from "@/lib/offline/costQueueDb";

interface CostQueueState {
  loaded: boolean;
  all: QueuedCost[];
  syncing: boolean;
}

const SERVER_STATE: CostQueueState = { loaded: false, all: [], syncing: false };
let state: CostQueueState = SERVER_STATE;
const listeners = new Set<() => void>();

function setState(patch: Partial<CostQueueState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const CHANNEL = "aguiar-cost-queue";
let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  channel ??= new BroadcastChannel(CHANNEL);
  return channel;
}

async function reload(broadcast: boolean): Promise<void> {
  if (!db.isCostQueueStorageAvailable()) {
    setState({ loaded: true, all: [] });
    return;
  }
  try {
    setState({ loaded: true, all: await db.listCosts() });
  } catch {
    setState({ loaded: true });
  }
  if (broadcast) getChannel()?.postMessage("changed");
}

const SUBMIT_TIMEOUT_MS = 20_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

const NETWORK_ERROR: QueuedCostError = {
  code: COST_NETWORK_CODE,
  message: "Sem conexão com o servidor.",
};

async function attempt(cost: QueuedCost, timeoutMs?: number): Promise<QueuedCostError | null> {
  let result: OfflineCostActionResult;
  try {
    const call = createOfflineCostAction({
      clientId: cost.clientId,
      type: cost.type,
      description: cost.description,
      category: cost.category,
      amount: cost.amount,
      data: cost.costDate,
    });
    result = timeoutMs ? await withTimeout(call, timeoutMs) : await call;
  } catch {
    return NETWORK_ERROR;
  }
  return result.ok ? null : { code: result.code, message: result.message };
}

function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export type CostSubmitOutcome =
  | { kind: "recorded" }
  | { kind: "queued"; reason: string }
  | { kind: "rejected"; message: string }
  | { kind: "lost"; message: string };

/** Attempts now, or durably stores only a transient/offline failure. */
export async function submitCost(cost: QueuedCost): Promise<CostSubmitOutcome> {
  let stored = cost;
  if (!isOffline()) {
    const error = await attempt(cost, SUBMIT_TIMEOUT_MS);
    const verdict = classifyCostAttempt(error);
    if (verdict === "done") return { kind: "recorded" };
    if (verdict === "failed") {
      return { kind: "rejected", message: error?.message ?? "Não foi possível lançar o custo." };
    }
    stored = applyCostAttempt(cost, error, new Date()) ?? cost;
  }

  try {
    await db.putCost(stored);
  } catch {
    return {
      kind: "lost",
      message:
        "Sem conexão e não foi possível guardar o custo neste computador. O custo NÃO foi lançado.",
    };
  }
  await reload(true);
  return { kind: "queued", reason: describeCostQueueError(stored.lastError, stored.status) };
}

export interface CostSyncReport {
  sent: number;
  failed: number;
}

let running: Promise<CostSyncReport> | null = null;

export function syncCostQueue(scope: QueueScope, force: boolean): Promise<CostSyncReport> {
  const empty: CostSyncReport = { sent: 0, failed: 0 };
  if (!scope.tenantId || !scope.userId || !db.isCostQueueStorageAvailable() || isOffline()) {
    return Promise.resolve(empty);
  }
  if (running) return running;

  const round = async (): Promise<CostSyncReport> => {
    const report: CostSyncReport = { sent: 0, failed: 0 };
    const due = costsDueForSync(await db.listCosts(), scope, new Date(), force);
    for (const queued of due) {
      const current = await db.getCost(queued.clientId);
      if (!current || current.status !== "pending") continue;
      const next = applyCostAttempt(current, await attempt(current), new Date());
      if (next === null) {
        await db.deleteCost(current.clientId);
        report.sent += 1;
      } else {
        await db.putCost(next);
        if (next.status === "failed") report.failed += 1;
        else break;
      }
    }
    return report;
  };

  const locked = (): Promise<CostSyncReport> => {
    const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
    if (!locks) return round();
    return locks.request(CHANNEL, { ifAvailable: true }, (lock) =>
      lock ? round() : empty,
    ) as unknown as Promise<CostSyncReport>;
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

export async function discardQueuedCost(clientId: string): Promise<void> {
  await db.deleteCost(clientId);
  await reload(true);
}

export async function retryQueuedCost(
  clientId: string,
  scope: QueueScope,
): Promise<CostSyncReport> {
  const cost = await db.getCost(clientId);
  if (cost) await db.putCost(resetCostForRetry(cost, new Date()));
  await reload(true);
  return syncCostQueue(scope, true);
}

export interface CostQueueView {
  loaded: boolean;
  syncing: boolean;
  costs: QueuedCost[];
}

export function useQueuedCosts(tenantId: string, userId: string): CostQueueView {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
  return useMemo(
    () => ({
      loaded: snapshot.loaded,
      syncing: snapshot.syncing,
      costs: costsInScope(snapshot.all, { tenantId, userId }),
    }),
    [snapshot, tenantId, userId],
  );
}

export function useCostQueueSync(
  tenantId: string,
  userId: string,
  onReport: (report: CostSyncReport) => void,
): void {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);

  useEffect(() => {
    if (!tenantId || !userId) return;
    const scope = { tenantId, userId };
    const run = (force: boolean) => {
      void syncCostQueue(scope, force).then((report) => {
        if (report.sent || report.failed) onReport(report);
      });
    };
    void reload(false).then(() => run(true));

    const onOnline = () => run(true);
    const onVisible = () => {
      if (document.visibilityState === "visible") run(false);
    };
    const currentChannel = getChannel();
    const onMessage = () => void reload(false);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    currentChannel?.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      currentChannel?.removeEventListener("message", onMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, userId]);

  useEffect(() => {
    if (!tenantId || !userId || snapshot.syncing) return;
    const scope = { tenantId, userId };
    const wait = nextCostWakeMs(snapshot.all, scope, new Date());
    if (wait === null) return;
    const timer = setTimeout(() => {
      void syncCostQueue(scope, false).then((report) => {
        if (report.sent || report.failed) onReport(report);
      });
    }, Math.max(wait, 1_000));
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot, tenantId, userId]);
}
