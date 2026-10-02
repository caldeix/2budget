/**
 * @file lib/single-mode.ts
 * @description Reglas del modo individual (una sola persona). El modo es solo de interfaz:
 *              los datos y los cálculos no cambian, y con todo a nombre de `person1` las cifras
 *              de la Persona 2 dan 0 de forma natural.
 *
 *              Regla de visibilidad: en modo individual, la Persona 2 se oculta SOLO si no tiene
 *              cifras. Si hay datos antiguos de la etapa en pareja (gastos `person2` o `both`),
 *              se siguen mostrando para que ningún importe quede contado pero invisible.
 */

import type { MonthlyReport, Transaction } from "@/types"
import { isZeroMoney } from "@/lib/money" // Comparación con cero al céntimo.
import { parseLocalDate } from "@/lib/utils" // Parseo de fechas en local (no UTC).

/**
 * @function shouldShowPerson2
 * @description Decide si la interfaz debe mostrar la Persona 2.
 * @param {boolean | undefined} singleMode - Si el modo individual está activo.
 * @param {number[]} person2Amounts - Cifras de la Persona 2 en la vista concreta.
 * @returns {boolean} `true` en modo pareja, o en modo individual si alguna cifra no es cero.
 */
export function shouldShowPerson2(singleMode: boolean | undefined, ...person2Amounts: number[]): boolean {
  if (!singleMode) return true
  return person2Amounts.some((amount) => !isZeroMoney(amount))
}

/**
 * @function countPerson2OpenTransactions
 * @description Cuenta las transacciones que no son solo de la Persona 1 (`person2` o `both`)
 *              en meses que aún no tienen informe. Son las que, al activar el modo individual,
 *              seguirán sumando en los totales y se mostrarán con su etiqueta de dueño.
 * @param {Transaction[]} transactions - Todas las transacciones.
 * @param {MonthlyReport[]} reports - Todos los informes (meses cerrados).
 * @returns {number} Número de transacciones afectadas.
 */
export function countPerson2OpenTransactions(transactions: Transaction[], reports: MonthlyReport[]): number {
  const closedMonths = new Set(reports.map((r) => `${r.year}-${r.month}`))
  return transactions.filter((t) => {
    if (t.owner === "person1") return false
    const date = parseLocalDate(t.date)
    return !closedMonths.has(`${date.getFullYear()}-${date.getMonth() + 1}`)
  }).length
}
