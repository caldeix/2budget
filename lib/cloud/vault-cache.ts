/**
 * @file lib/cloud/vault-cache.ts
 * @description Guarda en el dispositivo (IndexedDB) la clave del hogar ya desbloqueada, para no
 *              pedir la contraseña maestra cada vez que se abre la app.
 *              Se guarda como `CryptoKey` NO extraíble: el navegador permite usarla para cifrar
 *              y descifrar, pero no leer sus bytes. Se borra al cerrar sesión o salir del hogar.
 */

const DB_NAME = "2budget-vault"
const STORE = "keys"

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = action(db.transaction(STORE, mode).objectStore(STORE))
      request.onsuccess = () => resolve(request.result as T)
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

const cacheKey = (uid: string, householdId: string) => `${uid}:${householdId}`

/** Clave guardada para este usuario y hogar, o `null` si hay que pedir la contraseña maestra. */
export async function loadCachedDek(uid: string, householdId: string): Promise<CryptoKey | null> {
  try {
    return (await run<CryptoKey | undefined>("readonly", (store) => store.get(cacheKey(uid, householdId)))) ?? null
  } catch (error) {
    console.error("Error reading vault cache:", error)
    return null
  }
}

/** Guarda la clave (no extraíble) del hogar en este dispositivo. */
export async function saveCachedDek(uid: string, householdId: string, dek: CryptoKey): Promise<void> {
  try {
    await run("readwrite", (store) => store.put(dek, cacheKey(uid, householdId)))
  } catch (error) {
    // Sin caché, la app sigue funcionando: solo pedirá la contraseña maestra en cada carga.
    console.error("Error saving vault cache:", error)
  }
}

/** Borra todas las claves guardadas en este dispositivo. */
export async function clearVaultCache(): Promise<void> {
  try {
    await run("readwrite", (store) => store.clear())
  } catch (error) {
    console.error("Error clearing vault cache:", error)
  }
}
