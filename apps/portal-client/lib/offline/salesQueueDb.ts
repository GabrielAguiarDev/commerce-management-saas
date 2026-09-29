import type { QueuedSale } from "@/lib/offline/salesQueue";
import {
  isOfflineStorageAvailable,
  SALES_STORE,
  withOfflineStore,
} from "@/lib/offline/offlineDb";

/**
 * FRONTEIRA DO BANCO LOCAL — o único arquivo que fala com o IndexedDB.
 *
 * Sem regra de negócio: grava, lê e apaga. Quem decide é `salesQueue.ts`.
 *
 * Um `objectStore` só, com a venda INTEIRA (itens dentro) num registro: o
 * IndexedDB grava um registro atomicamente, então não existe venda gravada
 * pela metade — o cabeçalho sem os itens subiria como uma venda de R$ 0,00.
 *
 * Guarda apenas o que é preciso para REENVIAR a venda (itens, forma de
 * pagamento, CPF opcional digitado). Nenhuma leitura do servidor vem para cá.
 */

export function isQueueStorageAvailable(): boolean {
  return isOfflineStorageAvailable();
}

export async function putSale(sale: QueuedSale): Promise<void> {
  await withOfflineStore(SALES_STORE, "readwrite", (s) => s.put(sale));
}

export async function deleteSale(clientId: string): Promise<void> {
  await withOfflineStore(SALES_STORE, "readwrite", (s) => s.delete(clientId));
}

export async function getSale(clientId: string): Promise<QueuedSale | null> {
  return ((await withOfflineStore<QueuedSale>(SALES_STORE, "readonly", (s) => s.get(clientId))) as QueuedSale | undefined) ?? null;
}

export async function listSales(): Promise<QueuedSale[]> {
  return ((await withOfflineStore<QueuedSale[]>(SALES_STORE, "readonly", (s) => s.getAll())) as QueuedSale[] | undefined) ?? [];
}
