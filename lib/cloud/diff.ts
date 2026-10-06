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

import type { AppData, MonthlyReport, Transaction } from "@/types"

/**
 * @interface AppDataDiff
 * @description Cambios a aplicar en la nube para pasar de un estado a otro.
 */
export interface AppDataDiff {
  transactionsToSet: Transaction[]
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
function diffById<T extends { id: string }>(prev: T[], next: T[]): { toSet: T[]; idsToDelete: string[] } {
  const prevById = new Map(prev.map((item) => [item.id, item]))
  const nextIds = new Set(next.map((item) => item.id))

  const toSet = next.filter((item) => {
    const before = prevById.get(item.id)
    return before === undefined || !isSameContent(before, item)
  })
  const idsToDelete = prev.filter((item) => !nextIds.has(item.id)).map((item) => item.id)
  return { toSet, idsToDelete }
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
    transactionsToSet: transactions.toSet,
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
    diff.transactionIdsToDelete.length === 0 &&
    diff.reportsToSet.length === 0 &&
    diff.reportIdsToDelete.length === 0
  )
}
