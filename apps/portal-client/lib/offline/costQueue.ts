import type { CostType } from "@/types/types";
import type { QueueScope } from "@/lib/offline/salesQueue";

export type QueuedCostStatus = "pending" | "failed";

export interface QueuedCostError {
  code: string | null;
  message: string;
}

export interface QueuedCost {
  /** Stable database primary key generated before the first request. */
  clientId: string;
  tenantId: string;
  userId: string;
  createdAt: string;
  type: CostType;
  description: string;
  category: string;
  amount: number;
  /** YYYY-MM-DD. */
  costDate: string;
  status: QueuedCostStatus;
  attempts: number;
  lastError: QueuedCostError | null;
  updatedAt: string;
}

export const COST_NETWORK_CODE = "network";
export const COST_SESSION_CODE = "session";

export function createQueuedCost(input: {
  clientId: string;
  scope: QueueScope;
  type: CostType;
  description: string;
  category: string;
  amount: number;
  costDate: string;
  now: Date;
}): QueuedCost {
  const iso = input.now.toISOString();
  return {
    clientId: input.clientId,
    tenantId: input.scope.tenantId,
    userId: input.scope.userId,
    createdAt: iso,
    type: input.type,
    description: input.description.trim(),
    category: input.category.trim(),
    amount: input.amount,
    costDate: input.costDate,
    status: "pending",
    attempts: 0,
    lastError: null,
    updatedAt: iso,
  };
}

export type CostAttemptVerdict = "done" | "retry" | "failed";

function isTransientCode(code: string): boolean {
  return (
    /^(08|53|57)/.test(code) ||
    code === "40001" ||
    code === "40P01" ||
    code === "55P03" ||
    /^PGRST00[0-3]$/.test(code)
  );
}

const NETWORK_MESSAGE_RE = /failed to fetch|fetch failed|network|timeout|timed out|econn|socket|load failed/i;

/**
 * Unlike sales, 23505 is never implicit success here. The cost RPC returns
 * success for an exact replay, so 23505 specifically means a mismatched UUID
 * collision and must stop for human action.
 */
export function classifyCostAttempt(error: QueuedCostError | null): CostAttemptVerdict {
  if (error === null) return "done";
  const code = error.code?.trim() || null;
  if (code === COST_NETWORK_CODE || code === COST_SESSION_CODE) return "retry";
  if (code !== null) return isTransientCode(code) ? "retry" : "failed";
  return NETWORK_MESSAGE_RE.test(error.message) ? "retry" : "failed";
}

export function costRetryDelayMs(attempts: number): number {
  const n = Math.max(0, Math.min(attempts, 16));
  return Math.min(5_000 * 2 ** Math.max(0, n - 1), 5 * 60_000);
}

export function applyCostAttempt(
  cost: QueuedCost,
  error: QueuedCostError | null,
  now: Date,
): QueuedCost | null {
  const verdict = classifyCostAttempt(error);
  if (verdict === "done") return null;
  return {
    ...cost,
    status: verdict === "failed" ? "failed" : "pending",
    attempts: cost.attempts + 1,
    lastError: error,
    updatedAt: now.toISOString(),
  };
}

export function resetCostForRetry(cost: QueuedCost, now: Date): QueuedCost {
  return { ...cost, status: "pending", attempts: 0, updatedAt: now.toISOString() };
}

export function costsInScope(costs: readonly QueuedCost[], scope: QueueScope): QueuedCost[] {
  if (!scope.tenantId || !scope.userId) return [];
  return costs
    .filter((cost) => cost.tenantId === scope.tenantId && cost.userId === scope.userId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function costsDueForSync(
  costs: readonly QueuedCost[],
  scope: QueueScope,
  now: Date,
  force: boolean,
): QueuedCost[] {
  return costsInScope(costs, scope)
    .filter((cost) => cost.status === "pending")
    .filter(
      (cost) =>
        force ||
        cost.attempts === 0 ||
        Date.parse(cost.updatedAt) + costRetryDelayMs(cost.attempts) <= now.getTime(),
    );
}

export function nextCostWakeMs(
  costs: readonly QueuedCost[],
  scope: QueueScope,
  now: Date,
): number | null {
  let best: number | null = null;
  for (const cost of costsInScope(costs, scope)) {
    if (cost.status !== "pending") continue;
    const wait = Math.max(
      0,
      Date.parse(cost.updatedAt) + costRetryDelayMs(cost.attempts) - now.getTime(),
    );
    if (best === null || wait < best) best = wait;
  }
  return best;
}

export function describeCostQueueError(
  error: QueuedCostError | null,
  status: QueuedCostStatus,
): string {
  if (status === "pending") {
    if (!error) return "Aguardando conexão; ainda não entrou nos totais.";
    if (error.code === COST_SESSION_CODE) {
      return "Sua sessão expirou. Entre novamente para enviar; ainda não entrou nos totais.";
    }
    return "Sem conexão com o servidor; ainda não entrou nos totais.";
  }

  const detail = error?.message ? ` (${error.message})` : "";
  switch (error?.code) {
    case "42501":
      return `Sem permissão para lançar este custo${detail}.`;
    case "23505":
      return `O identificador local conflitou com outro lançamento${detail}.`;
    case "22023":
    case "22P02":
    case "23502":
    case "23514":
      return `O servidor recusou os dados deste custo${detail}.`;
    default:
      return `O servidor recusou este custo${detail}.`;
  }
}
