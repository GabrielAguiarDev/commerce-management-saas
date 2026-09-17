import type { QueuedSale } from "@/lib/offline/salesQueue";

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

const DB_NAME = "aguiar-portal-offline";
const DB_VERSION = 1;
const STORE = "pending_sales";

let dbPromise: Promise<IDBDatabase> | null = null;

export function isQueueStorageAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

function open(): Promise<IDBDatabase> {
  if (!isQueueStorageAvailable()) {
    return Promise.reject(new Error("Este navegador não permite guardar dados offline."));
  }

  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "clientId" });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      // Outra aba abrindo uma versão nova: fecha esta conexão para não travá-la.
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    req.onerror = () => {
      dbPromise = null;
      reject(req.error ?? new Error("Não foi possível abrir o banco local."));
    };
  });

  return dbPromise;
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  const db = await open();
  return new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    let value: T | undefined;
    if (req) req.onsuccess = () => (value = req.result);
    // Resolve só no `complete`: antes dele a escrita ainda pode ser desfeita,
    // e dizer "venda guardada" nesse intervalo seria prometer o que não houve.
    tx.oncomplete = () => resolve(value);
    tx.onerror = () => reject(tx.error ?? new Error("Falha no banco local."));
    tx.onabort = () => reject(tx.error ?? new Error("Gravação local cancelada."));
  });
}

export async function putSale(sale: QueuedSale): Promise<void> {
  await withStore("readwrite", (s) => s.put(sale));
}

export async function deleteSale(clientId: string): Promise<void> {
  await withStore("readwrite", (s) => s.delete(clientId));
}

export async function getSale(clientId: string): Promise<QueuedSale | null> {
  return ((await withStore<QueuedSale>("readonly", (s) => s.get(clientId))) as QueuedSale | undefined) ?? null;
}

export async function listSales(): Promise<QueuedSale[]> {
  return ((await withStore<QueuedSale[]>("readonly", (s) => s.getAll())) as QueuedSale[] | undefined) ?? [];
}
