/**
 * @file lib/budgets.ts
 * @description Presupuestos por categoría (3.5.0): un límite al mes para una categoría de gasto y cuánto
 *              se lleva gastado (también los no computables y los pendientes de pagar). No cuentan los
 *              ingresos, las aportaciones a la compartida ni los ajustes de cierre.
 *
 *              Por cuenta (3.7.0): los presupuestos de cada persona cuentan sus gastos individuales
 *              (los 100 % suyos) y los compartidos, los gastos «Ambos» enteros. La parte de cada uno en
 *              un gasto compartido no cuenta en su presupuesto personal: ya cuenta en el compartido. En
 *              modo individual solo están los tuyos y cuentan todos los gastos.
 */

import type { AppConfig, Transaction } from "@/types"

/** De quién es un presupuesto: de una persona (sus gastos individuales) o compartido (los «Ambos»). */
export type BudgetOwner = "person1" | "person2" | "shared"
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
 * @function budgetsOf
 * @description Límites de una cuenta. Los de la 3.5.0 (del hogar) se leen como compartidos, o como tuyos
 *              en modo individual, hasta que se guarden de nuevo.
 */
export function budgetsOf(config: AppConfig, owner: BudgetOwner): Record<string, number> {
  if (config.budgetsByOwner) return config.budgetsByOwner[owner] ?? {}
  const legacyOwner: BudgetOwner = config.singleMode ? "person1" : "shared"
  return owner === legacyOwner ? (config.budgets ?? {}) : {}
}

/** La configuración con los límites nuevos de una cuenta (y sin los de la 3.5.0, ya pasados a su sitio). */
export function withBudgets(config: AppConfig, owner: BudgetOwner, limits: Record<string, number>): AppConfig {
  const byOwner = {
    person1: budgetsOf(config, "person1"),
    person2: budgetsOf(config, "person2"),
    shared: budgetsOf(config, "shared"),
    [owner]: limits,
  }
  const { budgets: _legacy, ...rest } = config
  return { ...rest, budgetsByOwner: byOwner }
}

/** Si un gasto cuenta para los presupuestos de una cuenta. */
export function belongsToBudget(t: Transaction, owner: BudgetOwner, singleMode: boolean): boolean {
  if (singleMode) return owner === "person1"
  return owner === "shared" ? t.owner === "both" : t.owner === owner
}

/** Cuenta de presupuesto de un gasto: la de su dueño, o la compartida si es de los dos. */
export function budgetOwnerOf(t: Pick<Transaction, "owner">, singleMode: boolean): BudgetOwner {
  if (singleMode) return "person1"
  return t.owner === "both" ? "shared" : t.owner
}

/**
 * @function budgetStatuses
 * @description Estado de los presupuestos de una cuenta en un mes, del más gastado (en proporción) al menos.
 * @param {Transaction[]} monthTransactions - Las transacciones del mes.
 * @param {AppConfig} config - La configuración (categorías y límites).
 * @param {BudgetOwner} owner - La cuenta.
 */
export function budgetStatuses(monthTransactions: Transaction[], config: AppConfig, owner: BudgetOwner): BudgetStatus[] {
  const budgets = budgetsOf(config, owner)
  const singleMode = Boolean(config.singleMode)
  const own = monthTransactions.filter((t) => countsForBudget(t) && belongsToBudget(t, owner, singleMode))
  return categoriesOf(config)
    .filter((category) => category.kind === "expense" && (budgets[category.id] ?? 0) > 0)
    .map((category) => {
      const limit = budgets[category.id]
      const ofCategory = own.filter((t) => t.categoryId === category.id)
      const spent = addMoney(...ofCategory.map((t) => t.amount))
      const paid = addMoney(...ofCategory.filter(isSettled).map((t) => t.amount))
      const ratio = spent / limit
      return { category, limit, spent, paid, left: subtractMoney(limit, spent), ratio, level: budgetLevel(ratio) }
    })
    .sort((a, b) => b.ratio - a.ratio)
}

/**
 * @function budgetTabsFor
 * @description Cuentas de presupuesto que ve quien mira (como en las metas): con hogar en la nube, la suya
 *              y la compartida; en este navegador sin cuenta, las de los dos y la compartida; en modo
 *              individual, solo la suya.
 */
export function budgetTabsFor(options: {
  viewer: "person1" | "person2" | null
  singleMode: boolean
  person1Name: string
  person2Name: string
}): { owner: BudgetOwner; label: string }[] {
  const { viewer, singleMode, person1Name, person2Name } = options
  if (singleMode) return [{ owner: "person1", label: "Mis presupuestos" }]
  const shared = { owner: "shared" as const, label: "Compartidos" }
  if (viewer) return [{ owner: viewer, label: "Mis presupuestos" }, shared]
  return [{ owner: "person1", label: person1Name }, { owner: "person2", label: person2Name }, shared]
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
