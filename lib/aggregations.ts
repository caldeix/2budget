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
import { fromCents, normalizePercentage, toCents } from "@/lib/money"

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
 * @function exactShareOfPerson1
 * @description Parte EXACTA de la Persona 1 en una transacción, en centésimas de céntimo
 *              (céntimos × porcentaje), sin redondear. `owner: "both"` y cualquier valor
 *              inesperado se reparten por porcentaje (50/50 por defecto).
 * @param {number} cents - Importe de la transacción en céntimos.
 * @param {Transaction} t - La transacción.
 * @returns {number} Entero: la parte de la Persona 1 multiplicada por 100.
 */
function exactShareOfPerson1(cents: number, t: Transaction): number {
  if (t.owner === "person1") return cents * 100
  if (t.owner === "person2") return 0
  return cents * normalizePercentage(t.person1Percentage ?? 50)
}

/**
 * @function roundShare
 * @description Redondea al céntimo la suma exacta de la Persona 1 (en centésimas de céntimo).
 *              El medio céntimo exacto va a la Persona 1, como en los repartos 50/50 de siempre.
 *
 *              Se redondea UNA sola vez sobre la suma de todo el conjunto, no transacción a
 *              transacción ni por porcentaje: así las fracciones de céntimo (p. ej. 36,995 € de
 *              un 73,99 € al 50% o 333,5058 € de un 383,34 € al 87%) no se acumulan en un lado y
 *              el resultado nunca se aleja más de medio céntimo del reparto exacto.
 * @param {number} exact - Suma exacta de la Persona 1, en centésimas de céntimo.
 * @returns {number} La parte de la Persona 1 en céntimos.
 */
function roundShare(exact: number): number {
  const whole = Math.floor(exact / 100)
  return exact - whole * 100 >= 50 ? whole + 1 : whole
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
  let fixedExpenses = 0
  let variableExpenses = 0
  let nonComputableExpenses = 0
  // Parte exacta de la Persona 1 (centésimas de céntimo); se redondea al final (ver roundShare).
  let exactIncome1 = 0
  let exactExpenses1 = 0

  for (const t of transactions) {
    const cents = toCents(t.amount)

    if (t.type === "income") {
      totalIncome += cents
      exactIncome1 += exactShareOfPerson1(cents, t)
      continue
    }

    if (excludeNonComputableExpenses && t.nonComputable) continue

    totalExpenses += cents
    if (t.nonComputable) nonComputableExpenses += cents
    if (t.category === "fixed") fixedExpenses += cents
    else if (t.category === "variable") variableExpenses += cents
    exactExpenses1 += exactShareOfPerson1(cents, t)
  }

  // La Persona 2 se deriva del total: las dos partes suman exactamente el total, siempre.
  const p1Income = roundShare(exactIncome1)
  const p2Income = totalIncome - p1Income
  const p1Expenses = roundShare(exactExpenses1)
  const p2Expenses = totalExpenses - p1Expenses

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
