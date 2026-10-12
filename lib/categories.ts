/**
 * @file lib/categories.ts
 * @description Categorías de las transacciones (Supermercado, Casa, Ocio…), distintas del "tipo"
 *              (ingreso, gasto fijo o variable). La lista vive en la configuración del hogar y se
 *              gestiona desde Configuración; cada transacción guarda el `id` de la suya.
 *
 *              Una transacción sin `categoryId`, o cuya categoría se haya borrado, es "Sin
 *              categoría": así quitar una categoría no obliga a reescribir sus transacciones.
 */

import type { AppConfig, Transaction } from "@/types"
import { isClosingAdjustment } from "@/lib/aggregations"

/** Una categoría: para gastos o para ingresos. */
export interface Category {
  id: string
  name: string
  kind: "expense" | "income"
}

/** Texto de las transacciones sin categoría (o con una ya borrada). */
export const UNCATEGORIZED_LABEL = "Sin categoría"

/** Lista inicial: se puede cambiar desde Configuración. Los ids no cambian al renombrar. */
export const DEFAULT_CATEGORIES: Category[] = [
  { id: "supermercado", name: "Supermercado", kind: "expense" },
  { id: "casa", name: "Casa", kind: "expense" },
  { id: "suministros", name: "Suministros", kind: "expense" },
  { id: "transporte", name: "Transporte", kind: "expense" },
  { id: "ocio", name: "Restaurantes y ocio", kind: "expense" },
  { id: "salud", name: "Salud", kind: "expense" },
  { id: "ropa", name: "Ropa", kind: "expense" },
  { id: "suscripciones", name: "Suscripciones", kind: "expense" },
  { id: "regalos", name: "Regalos", kind: "expense" },
  { id: "viajes", name: "Viajes", kind: "expense" },
  { id: "ahorro", name: "Ahorro", kind: "expense" },
  { id: "otros", name: "Otros", kind: "expense" },
  { id: "nomina", name: "Nómina", kind: "income" },
  { id: "otros-ingresos", name: "Otros ingresos", kind: "income" },
]

/** Las categorías de la configuración (o las iniciales si aún no tiene). */
export function categoriesOf(config: AppConfig): Category[] {
  return config.categories ?? DEFAULT_CATEGORIES
}

/** Las categorías que valen para un tipo de transacción. */
export function categoriesForType(config: AppConfig, type: Transaction["type"]): Category[] {
  return categoriesOf(config).filter((c) => c.kind === type)
}

/** Nombre de la categoría de una transacción ("Sin categoría" si no tiene o se borró). */
export function categoryNameOf(config: AppConfig, t: Pick<Transaction, "categoryId">): string {
  if (!t.categoryId) return UNCATEGORIZED_LABEL
  return categoriesOf(config).find((c) => c.id === t.categoryId)?.name ?? UNCATEGORIZED_LABEL
}

/** Id nuevo a partir del nombre (sin tildes ni espacios), distinto de los que ya hay. */
export function newCategoryId(name: string, existing: Category[]): string {
  const base =
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "categoria"
  const ids = new Set(existing.map((c) => c.id))
  if (!ids.has(base)) return base
  let n = 2
  while (ids.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}

/** Texto comparable de un nombre de transacción: sin mayúsculas, tildes ni espacios sobrantes. */
export const normalizeName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()

/**
 * @function lastCategoryForName
 * @description Categoría que se usó la última vez con ese nombre y tipo (la transacción más
 *              reciente por fecha que la tenga). Así, al escribir "Mercadona" se rellena sola.
 */
export function lastCategoryForName(
  transactions: Transaction[],
  name: string,
  type: Transaction["type"],
): string | undefined {
  const target = normalizeName(name)
  if (!target) return undefined
  let best: Transaction | undefined
  for (const t of transactions) {
    if (t.type !== type || !t.categoryId || isClosingAdjustment(t) || normalizeName(t.name) !== target) continue
    if (!best || t.date > best.date || (t.date === best.date && t.createdAt > best.createdAt)) best = t
  }
  return best?.categoryId
}

/**
 * De qué cuenta sale el gasto: "shared" son los compartidos (cuenta de la casa, a medias o en el
 * reparto que sea), "person1" y "person2" los individuales de cada uno, y "all" todos.
 */
export type ExpenseScope = "all" | "shared" | "person1" | "person2"

/** Indica si el gasto entra en la vista pedida. */
export function isInScope(t: Transaction, scope: ExpenseScope): boolean {
  if (scope === "all") return true
  if (scope === "shared") return t.owner === "both"
  return t.owner === scope
}

/**
 * @function expensesByCategory
 * @description Suma de los gastos por categoría (por nombre), de mayor a menor, para el gráfico
 *              del informe. Los ajustes de cierre no cuentan. Con `scope`, solo los gastos de esa
 *              cuenta (compartidos o individuales de una persona); las tres vistas suman el total.
 */
export function expensesByCategory(
  transactions: Transaction[],
  config: AppConfig,
  scope: ExpenseScope = "all",
): { label: string; value: number }[] {
  const cents = new Map<string, number>()
  for (const t of transactions) {
    if (t.type !== "expense" || isClosingAdjustment(t) || !isInScope(t, scope)) continue
    const label = categoryNameOf(config, t)
    cents.set(label, (cents.get(label) ?? 0) + Math.round(t.amount * 100))
  }
  return [...cents.entries()]
    .map(([label, value]) => ({ label, value: value / 100 }))
    .sort((a, b) => b.value - a.value)
}
