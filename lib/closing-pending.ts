/**
 * @file lib/closing-pending.ts
 * @description Pendientes al cerrar un mes (3.14.0). El cierre compara el dinero real con el balance del
 *              mes, que cuenta todos los gastos, pagados o no: un gasto aún sin cobrar haría salir un
 *              ajuste de más ese mes y uno de menos el siguiente. Antes de cerrar un mes terminado se
 *              decide qué pasa con cada gasto o aportación sin pagar:
 *
 *              - «paid»: ya está pagado (se marca).
 *              - «move»: llega tarde; pasa al día 1 del mes siguiente, aún pendiente.
 *              - «drop»: no se pagará. Un gasto fijo se queda a 0 € (sigue en el mes y se copia a los
 *                siguientes); un gasto variable o una aportación se borra.
 */

import type { Transaction } from "@/types"
import { isPayable } from "@/lib/aggregations"

export type PendingDecision = "paid" | "move" | "drop"

/** Lo que hace «No se pagará» con una transacción: dejarla a 0 € (fijos) o borrarla. */
export type DropAction = "zero" | "delete"

/** Gastos y aportaciones del mes aún sin pagar (ni enviar). */
export function pendingAtClose(monthTransactions: Transaction[]): Transaction[] {
  return monthTransactions.filter((t) => isPayable(t) && !t.paid)
}

export function dropActionFor(t: Pick<Transaction, "type" | "category">): DropAction {
  return t.type === "expense" && t.category === "fixed" ? "zero" : "delete"
}

/** La misma fecha llevada al día 1 del mes siguiente (conserva la hora, si la hay). */
export function nextMonthFirstDay(date: string): string {
  const year = Number(date.slice(0, 4))
  const month = Number(date.slice(5, 7))
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
  return `${next.year}-${String(next.month).padStart(2, "0")}-01${date.slice(10)}`
}

export interface PendingPlan {
  /** A marcar como pagadas. */
  paid: string[]
  /** A pasar al mes siguiente: id → fecha nueva. */
  moved: { id: string; date: string }[]
  /** Fijos que se quedan a 0 € (y pagados). */
  zeroed: string[]
  /** A borrar. */
  deleted: string[]
}

/**
 * @function planPending
 * @description Convierte las decisiones de la ventana en los cambios a hacer. Lo que no tenga
 *              decisión no se toca.
 */
export function planPending(pending: Transaction[], decisions: Record<string, PendingDecision>): PendingPlan {
  const plan: PendingPlan = { paid: [], moved: [], zeroed: [], deleted: [] }
  for (const t of pending) {
    const decision = decisions[t.id]
    if (decision === "paid") plan.paid.push(t.id)
    else if (decision === "move") plan.moved.push({ id: t.id, date: nextMonthFirstDay(t.date) })
    else if (decision === "drop") (dropActionFor(t) === "zero" ? plan.zeroed : plan.deleted).push(t.id)
  }
  return plan
}
