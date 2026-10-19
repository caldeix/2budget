/**
 * @file lib/trends.ts
 * @description Tendencias por categoría (3.12.0): avisos cortos cuando una categoría se aparta mucho de lo
 *              normal. Compara lo gastado en el mes que se está viendo con la media de los 3 meses
 *              anteriores en que la categoría tuvo gasto (como el recomendado de los presupuestos).
 *
 *              - En el mes en curso solo se avisa de lo que ya va por encima: aún quedan días y bajar es
 *                lo normal hasta que acaba.
 *              - En un mes terminado, también de lo que bajó.
 *              - Cuenta lo mismo que los presupuestos de cada cuenta (ver `belongsToBudget`): lo mío y lo
 *                compartido por separado.
 */

import type { AppConfig, Transaction } from "@/types"
import { categoriesOf, type Category } from "@/lib/categories"
import { belongsToBudget, countsForBudget, type BudgetOwner } from "@/lib/budgets"

/** A partir de qué diferencia se avisa: las dos a la vez (un 25 % de 10 € no merece un aviso). */
export const TREND_MIN_RATIO = 0.25
export const TREND_MIN_AMOUNT = 20
/** Cuántos avisos como mucho (los de más diferencia en euros). */
export const TREND_LIMIT = 3

export interface Trend {
  category: Category
  owner: BudgetOwner
  /** Gastado en el mes que se está viendo. */
  spent: number
  /** Media de los meses anteriores con gasto. */
  average: number
  /** Diferencia sobre la media: 0,4 = un 40 % más; −0,5 = la mitad. */
  change: number
  direction: "up" | "down"
}

/**
 * @function categoryTrends
 * @description Las categorías que más se apartan de su media en un mes, para las cuentas dadas.
 * @param {Transaction[]} transactions - Todas las transacciones.
 * @param {AppConfig} config - La configuración (categorías y modo).
 * @param {BudgetOwner[]} owners - Las cuentas que ve quien mira (ver `budgetTabsFor`).
 * @param {number} month - Mes que se está viendo (1-12).
 * @param {number} year - Año que se está viendo.
 * @param {Date} today - Hoy (para saber si el mes está en curso, terminado o por venir).
 */
export function categoryTrends(
  transactions: Transaction[],
  config: AppConfig,
  owners: BudgetOwner[],
  month: number,
  year: number,
  today: Date = new Date(),
): Trend[] {
  const selected = year * 12 + (month - 1)
  const current = today.getFullYear() * 12 + today.getMonth()
  if (selected > current) return []
  const isEnded = selected < current

  const keyOf = (offset: number) => {
    const date = new Date(year, month - 1 - offset, 1)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
  }
  const selectedKey = keyOf(0)
  const previousKeys = [1, 2, 3].map(keyOf)
  const singleMode = Boolean(config.singleMode)
  const categories = categoriesOf(config).filter((c) => c.kind === "expense")

  const trends: Trend[] = []
  for (const owner of owners) {
    // Céntimos por categoría y mes, solo de los meses que interesan.
    const cents = new Map<string, Map<string, number>>()
    for (const t of transactions) {
      if (!countsForBudget(t) || !belongsToBudget(t, owner, singleMode)) continue
      const key = t.date.slice(0, 7)
      if (key !== selectedKey && !previousKeys.includes(key)) continue
      const byMonth = cents.get(t.categoryId!) ?? new Map<string, number>()
      byMonth.set(key, (byMonth.get(key) ?? 0) + Math.round(t.amount * 100))
      cents.set(t.categoryId!, byMonth)
    }

    for (const category of categories) {
      const byMonth = cents.get(category.id)
      if (!byMonth) continue
      const withSpending = previousKeys.map((key) => byMonth.get(key) ?? 0).filter((value) => value > 0)
      if (withSpending.length === 0) continue
      const average = withSpending.reduce((a, b) => a + b, 0) / withSpending.length / 100
      const spent = (byMonth.get(selectedKey) ?? 0) / 100
      const difference = spent - average
      if (Math.abs(difference) < TREND_MIN_AMOUNT || Math.abs(difference) < average * TREND_MIN_RATIO) continue
      if (difference < 0 && !isEnded) continue
      trends.push({ category, owner, spent, average, change: difference / average, direction: difference > 0 ? "up" : "down" })
    }
  }

  return trends
    .sort((a, b) => Math.abs(b.spent - b.average) - Math.abs(a.spent - a.average))
    .slice(0, TREND_LIMIT)
}
