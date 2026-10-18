/**
 * @file lib/evolution.ts
 * @description Series mensuales para el gráfico de evolución: ingresos, gastos y ahorro de cada
 *              mes, calculados igual que las tarjetas del resumen (con los gastos no computables).
 *              Se calcula sobre las transacciones (los meses archivados ya vienen unidos), así que
 *              incluye también los meses abiertos y el mes en curso.
 *
 *              Vistas (3.4.0): todo el hogar (modo individual) o, en pareja, la cuenta de una persona o
 *              la compartida. El ahorro de cada mes coincide con la cifra Previsto del Balance
 *              individual: la cuenta de la persona o la fila Compartida (`monthAccountSplit`).
 */

import type { Transaction } from "@/types"
import { aggregateTransactions, isContribution } from "@/lib/aggregations"
import { addMoney, subtractMoney } from "@/lib/money"
import { monthAccountSplit, usesSharedAccount } from "@/lib/shared-account"

/** De quién es la serie: todo el hogar, la cuenta de una persona o la compartida. */
export type EvolutionView = "household" | "person1" | "person2" | "shared"

/** Un mes de la serie. `savings` = ingresos − gastos. */
export interface MonthPoint {
  /** `YYYY-MM` */
  key: string
  month: number
  year: number
  income: number
  expenses: number
  savings: number
}

const keyOf = (month: number, year: number) => `${year}-${String(month).padStart(2, "0")}`

const emptyPoint = (month: number, year: number): MonthPoint => ({
  key: keyOf(month, year),
  month,
  year,
  income: 0,
  expenses: 0,
  savings: 0,
})

/**
 * @function evolutionViewsFor
 * @description Vistas que ve quien mira (D-17): en modo individual, todo; en pareja con cuenta, la
 *              suya y la compartida (si se usa); en este navegador sin cuenta (sin saber quién mira),
 *              las de los dos y la compartida.
 */
export function evolutionViewsFor(options: {
  viewer: "person1" | "person2" | null
  singleMode: boolean
  usesShared: boolean
  person1Name: string
  person2Name: string
}): { value: EvolutionView; label: string }[] {
  const { viewer, singleMode, usesShared, person1Name, person2Name } = options
  if (singleMode) return [{ value: "household", label: "Todo" }]
  const shared = usesShared ? [{ value: "shared" as const, label: "Compartida" }] : []
  if (viewer) return [{ value: viewer, label: "Mi cuenta" }, ...shared]
  return [{ value: "person1", label: person1Name }, { value: "person2", label: person2Name }, ...shared]
}

/**
 * @function monthlyEvolution
 * @description Un punto por cada mes con transacciones, del más antiguo al más reciente.
 * @param {Transaction[]} transactions - Todas las transacciones.
 * @param {EvolutionView} [view="household"] - De quién es la serie (ver `pointFor`).
 */
export function monthlyEvolution(transactions: Transaction[], view: EvolutionView = "household"): MonthPoint[] {
  const byMonth = new Map<string, Transaction[]>()
  for (const t of transactions) {
    const key = t.date.slice(0, 7)
    const list = byMonth.get(key)
    if (list) list.push(t)
    else byMonth.set(key, [t])
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, list]) => ({
      key,
      year: Number(key.slice(0, 4)),
      month: Number(key.slice(5, 7)),
      ...pointFor(list, view),
    }))
}

/**
 * @function pointFor
 * @description Ingresos, gastos y ahorro de un mes en una vista (D-15 del plan):
 *              - Hogar: todo, como las tarjetas del resumen.
 *              - Cuenta de una persona: ingresos, los suyos (y su parte de los compartidos si ese mes
 *                no hay compartida); ahorro, la cifra de su cuenta del mes; gastos, la diferencia (sus
 *                gastos individuales, las aportaciones que envía y, sin compartida, su parte de lo
 *                compartido).
 *              - Compartida: ingresos, las aportaciones y los ingresos compartidos; ahorro, lo que queda
 *                en la compartida ese mes; gastos, la diferencia. Sin aportaciones, el mes va a 0.
 *              El ahorro sale de `monthAccountSplit` y los gastos por resta, así que cuadra al céntimo.
 */
function pointFor(list: Transaction[], view: EvolutionView): { income: number; expenses: number; savings: number } {
  const totals = aggregateTransactions(list)
  if (view === "household") {
    return {
      income: totals.totalIncome,
      expenses: totals.totalExpenses,
      savings: subtractMoney(totals.totalIncome, totals.totalExpenses),
    }
  }
  const usesShared = usesSharedAccount(list)
  const split = monthAccountSplit(
    list,
    subtractMoney(totals.person1Income, totals.person1Expenses),
    subtractMoney(totals.person2Income, totals.person2Expenses),
    usesShared,
  )
  const both = aggregateTransactions(list.filter((t) => t.owner === "both"))

  if (view === "shared") {
    if (!usesShared) return { income: 0, expenses: 0, savings: 0 }
    const contributions = addMoney(...list.filter(isContribution).map((t) => t.amount))
    const income = addMoney(contributions, both.totalIncome)
    return { income, expenses: subtractMoney(income, split.shared), savings: split.shared }
  }

  const own = aggregateTransactions(list.filter((t) => t.owner === view))
  const ownIncome = view === "person1" ? own.person1Income : own.person2Income
  const bothIncome = view === "person1" ? both.person1Income : both.person2Income
  const income = usesShared ? ownIncome : addMoney(ownIncome, bothIncome)
  const savings = view === "person1" ? split.person1Account : split.person2Account
  return { income, expenses: subtractMoney(income, savings), savings }
}

/**
 * @function lastMonths
 * @description Los `count` meses que terminan en el mes de `now`, rellenando con ceros los que no
 *              tienen transacciones (para la tarjeta del lateral).
 */
export function lastMonths(points: MonthPoint[], now: Date, count: number): MonthPoint[] {
  const byKey = new Map(points.map((p) => [p.key, p]))
  const out: MonthPoint[] = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const month = d.getMonth() + 1
    const year = d.getFullYear()
    out.push(byKey.get(keyOf(month, year)) ?? emptyPoint(month, year))
  }
  return out
}

/**
 * @function yearPoints
 * @description Los doce meses de un año, con ceros donde no hay transacciones (para el modal).
 */
export function yearPoints(points: MonthPoint[], year: number): MonthPoint[] {
  const byKey = new Map(points.map((p) => [p.key, p]))
  return Array.from({ length: 12 }, (_, i) => byKey.get(keyOf(i + 1, year)) ?? emptyPoint(i + 1, year))
}

/** Años con transacciones, del más reciente al más antiguo. */
export function yearsOf(points: MonthPoint[]): number[] {
  return [...new Set(points.map((p) => p.year))].sort((a, b) => b - a)
}

/** Nombre corto del mes en español ("ene", "feb"…). */
export function shortMonthName(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleString("es-ES", { month: "short" }).replace(".", "")
}
