/**
 * @file lib/cloud/diff.ts
 * @description Calcula qué documentos cambian entre dos estados de la aplicación.
 *              Firestore guarda cada transacción e informe como un documento propio, así que
 *              en vez de reescribirlo todo en cada cambio solo se envía la diferencia.
 *
 *              La comparación es por contenido y sin depender del orden de las claves: un
 *              documento leído de Firestore puede traer las claves en otro orden que el mismo
 *              objeto creado en local, y eso no debe contar como cambio.
 */

import type { AppConfig, AppData, MonthlyReport, Transaction } from "@/types"

/**
 * @interface AppDataDiff
 * @description Cambios a aplicar en la nube para pasar de un estado a otro.
 */
export interface AppDataDiff {
  /** Transacciones nuevas. */
  transactionsToSet: Transaction[]
  /**
   * Transacciones que ya existían y cambian (3.1.1). Se escriben como `update`: si la pareja la ha
   * borrado mientras tanto (p. ej. sin conexión), la edición falla en vez de hacerla reaparecer.
   */
  transactionsToUpdate: Transaction[]
  transactionIdsToDelete: string[]
  reportsToSet: MonthlyReport[]
  reportIdsToDelete: string[]
  /** `true` si cambió la configuración o la versión del esquema (van en el documento del hogar). */
  householdChanged: boolean
}

/**
 * @function stableStringify
 * @description Serializa un valor con las claves de los objetos ordenadas y sin los
 *              `undefined` (Firestore los omite), para comparar por contenido.
 * @param {unknown} value - El valor a serializar.
 * @returns {string} La serialización estable.
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "undefined"
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`
}

/**
 * @function isSameContent
 * @description Compara dos valores por contenido. La referencia igual es el caso rápido:
 *              las actualizaciones inmutables conservan los objetos que no cambian.
 */
function isSameContent(a: unknown, b: unknown): boolean {
  return a === b || stableStringify(a) === stableStringify(b)
}

/**
 * @function diffById
 * @description Compara dos listas de documentos con `id` y devuelve los que hay que escribir y borrar.
 */
function diffById<T extends { id: string }>(
  prev: T[],
  next: T[],
): { toSet: T[]; toCreate: T[]; toUpdate: T[]; idsToDelete: string[] } {
  const prevById = new Map(prev.map((item) => [item.id, item]))
  const nextIds = new Set(next.map((item) => item.id))

  const toCreate: T[] = []
  const toUpdate: T[] = []
  for (const item of next) {
    const before = prevById.get(item.id)
    if (before === undefined) toCreate.push(item)
    else if (!isSameContent(before, item)) toUpdate.push(item)
  }
  const idsToDelete = prev.filter((item) => !nextIds.has(item.id)).map((item) => item.id)
  return { toSet: [...toCreate, ...toUpdate], toCreate, toUpdate, idsToDelete }
}

/**
 * @function diffAppData
 * @description Calcula los cambios entre el estado anterior y el siguiente.
 * @param {AppData} prev - Estado anterior (el que ya está en la nube).
 * @param {AppData} next - Estado nuevo.
 * @returns {AppDataDiff} Los documentos a escribir y borrar.
 */
export function diffAppData(prev: AppData, next: AppData): AppDataDiff {
  const transactions = diffById(prev.transactions, next.transactions)
  const reports = diffById(prev.reports, next.reports)
  return {
    transactionsToSet: transactions.toCreate,
    transactionsToUpdate: transactions.toUpdate,
    transactionIdsToDelete: transactions.idsToDelete,
    reportsToSet: reports.toSet,
    reportIdsToDelete: reports.idsToDelete,
    householdChanged: !isSameContent(prev.config, next.config) || prev.version !== next.version,
  }
}

/**
 * @function isEmptyDiff
 * @description Indica si no hay nada que escribir.
 */
export function isEmptyDiff(diff: AppDataDiff): boolean {
  return (
    !diff.householdChanged &&
    diff.transactionsToSet.length === 0 &&
    diff.transactionsToUpdate.length === 0 &&
    diff.transactionIdsToDelete.length === 0 &&
    diff.reportsToSet.length === 0 &&
    diff.reportIdsToDelete.length === 0
  )
}

/**
 * @function mergeConfigChanges
 * @description Aplica sobre la configuración del servidor solo lo que cambió este dispositivo
 *              (de `prev` a `next`), campo a campo (3.1.1). Así, si la pareja cambió otra cosa a la
 *              vez (p. ej. su privacidad mientras tú editabas categorías sin conexión), no se pisa.
 *              La privacidad va por persona: cada uno solo cambia la suya.
 * @param {AppConfig} server - La configuración que hay ahora en el servidor.
 * @param {AppConfig} prev - La de la que partía este cambio.
 * @param {AppConfig} next - La que quería guardar este dispositivo.
 * @returns {AppConfig} La configuración del servidor con los cambios de este dispositivo.
 */
export function mergeConfigChanges(server: AppConfig, prev: AppConfig, next: AppConfig): AppConfig {
  const merged: Record<string, unknown> = { ...server }
  const before: Record<string, unknown> = { ...prev }
  const after: Record<string, unknown> = { ...next }
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (key === "hideIndividualFromPartner") continue
    if (!isSameContent(before[key], after[key])) {
      if (after[key] === undefined) delete merged[key]
      else merged[key] = after[key]
    }
  }
  const privacy = { ...server.hideIndividualFromPartner }
  let privacyChanged = false
  for (const person of ["person1", "person2"] as const) {
    const before = prev.hideIndividualFromPartner?.[person]
    const after = next.hideIndividualFromPartner?.[person]
    if (before !== after) {
      privacy[person] = after
      privacyChanged = true
    }
  }
  if (privacyChanged) merged.hideIndividualFromPartner = privacy
  return merged as unknown as AppConfig
}
