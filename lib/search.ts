/**
 * @file lib/search.ts
 * @description Búsqueda avanzada (3.13.0): «Más filtros» de la lista de transacciones, por fechas e
 *              importes. Con alguno puesto, la lista busca en todos los meses (como con texto o evento).
 */

import type { Transaction } from "@/types"

/** Lo escrito en «Más filtros»: fechas `YYYY-MM-DD` e importes tal cual (vacío = sin ese filtro). */
export interface AdvancedFilters {
  from: string
  to: string
  min: string
  max: string
}

export const EMPTY_ADVANCED_FILTERS: AdvancedFilters = { from: "", to: "", min: "", max: "" }

/** Importe escrito («12,50» o «12.50»), o `null` si está vacío o no es un número. */
export function parseAmountFilter(value: string): number | null {
  const text = value.trim().replace(",", ".")
  if (text === "") return null
  const amount = Number(text)
  return Number.isFinite(amount) ? amount : null
}

/** Cuántos de los filtros están puestos (para el botón «Más filtros»). */
export function activeAdvancedCount(filters: AdvancedFilters): number {
  return [filters.from !== "", filters.to !== "", parseAmountFilter(filters.min) !== null, parseAmountFilter(filters.max) !== null].filter(Boolean).length
}

/**
 * @function matchesAdvancedFilters
 * @description Si una transacción cumple las fechas (ambas incluidas) y los importes. Con un filtro de
 *              importe, las de importe oculto por la pareja no salen: filtrarlas lo delataría.
 */
export function matchesAdvancedFilters(
  t: Transaction,
  filters: AdvancedFilters,
  isAmountHidden: (t: Transaction) => boolean = () => false,
): boolean {
  const day = t.date.slice(0, 10)
  if (filters.from && day < filters.from) return false
  if (filters.to && day > filters.to) return false
  const min = parseAmountFilter(filters.min)
  const max = parseAmountFilter(filters.max)
  if (min === null && max === null) return true
  if (isAmountHidden(t)) return false
  return (min === null || t.amount >= min) && (max === null || t.amount <= max)
}
