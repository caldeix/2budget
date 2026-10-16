/**
 * @file lib/dedupe.ts
 * @description Un informe por mes y ajustes de cierre con id fijo.
 *
 *              Antes, el informe y sus ajustes llevaban un id aleatorio: si los dos miembros cerraban
 *              el mismo mes a la vez (o uno sin conexión), quedaban dos informes y dos juegos de
 *              ajustes, y las cifras del mes salían mal. Ahora:
 *              - Los ids son fijos por mes (`reportIdFor`, `adjustmentIdFor`): dos cierres simultáneos
 *                escriben los mismos documentos y gana el último, sin duplicar nada.
 *              - Al leer (`dedupeAppData`) se queda un informe por mes (el más reciente) y una
 *                transacción por id (un mes archivado en dos informes la traería dos veces).
 *
 *              Los ajustes de cierre NO se juntan por mes al leer: los de la corrección de céntimos
 *              de la v1.4.5 conviven a propósito con el ajuste normal del mismo mes. Si quedara un
 *              juego duplicado de antes de la 3.0.2, se arregla actualizando ese cierre, que sustituye
 *              todos los ajustes de su mes.
 */

import type { AppData, MonthlyReport, Transaction } from "@/types"

/** Clave `YYYY-MM` de un mes. */
const monthKey = (month: number, year: number) => `${year}-${String(month).padStart(2, "0")}`

/** Id fijo del informe de un mes. */
export const reportIdFor = (month: number, year: number) => `report-${monthKey(month, year)}`

/** Id fijo del ajuste de cierre de un mes para un dueño ("shared" para la compartida). */
export const adjustmentIdFor = (month: number, year: number, owner: Transaction["owner"]) =>
  `adj-${monthKey(month, year)}-${owner === "both" ? "shared" : owner}`

/** El más reciente de dos informes (a igualdad, el primero). */
const newer = (a: MonthlyReport, b: MonthlyReport): MonthlyReport => ((b.createdAt ?? "") > (a.createdAt ?? "") ? b : a)

/**
 * @function dedupeAppData
 * @description Un informe por mes (el más reciente) y una transacción por id (la primera). Devuelve
 *              el mismo objeto si no hay nada que quitar, y conserva el orden de cada lista.
 */
export function dedupeAppData<T extends Pick<AppData, "transactions" | "reports">>(data: T): T {
  const reportsByMonth = new Map<string, MonthlyReport>()
  for (const r of data.reports) {
    const key = monthKey(r.month, r.year)
    const kept = reportsByMonth.get(key)
    reportsByMonth.set(key, kept ? newer(kept, r) : r)
  }
  const ids = new Set(data.transactions.map((t) => t.id))
  if (reportsByMonth.size === data.reports.length && ids.size === data.transactions.length) return data

  const seen = new Set<string>()
  return {
    ...data,
    transactions: data.transactions.filter((t) => !seen.has(t.id) && Boolean(seen.add(t.id))),
    reports: data.reports.filter((r) => reportsByMonth.get(monthKey(r.month, r.year)) === r),
  }
}
