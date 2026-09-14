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
import { fromCents, splitCentsByPercentage, toCents } from "@/lib/money"

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
 * @function shareCents
 * @description Reparte una transacción entre las dos personas, en céntimos.
 *              Para `owner: "both"` usa el reparto por porcentaje, que garantiza que las
 *              dos partes sumen exactamente el importe.
 * @param {number} cents - Importe de la transacción en céntimos.
 * @param {Transaction} t - La transacción.
 * @returns {[number, number]} Las partes de Persona 1 y Persona 2, en céntimos.
 */
function shareCents(cents: number, t: Transaction): [number, number] {
  if (t.owner === "person1") return [cents, 0]
  if (t.owner === "person2") return [0, cents]
  // "both" y cualquier valor inesperado: reparto por porcentaje (50/50 por defecto).
  return splitCentsByPercentage(cents, t.person1Percentage ?? 50)
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

  for (const t of transactions) {
    const cents = toCents(t.amount)

    if (t.type === "income") {
      totalIncome += cents
      const [c1, c2] = shareCents(cents, t)
      p1Income += c1
      p2Income += c2
      continue
    }

    if (excludeNonComputableExpenses && t.nonComputable) continue

    totalExpenses += cents
    if (t.nonComputable) nonComputableExpenses += cents
    if (t.category === "fixed") fixedExpenses += cents
    else if (t.category === "variable") variableExpenses += cents

    const [c1, c2] = shareCents(cents, t)
    p1Expenses += c1
    p2Expenses += c2
  }

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
