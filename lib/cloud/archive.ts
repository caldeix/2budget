/**
 * @file lib/cloud/archive.ts
 * @description Archivado de los meses cerrados en la nube, para leer menos de Firestore.
 *
 *              Cada vez que se abre la app, Firestore cobra una lectura por documento de la
 *              consulta, así que tener cada transacción en su documento hace que el coste crezca
 *              con toda la historia. Un mes pasado con informe ya no se edita (ver v2.3.0), así
 *              que sus transacciones se guardan DENTRO del documento de su informe, en `archive`,
 *              y se borran sus documentos sueltos: un mes cerrado cuesta una lectura.
 *
 *              Esto solo afecta a cómo se guarda en la nube. La app sigue viendo un `AppData`
 *              normal: `fromStored` une los documentos sueltos con los archivos y `toStored` hace
 *              lo contrario al escribir.
 *
 *              - Un mes está ARCHIVADO si su informe en la nube tiene `archive`. Ese archivo es la
 *                verdad del mes: si quedara algún documento suelto suyo (migración a medias), se
 *                ignora y la siguiente migración lo borra.
 *              - Un mes es ARCHIVABLE si tiene informe y es anterior al mes en curso. Lo archiva
 *                `planArchiving` (al abrir la app); los cambios normales mantienen la disposición
 *                que ya hay en la nube y no archivan nada nuevo.
 *              - Al borrar el informe de un mes archivado, sus transacciones vuelven a ser
 *                documentos sueltos.
 */

import type { AppData, MonthlyReport, Transaction } from "@/types"

/** Informe tal y como se guarda en la nube: con las transacciones del mes si está archivado. */
export type StoredReport = MonthlyReport & { archive?: Transaction[] }

/** `AppData` con la disposición de la nube: transacciones sueltas e informes (quizá con archivo). */
export type StoredData = Omit<AppData, "reports"> & { reports: StoredReport[] }

/** Clave `YYYY-MM` del mes de una transacción. */
export const transactionMonth = (t: Transaction): string => t.date.slice(0, 7)

/** Clave `YYYY-MM` del mes de un informe. */
export const reportMonth = (r: MonthlyReport): string => `${r.year}-${String(r.month).padStart(2, "0")}`

/** Clave `YYYY-MM` del mes en curso. */
export const currentMonthKey = (now: Date): string =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

/** Orden estable del archivo: así reescribir el mismo mes no cuenta como cambio. */
const byId = (a: Transaction, b: Transaction) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

/**
 * @function archivedMonthsOf
 * @description Meses archivados en la nube (sus informes tienen `archive`).
 */
export function archivedMonthsOf(reports: StoredReport[]): Set<string> {
  return new Set(reports.filter((r) => Array.isArray(r.archive)).map(reportMonth))
}

/**
 * @function fromStored
 * @description Une lo leído de la nube en un `AppData` normal: las transacciones sueltas de los
 *              meses no archivados más las de los archivos, e informes sin el campo `archive`.
 */
export function fromStored(
  live: Transaction[],
  storedReports: StoredReport[],
): { transactions: Transaction[]; reports: MonthlyReport[] } {
  const archived = archivedMonthsOf(storedReports)
  const transactions = live.filter((t) => !archived.has(transactionMonth(t)))
  const reports: MonthlyReport[] = []
  for (const { archive, ...report } of storedReports) {
    if (archive) transactions.push(...archive)
    reports.push(report)
  }
  return { transactions, reports }
}

/**
 * @function toStored
 * @description Disposición en la nube de un `AppData`: las transacciones de los meses de
 *              `archivedMonths` van dentro de su informe; el resto, sueltas. Un mes sin informe
 *              no puede estar archivado (al borrar su informe, sus transacciones vuelven a salir).
 */
export function toStored(data: AppData, archivedMonths: Set<string>): StoredData {
  const withReport = new Set(data.reports.map(reportMonth))
  const archived = new Set([...archivedMonths].filter((month) => withReport.has(month)))
  const byMonth = new Map<string, Transaction[]>()
  const transactions: Transaction[] = []
  for (const t of data.transactions) {
    const month = transactionMonth(t)
    if (archived.has(month)) {
      const list = byMonth.get(month) ?? []
      list.push(t)
      byMonth.set(month, list)
    } else {
      transactions.push(t)
    }
  }
  const reports: StoredReport[] = data.reports.map((r) => {
    const month = reportMonth(r)
    return archived.has(month) ? { ...r, archive: [...(byMonth.get(month) ?? [])].sort(byId) } : r
  })
  return { ...data, transactions, reports }
}

/**
 * @interface ArchivePlan
 * @description Lo que hay que escribir para archivar los meses pendientes.
 */
export interface ArchivePlan {
  /** Informes a reescribir con su `archive` (primero: así nunca se pierde nada). */
  reportsToWrite: StoredReport[]
  /** Documentos sueltos de meses archivados, a borrar después. */
  transactionIdsToDelete: string[]
}

/**
 * @function planArchiving
 * @description Calcula cómo archivar los meses archivables (con informe y anteriores al mes en
 *              curso) a partir de lo que hay en la nube. También borra los documentos sueltos que
 *              hayan quedado de un mes ya archivado (migración a medias). Vacío si no hay nada.
 */
export function planArchiving(live: Transaction[], storedReports: StoredReport[], now: Date): ArchivePlan {
  const current = currentMonthKey(now)
  const reportsToWrite: StoredReport[] = []
  const archived = archivedMonthsOf(storedReports)

  for (const report of storedReports) {
    const month = reportMonth(report)
    if (archived.has(month) || month >= current) continue
    const archive = live.filter((t) => transactionMonth(t) === month).sort(byId)
    reportsToWrite.push({ ...report, archive })
    archived.add(month)
  }

  const transactionIdsToDelete = live.filter((t) => archived.has(transactionMonth(t))).map((t) => t.id)
  return { reportsToWrite, transactionIdsToDelete }
}
