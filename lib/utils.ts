/**
 * @file lib/utils.ts
 * @description Este archivo contiene una colección de funciones de utilidad generales
 *              utilizadas en toda la aplicación. Incluye funciones para combinar clases CSS,
 *              formatear moneda y fechas, generar IDs, y realizar cálculos de balances.
 */

import { type ClassValue, clsx } from "clsx" // Utilidad para combinar clases condicionalmente.
import { twMerge } from "tailwind-merge" // Utilidad para fusionar clases de Tailwind sin conflictos.
import type { Transaction } from "@/types" // Importa el tipo Transaction.
import { aggregateTransactions } from "@/lib/aggregations" // Núcleo único de agregación.
import { subtractMoney } from "@/lib/money" // Resta monetaria exacta.

/**
 * `formatCurrency` vive ahora en `@/lib/money`, junto al resto de la aritmética monetaria.
 * Se re-exporta desde aquí para no tocar los múltiples componentes que ya la importan
 * de `@/lib/utils`.
 */
export { formatCurrency } from "@/lib/money"

/**
 * @function cn
 * @description Combina y fusiona clases CSS de Tailwind de forma inteligente.
 *              Utiliza `clsx` para combinar clases condicionalmente y `twMerge`
 *              para resolver conflictos de clases de Tailwind (ej. `p-4` y `p-6`).
 * @param {...ClassValue[]} inputs - Una lista de clases CSS o valores condicionales.
 * @returns {string} Una cadena de clases CSS combinadas y limpias.
 * @example
 * cn("text-red-500", isActive && "font-bold", "p-4") // "text-red-500 font-bold p-4"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * @function parseLocalDate
 * @description Parsea una cadena "YYYY-MM-DD" como fecha en la zona horaria LOCAL (no UTC).
 *              `new Date("2026-08-01")` se interpreta como medianoche UTC, lo que en zonas
 *              UTC-negativas desplaza el día/mes al anterior. Esta función lo evita construyendo
 *              la fecha con los componentes locales.
 * @param {string} date - La cadena de fecha en formato "YYYY-MM-DD".
 * @returns {Date} Un objeto Date a medianoche en hora local.
 */
export function parseLocalDate(date: string): Date {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

/**
 * @function toLocalDateString
 * @description Convierte un `Date` a la cadena "YYYY-MM-DD" usando los componentes LOCALES.
 *              Es la inversa exacta de `parseLocalDate`.
 *
 *              NO usar `toISOString()` para esto: convierte a UTC y en España (UTC+1/+2)
 *              devuelve el DÍA ANTERIOR entre medianoche y las 01:00/02:00 locales.
 * @param {Date} date - La fecha a convertir.
 * @returns {string} La fecha en formato "YYYY-MM-DD".
 */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * @function getTodayDate
 * @description Devuelve la fecha de HOY en formato "YYYY-MM-DD" y hora local.
 * @returns {string} La fecha de hoy.
 */
export function getTodayDate(): string {
  return toLocalDateString(new Date())
}

/**
 * @function getLastDateOfMonth
 * @description Devuelve el último día de un mes como cadena "YYYY-MM-DD"
 *              (ej. 2026-02-28, 2024-02-29, 2026-04-30).
 *              El mes y el año se reemiten tal cual, así que la cadena resultante
 *              SIEMPRE pertenece al mes pedido.
 * @param {number} month - El mes (1-12).
 * @param {number} year - El año.
 * @returns {string} El último día del mes.
 */
export function getLastDateOfMonth(month: number, year: number): string {
  // El día 0 del mes siguiente es el último día del mes actual.
  const lastDay = new Date(year, month, 0).getDate()
  return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
}

/**
 * @function resolvePaidDate
 * @description Calcula la fecha que debe tener un gasto al marcarlo como PAGADO.
 *
 *              REGLA DE NEGOCIO: marcar como pagado cambia el DÍA, nunca el MES.
 *                - Gasto del mes en curso -> la fecha de hoy (local).
 *                - Gasto de cualquier otro mes (anterior o futuro) -> el último día de SU mes.
 *
 *              INVARIANTE: el mes/año de la cadena devuelta es siempre el mismo que
 *              `parseLocalDate(date)` asigna a la transacción, que es exactamente el criterio
 *              que usa `getTransactionsForMonth`. Por construcción, un gasto NUNCA puede
 *              cambiar de mes al marcarse como pagado.
 * @param {string} date - Fecha actual de la transacción ("YYYY-MM-DD").
 * @param {Date} [today] - "Hoy" inyectable; permite fijar un único instante para todo un lote.
 * @returns {string} La nueva fecha en formato "YYYY-MM-DD".
 */
export function resolvePaidDate(date: string, today: Date = new Date()): string {
  const transactionDate = parseLocalDate(date)
  const transactionMonth = transactionDate.getMonth() + 1
  const transactionYear = transactionDate.getFullYear()

  // Mes en curso: se fecha hoy. El guard garantiza que hoy cae en ese mismo mes.
  if (transactionMonth === today.getMonth() + 1 && transactionYear === today.getFullYear()) {
    return toLocalDateString(today)
  }

  // Cualquier otro mes (anterior o futuro): último día de SU mes, nunca del mes actual.
  return getLastDateOfMonth(transactionMonth, transactionYear)
}

/**
 * @function formatDate
 * @description Formatea una cadena de fecha (YYYY-MM-DD) a un formato legible en español.
 * @param {string} date - La cadena de fecha en formato ISO (ej. "2023-10-26").
 * @returns {string} La fecha formateada (ej. "26 de octubre de 2023").
 */
export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(parseLocalDate(date))
}

/**
 * @function formatMonthYear
 * @description Formatea un número de mes y un año a una cadena legible en español,
 *              con el nombre del mes en mayúsculas.
 * @param {number} month - El número del mes (1-12).
 * @param {number} year - El año.
 * @returns {string} La cadena formateada (ej. "OCTUBRE 2023").
 */
export function formatMonthYear(month: number, year: number): string {
  // Convierte el número del mes a un objeto Date para obtener el nombre del mes.
  // `month - 1` porque los meses en Date son de 0 a 11.
  const monthName = new Intl.DateTimeFormat("es-ES", {
    month: "long",
  })
    .format(new Date(year, month - 1))
    .toUpperCase() // Convierte el nombre del mes a mayúsculas.
  return `${monthName} ${year}`
}

/**
 * @function generateId
 * @description Genera un identificador único aleatorio.
 *              Útil para asignar IDs a nuevas transacciones o informes.
 * @returns {string} Un string alfanumérico corto.
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9) // Genera un string aleatorio y toma una subcadena.
}

/**
 * @function getCurrentMonth
 * @description Obtiene el número del mes actual (1-12).
 * @returns {number} El mes actual.
 */
export function getCurrentMonth(): number {
  return new Date().getMonth() + 1 // `getMonth()` devuelve 0-11, por eso se suma 1.
}

/**
 * @function getCurrentYear
 * @description Obtiene el año actual.
 * @returns {number} El año actual.
 */
export function getCurrentYear(): number {
  return new Date().getFullYear()
}

/**
 * @function getPreviousMonthYear
 * @description Calcula el mes y año anteriores a una fecha dada.
 * @param {number} month - El mes actual (1-12).
 * @param {number} year - El año actual.
 * @returns {{ month: number; year: number }} Un objeto con el mes y año anteriores.
 */
export function getPreviousMonthYear(month: number, year: number): { month: number; year: number } {
  if (month === 1) {
    // Si es enero, el mes anterior es diciembre del año anterior.
    return { month: 12, year: year - 1 }
  }
  return { month: month - 1, year } // Simplemente resta 1 al mes.
}

/**
 * @function getNextMonthYear
 * @description Calcula el mes y año siguientes a una fecha dada.
 * @param {number} month - El mes actual (1-12).
 * @param {number} year - El año actual.
 * @returns {{ month: number; year: number }} Un objeto con el mes y año siguientes.
 */
export function getNextMonthYear(month: number, year: number): { month: number; year: number } {
  if (month === 12) {
    // Si es diciembre, el mes siguiente es enero del año siguiente.
    return { month: 1, year: year + 1 }
  }
  return { month: month + 1, year } // Simplemente suma 1 al mes.
}

/**
 * @function calculateReportTotals
 * @description Calcula los totales de ingresos, gastos y la distribución por persona
 *              para un conjunto de transacciones. Utilizado para generar informes mensuales.
 * @param {Transaction[]} transactions - Un array de objetos de transacción.
 * @returns {{ totalIncome: number; totalExpenses: number; person1Income: number; person2Income: number; person1Expenses: number; person2Expenses: number; }} Un objeto con los totales calculados.
 */
export function calculateReportTotals(transactions: Transaction[]): {
  totalIncome: number
  totalExpenses: number
  person1Income: number
  person2Income: number
  person1Expenses: number
  person2Expenses: number
} {
  // Los gastos no computables SÍ cuentan en un informe (comportamiento histórico).
  const { totalIncome, totalExpenses, person1Income, person2Income, person1Expenses, person2Expenses } =
    aggregateTransactions(transactions)
  return { totalIncome, totalExpenses, person1Income, person2Income, person1Expenses, person2Expenses }
}

/**
 * @function calculateCumulativeBalances
 * @description Calcula los balances acumulados totales e individuales de todas las transacciones.
 *              A diferencia de `calculateReportTotals`, esta función procesa *todas* las transacciones
 *              disponibles para dar una visión global a largo plazo.
 * @param {Transaction[]} transactions - Un array de objetos de transacción.
 * @returns {{ totalBalance: number; person1TotalBalance: number; person2TotalBalance: number; }} Un objeto con los balances acumulados.
 */
export function calculateCumulativeBalances(transactions: Transaction[]): {
  totalBalance: number
  person1TotalBalance: number
  person2TotalBalance: number
} {
  // A diferencia del informe mensual, el acumulado EXCLUYE los gastos no computables.
  const totals = aggregateTransactions(transactions, { excludeNonComputableExpenses: true })

  return {
    totalBalance: subtractMoney(totals.totalIncome, totals.totalExpenses),
    person1TotalBalance: subtractMoney(totals.person1Income, totals.person1Expenses),
    person2TotalBalance: subtractMoney(totals.person2Income, totals.person2Expenses),
  }
}
