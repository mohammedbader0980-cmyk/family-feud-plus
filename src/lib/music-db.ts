// IndexedDB persistence for uploaded music tracks (Blobs).
const DB_NAME = "harat-elbatal";
const DB_VERSION = 1;
const STORE = "tracks";

export type StoredTrack = { id: string; name: string; blob: Blob; createdAt: number };

const isBrowser = () => typeof window !== "undefined" && "indexedDB" in window;

const openDB = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (!isBrowser()) return reject(new Error("no-idb"));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const tx = async (mode: IDBTransactionMode) => {
  const db = await openDB();
  return db.transaction(STORE, mode).objectStore(STORE);
};

export const idbAddTrack = async (file: File): Promise<StoredTrack> => {
  const store = await tx("readwrite");
  const item: StoredTrack = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    blob: file,
    createdAt: Date.now(),
  };
  await new Promise<void>((resolve, reject) => {
    const r = store.add(item);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
  return item;
};

export const idbGetAllTracks = async (): Promise<StoredTrack[]> => {
  if (!isBrowser()) return [];
  try {
    const store = await tx("readonly");
    return await new Promise<StoredTrack[]>((resolve, reject) => {
      const r = store.getAll();
      r.onsuccess = () => {
        const list = (r.result as StoredTrack[]) || [];
        list.sort((a, b) => a.createdAt - b.createdAt);
        resolve(list);
      };
      r.onerror = () => reject(r.error);
    });
  } catch {
    return [];
  }
};

export const idbDeleteTrack = async (id: string): Promise<void> => {
  const store = await tx("readwrite");
  await new Promise<void>((resolve, reject) => {
    const r = store.delete(id);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
};

export const idbClearTracks = async (): Promise<void> => {
  const store = await tx("readwrite");
  await new Promise<void>((resolve, reject) => {
    const r = store.clear();
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
};
