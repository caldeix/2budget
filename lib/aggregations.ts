/**
 * @file lib/aggregations.ts
 * @description Núcleo único de agregación de transacciones. Antes había cuatro
 *              implementaciones duplicadas de la misma lógica (`useCalculations`,
 *              `calculateReportTotals`, `calculateCumulativeBalances` y un `reduce` inline
 *              en la tabla) que divergían entre sí. Todas pasan ahora por aquí.
 *
 *              Los acumuladores son CÉNTIMOS ENTEROS y solo se convierten a euros en el
 *              `return`. La suma de enteros no arrastra error de coma flotante, así que
 *              estos invariantes se cumplen por construcción:
 *
 *                toCents(person1Income)   + toCents(person2Income)   === toCents(totalIncome)
 *                toCents(person1Expenses) + toCents(person2Expenses) === toCents(totalExpenses)
 */

import type { Transaction } from "@/types"
import { fromCents, normalizePercentage, splitCentsByPercentage, toCents } from "@/lib/money"

/**
 * @interface TransactionTotals
 * @description Totales calculados a partir de un conjunto de transacciones, en euros.
 */
export interface TransactionTotals {
  totalIncome: number
  totalExpenses: number
  person1Income: number
  person2Income: number
  person1Expenses: number
  person2Expenses: number
  fixedExpenses: number
  variableExpenses: number
  nonComputableExpenses: number
}

/**
 * @interface AggregateOptions
 * @description Opciones de agregación. La única diferencia real entre los consumidores
 *              históricos era el tratamiento de los gastos no computables, y aquí queda
 *              expresada como un flag explícito en vez de como código duplicado.
 */
export interface AggregateOptions {
  /**
   * Si es `true`, los gastos marcados como `nonComputable` se excluyen POR COMPLETO
   * (de los totales, de las categorías y de los balances por persona). Es el
   * comportamiento histórico de `calculateCumulativeBalances`.
   *
   * Por defecto `false`: los no computables SÍ entran en los totales del mes y además se
   * contabilizan aparte en `nonComputableExpenses`, que es el comportamiento histórico de
   * `useCalculations` y `calculateReportTotals`.
   */
  excludeNonComputableExpenses?: boolean
}

/**
 * @function sharedPercentage
 * @description Devuelve el porcentaje de la Persona 1 si la transacción es compartida, o
 *              `null` si es de una sola persona. `owner: "both"` y cualquier valor inesperado
 *              se tratan como compartidos (50/50 por defecto).
 * @param {Transaction} t - La transacción.
 * @returns {number | null} Porcentaje normalizado (0-100) o `null`.
 */
function sharedPercentage(t: Transaction): number | null {
  if (t.owner === "person1" || t.owner === "person2") return null
  return normalizePercentage(t.person1Percentage ?? 50)
}

/**
 * @function splitSharedGroups
 * @description Reparte las sumas compartidas agrupadas por porcentaje.
 *
 *              Se reparte la SUMA de cada grupo, no cada transacción por separado: repartir
 *              una a una acumula el céntimo sobrante de cada importe impar siempre en el
 *              mismo lado (p. ej. dos gastos de 10,01 € al 50% daban 10,02 / 10,00), mientras
 *              que repartir la suma deja como mucho un céntimo de diferencia por grupo.
 * @param {Map<number, number>} groups - Porcentaje de la Persona 1 -> suma en céntimos.
 * @returns {[number, number]} Las partes de Persona 1 y Persona 2, en céntimos.
 */
function splitSharedGroups(groups: Map<number, number>): [number, number] {
  let c1 = 0
  let c2 = 0
  for (const [percentage, cents] of groups) {
    const [a, b] = splitCentsByPercentage(cents, percentage)
    c1 += a
    c2 += b
  }
  return [c1, c2]
}

function addToGroup(groups: Map<number, number>, percentage: number, cents: number): void {
  groups.set(percentage, (groups.get(percentage) ?? 0) + cents)
}

/**
 * @function aggregateTransactions
 * @description Calcula todos los totales de un conjunto de transacciones.
 * @param {Transaction[]} transactions - Las transacciones a agregar.
 * @param {AggregateOptions} [options] - Ver `AggregateOptions`.
 * @returns {TransactionTotals} Los totales en euros, ya redondeados a 2 decimales.
 */
export function aggregateTransactions(
  transactions: Transaction[],
  options: AggregateOptions = {},
): TransactionTotals {
  const { excludeNonComputableExpenses = false } = options

  // Acumuladores en CÉNTIMOS ENTEROS: cero error de coma flotante.
  let totalIncome = 0
  let totalExpenses = 0
  let p1Income = 0
  let p2Income = 0
  let p1Expenses = 0
  let p2Expenses = 0
  let fixedExpenses = 0
  let variableExpenses = 0
  let nonComputableExpenses = 0
  // Importes compartidos agrupados por porcentaje; se reparten al final (ver splitSharedGroups).
  const sharedIncome = new Map<number, number>()
  const sharedExpenses = new Map<number, number>()

  for (const t of transactions) {
    const cents = toCents(t.amount)

    if (t.type === "income") {
      totalIncome += cents
      const percentage = sharedPercentage(t)
      if (percentage !== null) addToGroup(sharedIncome, percentage, cents)
      else if (t.owner === "person1") p1Income += cents
      else p2Income += cents
      continue
    }

    if (excludeNonComputableExpenses && t.nonComputable) continue

    totalExpenses += cents
    if (t.nonComputable) nonComputableExpenses += cents
    if (t.category === "fixed") fixedExpenses += cents
    else if (t.category === "variable") variableExpenses += cents

    const percentage = sharedPercentage(t)
    if (percentage !== null) addToGroup(sharedExpenses, percentage, cents)
    else if (t.owner === "person1") p1Expenses += cents
    else p2Expenses += cents
  }

  const [sharedIncome1, sharedIncome2] = splitSharedGroups(sharedIncome)
  p1Income += sharedIncome1
  p2Income += sharedIncome2
  const [sharedExpenses1, sharedExpenses2] = splitSharedGroups(sharedExpenses)
  p1Expenses += sharedExpenses1
  p2Expenses += sharedExpenses2

  return {
    totalIncome: fromCents(totalIncome),
    totalExpenses: fromCents(totalExpenses),
    person1Income: fromCents(p1Income),
    person2Income: fromCents(p2Income),
    person1Expenses: fromCents(p1Expenses),
    person2Expenses: fromCents(p2Expenses),
    fixedExpenses: fromCents(fixedExpenses),
    variableExpenses: fromCents(variableExpenses),
    nonComputableExpenses: fromCents(nonComputableExpenses),
  }
}
