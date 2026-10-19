/**
 * @file lib/tags.ts
 * @description Etiquetas de evento (3.10.0): agrupan gastos de un viaje o una ocasión («Lisboa 2026»)
 *              aunque sean de categorías y meses distintos, individuales o compartidos. Una por
 *              transacción y opcional. Los gastos fijos y las aportaciones no llevan etiqueta: un fijo
 *              se repite cada mes y una aportación es un traspaso.
 */

import type { Transaction } from "@/types"
import { aggregateTransactions, isClosingAdjustment, isContribution } from "@/lib/aggregations"
import { normalizeName } from "@/lib/categories"

/** Longitud máxima de una etiqueta. */
export const TAG_MAX_LENGTH = 40

/** Si una transacción puede llevar etiqueta. */
export function canHaveTag(t: Pick<Transaction, "type" | "category">): boolean {
  return t.type !== "contribution" && !(t.type === "expense" && t.category === "fixed")
}

/** La etiqueta limpia (sin espacios de más), o `undefined` si queda vacía o no se admite. */
export function cleanTag(t: Pick<Transaction, "type" | "category"> & { tag?: unknown }): string | undefined {
  if (typeof t.tag !== "string" || !canHaveTag(t)) return undefined
  const tag = t.tag.trim().replace(/\s+/g, " ").slice(0, TAG_MAX_LENGTH)
  return tag || undefined
}

/** Etiquetas usadas, de la usada más recientemente a la más antigua (para sugerirlas al escribir). */
export function tagsInUse(transactions: Transaction[]): string[] {
  const latest = new Map<string, { tag: string; date: string }>()
  for (const t of transactions) {
    if (!t.tag) continue
    const key = normalizeName(t.tag)
    const seen = latest.get(key)
    if (!seen || t.date > seen.date) latest.set(key, { tag: t.tag, date: t.date })
  }
  return [...latest.values()].sort((a, b) => (a.date < b.date ? 1 : -1)).map((v) => v.tag)
}

/** Si una transacción es de un evento (sin distinguir mayúsculas ni tildes). */
export const hasTag = (t: Transaction, tag: string) => Boolean(t.tag) && normalizeName(t.tag!) === normalizeName(tag)

/** Resumen de un evento. */
export interface TagEvent {
  tag: string
  /** Primer y último día con movimientos (`YYYY-MM-DD`). */
  from: string
  to: string
  /** Gastos (y, si los hay, ingresos) del evento. */
  expenses: number
  income: number
  /** Gasto de cada persona: lo individual más su parte de lo compartido. */
  person1Expenses: number
  person2Expenses: number
  count: number
}

/**
 * @function tagEvents
 * @description Un resumen por etiqueta, del evento más reciente al más antiguo.
 */
export function tagEvents(transactions: Transaction[]): TagEvent[] {
  const byTag = new Map<string, Transaction[]>()
  for (const t of transactions) {
    if (!t.tag || isContribution(t) || isClosingAdjustment(t)) continue
    const key = normalizeName(t.tag)
    const list = byTag.get(key)
    if (list) list.push(t)
    else byTag.set(key, [t])
  }
  return [...byTag.values()]
    .map((list) => {
      const dates = list.map((t) => t.date.slice(0, 10)).sort()
      const totals = aggregateTransactions(list)
      return {
        tag: tagsInUse(list)[0],
        from: dates[0],
        to: dates[dates.length - 1],
        expenses: totals.totalExpenses,
        income: totals.totalIncome,
        person1Expenses: totals.person1Expenses,
        person2Expenses: totals.person2Expenses,
        count: list.length,
      }
    })
    .sort((a, b) => (a.to < b.to ? 1 : -1))
}
