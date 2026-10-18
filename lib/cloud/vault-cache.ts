/**
 * @file lib/cloud/vault-cache.ts
 * @description Guarda en el dispositivo (IndexedDB) la clave del hogar ya desbloqueada, para no
 *              pedir la contraseña maestra cada vez que se abre la app.
 *              Se guarda como `CryptoKey` NO extraíble: el navegador permite usarla para cifrar
 *              y descifrar, pero no leer sus bytes. Se borra al cerrar sesión o salir del hogar.
 *              Dura 3 días (3.1.2): después se vuelve a pedir la contraseña maestra, para que un
 *              dispositivo olvidado o prestado no dé acceso indefinido a los datos.
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

/** Días que dura la clave guardada; después hay que volver a escribir la contraseña maestra. */
export const VAULT_CACHE_DAYS = 3
export const VAULT_CACHE_MS = VAULT_CACHE_DAYS * 24 * 60 * 60 * 1000

/** Lo que se guarda: la clave y cuándo se guardó. */
interface CachedEntry {
  dek: CryptoKey
  savedAt: number
}

/** Clave guardada y hasta cuándo vale. */
export interface CachedDek {
  dek: CryptoKey
  /** Fecha (ms) a partir de la cual hay que volver a pedir la contraseña maestra. */
  expiresAt: number
}

/** Clave guardada para este usuario y hogar, o `null` si hay que pedir la contraseña maestra. */
export async function loadCachedDek(uid: string, householdId: string): Promise<CachedDek | null> {
  const id = cacheKey(uid, householdId)
  try {
    const stored = await run<CachedEntry | CryptoKey | undefined>("readonly", (store) => store.get(id))
    if (!stored) return null
    // Guardada antes de la 3.1.2 (solo la clave): empieza a contar desde ahora.
    if (stored instanceof CryptoKey) {
      await saveCachedDek(uid, householdId, stored)
      return { dek: stored, expiresAt: Date.now() + VAULT_CACHE_MS }
    }
    const expiresAt = stored.savedAt + VAULT_CACHE_MS
    if (Date.now() >= expiresAt) {
      await forgetCachedDek(uid, householdId)
      return null
    }
    return { dek: stored.dek, expiresAt }
  } catch (error) {
    console.error("Error reading vault cache:", error)
    return null
  }
}

/** Guarda la clave (no extraíble) del hogar en este dispositivo; vale `VAULT_CACHE_DAYS` días. */
export async function saveCachedDek(uid: string, householdId: string, dek: CryptoKey): Promise<void> {
  try {
    const entry: CachedEntry = { dek, savedAt: Date.now() }
    await run("readwrite", (store) => store.put(entry, cacheKey(uid, householdId)))
  } catch (error) {
    // Sin caché, la app sigue funcionando: solo pedirá la contraseña maestra en cada carga.
    console.error("Error saving vault cache:", error)
  }
}

/** Borra la clave guardada de un usuario y hogar (ha caducado). */
export async function forgetCachedDek(uid: string, householdId: string): Promise<void> {
  try {
    await run("readwrite", (store) => store.delete(cacheKey(uid, householdId)))
  } catch (error) {
    console.error("Error deleting vault cache entry:", error)
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
