/**
 * @file lib/shared-account.ts
 * @description Cuenta compartida (v3.0.0). La pareja envía cada mes una cantidad a una cuenta de los
 *              dos con APORTACIONES (`type: "contribution"`, un traspaso que no es ingreso ni gasto)
 *              y de ella sale y entra todo lo compartido (`owner: "both"`). Lo individual va por la
 *              cuenta de cada uno.
 *
 *              El balance total de cada persona no cambia (lo siguen calculando `useCalculations` y
 *              `calculateCumulativeBalances`): aquí solo se reparte entre DÓNDE está ese dinero.
 *              La parte de cada uno en la compartida se calcula y su cuenta personal se DERIVA POR
 *              RESTA, así que este invariante se cumple al céntimo por construcción:
 *
 *                cuenta(persona) + parte en la compartida(persona) = balance total(persona)
 *
 *              Un mes (o conjunto) solo usa la compartida si tiene alguna aportación, pagada o no.
 *              Sin aportaciones (todo el histórico de antes de la v3.0.0) la compartida no existe y
 *              las cifras son exactamente las de siempre.
 */

import type { MonthlyReport, Transaction } from "@/types"
import { aggregateTransactions, isClosingAdjustment, isContribution, type AggregateOptions } from "@/lib/aggregations"
import { fromCents, toCents } from "@/lib/money"

/**
 * @interface AccountSplit
 * @description Reparto del dinero entre cuentas (un mes, o el acumulado), en euros.
 */
export interface AccountSplit {
  /** Si el conjunto usa la cuenta compartida (alguna aportación). */
  usesShared: boolean
  /** Cuenta personal de la Persona 1: su balance total menos su parte en la compartida. */
  person1Account: number
  person2Account: number
  /** Dinero de la compartida: la suma de las dos partes. */
  shared: number
  /** Parte de la Persona 1 en la compartida: lo que aportó, más su parte de los ingresos compartidos, menos su parte de los gastos compartidos. */
  sharedPerson1: number
  sharedPerson2: number
  /** Lo que aportó cada uno. */
  contributed1: number
  contributed2: number
}

/** Partes en la compartida, en CÉNTIMOS. */
interface SharedCents {
  shared1: number
  shared2: number
  contributed1: number
  contributed2: number
}

/**
 * @function usesSharedAccount
 * @description Un conjunto de transacciones usa la cuenta compartida si tiene alguna aportación.
 */
export function usesSharedAccount(transactions: Transaction[]): boolean {
  return transactions.some(isContribution)
}

/**
 * @function sharedCents
 * @description Parte de cada persona en la compartida para un conjunto de transacciones.
 *              Los repartos de lo compartido salen de `aggregateTransactions` sobre las
 *              transacciones `owner: "both"`, con el mismo redondeo que el resto de la app.
 */
function sharedCents(transactions: Transaction[], options: AggregateOptions = {}): SharedCents {
  let contributed1 = 0
  let contributed2 = 0
  for (const t of transactions) {
    if (!isContribution(t)) continue
    if (t.owner === "person2") contributed2 += toCents(t.amount)
    else contributed1 += toCents(t.amount)
  }
  const both = aggregateTransactions(
    transactions.filter((t) => t.owner === "both"),
    options,
  )
  return {
    contributed1,
    contributed2,
    shared1: contributed1 + toCents(both.person1Income) - toCents(both.person1Expenses),
    shared2: contributed2 + toCents(both.person2Income) - toCents(both.person2Expenses),
  }
}

/**
 * @function toSplit
 * @description Monta el `AccountSplit` a partir de los balances totales (euros) y las partes en
 *              la compartida (céntimos): la cuenta personal es la resta.
 */
function toSplit(usesShared: boolean, balance1: number, balance2: number, cents: SharedCents): AccountSplit {
  return {
    usesShared,
    person1Account: fromCents(toCents(balance1) - cents.shared1),
    person2Account: fromCents(toCents(balance2) - cents.shared2),
    shared: fromCents(cents.shared1 + cents.shared2),
    sharedPerson1: fromCents(cents.shared1),
    sharedPerson2: fromCents(cents.shared2),
    contributed1: fromCents(cents.contributed1),
    contributed2: fromCents(cents.contributed2),
  }
}

const NO_SHARED: SharedCents = { shared1: 0, shared2: 0, contributed1: 0, contributed2: 0 }

/**
 * @function monthAccountSplit
 * @description Cuentas de UN mes. `person1Balance` y `person2Balance` son los balances totales que
 *              ya calcula `useCalculations` (no se recalculan aquí). Sin aportaciones, la compartida
 *              queda a 0 y cada cuenta es su balance total.
 * @param {Transaction[]} transactions - Las transacciones del mes (o solo las ya pagadas, para "Hoy").
 * @param {number} person1Balance - Balance total de la Persona 1 con esas transacciones.
 * @param {number} person2Balance - Balance total de la Persona 2.
 * @param {boolean} [usesShared] - Si el mes usa la compartida. Para "Hoy" se pasa el del mes entero:
 *        una aportación aún sin enviar ya hace que el mes la use.
 */
export function monthAccountSplit(
  transactions: Transaction[],
  person1Balance: number,
  person2Balance: number,
  usesShared: boolean = usesSharedAccount(transactions),
): AccountSplit {
  return toSplit(usesShared, person1Balance, person2Balance, usesShared ? sharedCents(transactions) : NO_SHARED)
}

/**
 * @function cumulativeSharedCents
 * @description Parte de cada persona en la compartida, acumulada mes a mes. Solo cuentan los meses
 *              con aportaciones. Como el acumulado excluye los gastos no computables, la parte de
 *              un no computable COMPARTIDO no sale de la compartida (es una hucha que se queda ahí),
 *              igual que la de uno individual vuelve a la cuenta de su dueño.
 * @param {Iterable<Transaction[]>} byMonth - Las transacciones de cada mes, un grupo por mes.
 */
export function cumulativeSharedCents(byMonth: Iterable<Transaction[]>): SharedCents & { usesShared: boolean } {
  const total = { ...NO_SHARED, usesShared: false }
  for (const monthTransactions of byMonth) {
    if (!usesSharedAccount(monthTransactions)) continue
    const month = sharedCents(monthTransactions, { excludeNonComputableExpenses: true })
    total.usesShared = true
    total.shared1 += month.shared1
    total.shared2 += month.shared2
    total.contributed1 += month.contributed1
    total.contributed2 += month.contributed2
  }
  return total
}

/**
 * @function cumulativeAccountSplit
 * @description Cuentas acumuladas: reparte los balances totales acumulados (los de
 *              `calculateCumulativeBalances`) entre la cuenta de cada uno y la compartida.
 */
export function cumulativeAccountSplit(
  byMonth: Iterable<Transaction[]>,
  person1TotalBalance: number,
  person2TotalBalance: number,
): AccountSplit {
  const { usesShared, ...cents } = cumulativeSharedCents(byMonth)
  return toSplit(usesShared, person1TotalBalance, person2TotalBalance, cents)
}

/**
 * @function sharedBalanceUntil
 * @description Saldo calculado de la compartida al final de un mes: lo acumulado en ella hasta ese
 *              mes, incluido, SIN los ajustes de cierre de ese mes (el cierre los sustituye; los de
 *              meses anteriores sí cuentan). Es con lo que se compara el saldo real que se pide al
 *              cerrar el mes.
 * @param {Transaction[]} transactions - Todas las transacciones.
 * @param {number} month - Mes que se cierra (1-12).
 * @param {number} year - Año.
 * @returns {{ shared: number; sharedPerson1: number; sharedPerson2: number }} En euros.
 */
export function sharedBalanceUntil(
  transactions: Transaction[],
  month: number,
  year: number,
): { shared: number; sharedPerson1: number; sharedPerson2: number } {
  const key = `${year}-${String(month).padStart(2, "0")}`
  const byMonth = new Map<string, Transaction[]>()
  for (const t of transactions) {
    const monthKey = t.date.slice(0, 7)
    if (monthKey > key) continue
    if (monthKey === key && isClosingAdjustment(t)) continue
    const list = byMonth.get(monthKey)
    if (list) list.push(t)
    else byMonth.set(monthKey, [t])
  }
  const { shared1, shared2 } = cumulativeSharedCents(byMonth.values())
  return { shared: fromCents(shared1 + shared2), sharedPerson1: fromCents(shared1), sharedPerson2: fromCents(shared2) }
}

/**
 * @function laterSharedClosings
 * @description Cierres posteriores a un mes que comparan el saldo de la compartida (3.1.0). Ese saldo
 *              arrastra los ajustes de los cierres anteriores, así que si se actualiza el cierre de un
 *              mes, el ajuste de la compartida de estos cierres deja de cuadrar y hay que
 *              actualizarlos también, en orden. Las cuentas personales se cierran mes a mes y no
 *              se ven afectadas.
 * @param {MonthlyReport[]} reports - Todos los informes.
 * @param {number} month - Mes que se actualiza (1-12).
 * @param {number} year - Año.
 * @returns {MonthlyReport[]} Los cierres posteriores con compartida, del más antiguo al más reciente.
 */
export function laterSharedClosings(reports: MonthlyReport[], month: number, year: number): MonthlyReport[] {
  const index = year * 12 + month
  return reports
    .filter((r) => r.year * 12 + r.month > index && r.sharedRealMoney !== undefined)
    .sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month))
}
