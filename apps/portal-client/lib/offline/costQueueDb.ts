import type { QueuedCost } from "@/lib/offline/costQueue";
import {
  COSTS_STORE,
  isOfflineStorageAvailable,
  withOfflineStore,
} from "@/lib/offline/offlineDb";

export function isCostQueueStorageAvailable(): boolean {
  return isOfflineStorageAvailable();
}

export async function putCost(cost: QueuedCost): Promise<void> {
  await withOfflineStore(COSTS_STORE, "readwrite", (store) => store.put(cost));
}

export async function deleteCost(clientId: string): Promise<void> {
  await withOfflineStore(COSTS_STORE, "readwrite", (store) => store.delete(clientId));
}

export async function getCost(clientId: string): Promise<QueuedCost | null> {
  return (
    ((await withOfflineStore<QueuedCost>(COSTS_STORE, "readonly", (store) =>
      store.get(clientId),
    )) as QueuedCost | undefined) ?? null
  );
}

export async function listCosts(): Promise<QueuedCost[]> {
  return (
    ((await withOfflineStore<QueuedCost[]>(COSTS_STORE, "readonly", (store) =>
      store.getAll(),
    )) as QueuedCost[] | undefined) ?? []
  );
}
