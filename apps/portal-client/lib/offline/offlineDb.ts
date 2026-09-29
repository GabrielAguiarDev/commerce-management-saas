/** Shared IndexedDB connection for durable, account-scoped mutation queues. */
const DB_NAME = "aguiar-portal-offline";
const DB_VERSION = 2;

export const SALES_STORE = "pending_sales";
export const COSTS_STORE = "pending_costs";

let dbPromise: Promise<IDBDatabase> | null = null;

export function isOfflineStorageAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

function open(): Promise<IDBDatabase> {
  if (!isOfflineStorageAvailable()) {
    return Promise.reject(new Error("Este navegador não permite guardar dados offline."));
  }

  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      // Creating both stores makes a fresh install and a v1 sales-only upgrade
      // converge on the same schema without touching existing queued sales.
      if (!db.objectStoreNames.contains(SALES_STORE)) {
        db.createObjectStore(SALES_STORE, { keyPath: "clientId" });
      }
      if (!db.objectStoreNames.contains(COSTS_STORE)) {
        db.createObjectStore(COSTS_STORE, { keyPath: "clientId" });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
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

export async function withOfflineStore<T>(
  storeName: typeof SALES_STORE | typeof COSTS_STORE,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  const db = await open();
  return new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const req = fn(tx.objectStore(storeName));
    let value: T | undefined;
    if (req) req.onsuccess = () => (value = req.result);
    // A mutation is only announced after the transaction actually commits.
    tx.oncomplete = () => resolve(value);
    tx.onerror = () => reject(tx.error ?? new Error("Falha no banco local."));
    tx.onabort = () => reject(tx.error ?? new Error("Gravação local cancelada."));
  });
}
