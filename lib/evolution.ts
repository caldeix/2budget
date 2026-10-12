/**
 * @file lib/evolution.ts
 * @description Series mensuales para el gráfico de evolución: ingresos, gastos y ahorro de cada
 *              mes, calculados igual que las tarjetas del resumen (con los gastos no computables).
 *              Se calcula sobre las transacciones (los meses archivados ya vienen unidos), así que
 *              incluye también los meses abiertos y el mes en curso.
 */

import type { Transaction } from "@/types"
import { aggregateTransactions } from "@/lib/aggregations"
import { subtractMoney } from "@/lib/money"

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
 * @function monthlyEvolution
 * @description Un punto por cada mes con transacciones, del más antiguo al más reciente.
 */
export function monthlyEvolution(transactions: Transaction[]): MonthPoint[] {
  const byMonth = new Map<string, Transaction[]>()
  for (const t of transactions) {
    const key = t.date.slice(0, 7)
    const list = byMonth.get(key)
    if (list) list.push(t)
    else byMonth.set(key, [t])
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, list]) => {
      const totals = aggregateTransactions(list)
      return {
        key,
        year: Number(key.slice(0, 4)),
        month: Number(key.slice(5, 7)),
        income: totals.totalIncome,
        expenses: totals.totalExpenses,
        savings: subtractMoney(totals.totalIncome, totals.totalExpenses),
      }
    })
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
