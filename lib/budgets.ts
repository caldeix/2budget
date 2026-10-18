/**
 * @file lib/budgets.ts
 * @description Presupuestos por categoría (3.5.0): un límite al mes para una categoría de gasto y cuánto
 *              se lleva gastado. Es del hogar: cuentan todos los gastos de la categoría en el mes
 *              (de los dos y compartidos, también los no computables y los pendientes de pagar). No
 *              cuentan los ingresos, las aportaciones a la compartida ni los ajustes de cierre.
 */

import type { AppConfig, Transaction } from "@/types"
import { categoriesOf, type Category } from "@/lib/categories"
import { isClosingAdjustment, isSettled } from "@/lib/aggregations"
import { addMoney, subtractMoney } from "@/lib/money"

/** Aviso a partir de este porcentaje del límite. */
export const BUDGET_WARNING_RATIO = 0.8

/** `ok`: por debajo del 80 %; `warning`: del 80 % al límite; `over`: pasado. */
export type BudgetLevel = "ok" | "warning" | "over"

export interface BudgetStatus {
  category: Category
  limit: number
  /** Gastado en el mes (todo lo apuntado). */
  spent: number
  /** De eso, lo ya pagado. */
  paid: number
  /** Lo que queda hasta el límite (negativo si se ha pasado). */
  left: number
  /** Gastado / límite (1 = justo en el límite). */
  ratio: number
  level: BudgetLevel
}

/** Si una transacción cuenta para el presupuesto de su categoría. */
export const countsForBudget = (t: Transaction) => t.type === "expense" && !isClosingAdjustment(t) && Boolean(t.categoryId)

export function budgetLevel(ratio: number): BudgetLevel {
  return ratio > 1 ? "over" : ratio >= BUDGET_WARNING_RATIO ? "warning" : "ok"
}

/**
 * @function budgetStatuses
 * @description Estado de los presupuestos de un mes, del más gastado (en proporción) al menos.
 * @param {Transaction[]} monthTransactions - Las transacciones del mes.
 * @param {AppConfig} config - La configuración (categorías y límites).
 */
export function budgetStatuses(monthTransactions: Transaction[], config: AppConfig): BudgetStatus[] {
  const budgets = config.budgets ?? {}
  return categoriesOf(config)
    .filter((category) => category.kind === "expense" && (budgets[category.id] ?? 0) > 0)
    .map((category) => {
      const limit = budgets[category.id]
      const ofCategory = monthTransactions.filter((t) => countsForBudget(t) && t.categoryId === category.id)
      const spent = addMoney(...ofCategory.map((t) => t.amount))
      const paid = addMoney(...ofCategory.filter(isSettled).map((t) => t.amount))
      const ratio = spent / limit
      return { category, limit, spent, paid, left: subtractMoney(limit, spent), ratio, level: budgetLevel(ratio) }
    })
    .sort((a, b) => b.ratio - a.ratio)
}

/**
 * @function budgetCrossing
 * @description Si apuntar un gasto hace pasar su categoría del 80 % o del límite (para avisar al
 *              guardarlo). `before` y `after` son lo gastado en el mes antes y después del cambio.
 * @returns {BudgetLevel | null} El nivel alcanzado, o `null` si no cambia a peor.
 */
export function budgetCrossing(limit: number, before: number, after: number): BudgetLevel | null {
  const from = budgetLevel(before / limit)
  const to = budgetLevel(after / limit)
  const rank = { ok: 0, warning: 1, over: 2 }
  return rank[to] > rank[from] ? to : null
}
