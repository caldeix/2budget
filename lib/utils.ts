/**
 * @file lib/utils.ts
 * @description Este archivo contiene una colección de funciones de utilidad generales
 *              utilizadas en toda la aplicación. Incluye funciones para combinar clases CSS,
 *              formatear moneda y fechas, generar IDs, y realizar cálculos de balances.
 */

import { type ClassValue, clsx } from "clsx" // Utilidad para combinar clases condicionalmente.
import { twMerge } from "tailwind-merge" // Utilidad para fusionar clases de Tailwind sin conflictos.
import type { Transaction } from "@/types" // Importa el tipo Transaction.

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
 * @function formatCurrency
 * @description Formatea un número como una cantidad de moneda en euros (€).
 * @param {number} amount - La cantidad numérica a formatear.
 * @returns {string} La cantidad formateada como cadena de moneda (ej. "1.234,56 €").
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount)
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
  }).format(new Date(date))
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
 * @function isCurrentMonth
 * @description Comprueba si un mes y año dados corresponden al mes y año actuales del sistema.
 * @param {number} month - El mes a comprobar (1-12).
 * @param {number} year - El año a comprobar.
 * @returns {boolean} `true` si es el mes y año actuales, `false` en caso contrario.
 */
export function isCurrentMonth(month: number, year: number): boolean {
  const now = new Date()
  return month === now.getMonth() + 1 && now.getFullYear() === year
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
  let totalIncome = 0
  let totalExpenses = 0
  let person1Income = 0
  let person2Income = 0
  let person1Expenses = 0
  let person2Expenses = 0

  transactions.forEach((transaction) => {
    const { amount, type, owner, person1Percentage = 0, person2Percentage = 0 } = transaction
    if (type === "income") {
      totalIncome += amount
      if (owner === "person1") person1Income += amount
      else if (owner === "person2") person2Income += amount
      else {
        // Si es de ambos, distribuye el ingreso según los porcentajes.
        person1Income += (amount * person1Percentage) / 100
        person2Income += (amount * person2Percentage) / 100
      }
    } else {
      // type === "expense"
      totalExpenses += amount
      if (owner === "person1") person1Expenses += amount
      else if (owner === "person2") person2Expenses += amount
      else {
        // Si es de ambos, distribuye el gasto según los porcentajes.
        person1Expenses += (amount * person1Percentage) / 100
        person2Expenses += (amount * person2Percentage) / 100
      }
    }
  })
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
  let totalIncome = 0
  let totalExpenses = 0
  let person1Income = 0
  let person2Income = 0
  let person1Expenses = 0
  let person2Expenses = 0

  transactions.forEach((transaction) => {
    const { amount, type, owner, person1Percentage = 0, person2Percentage = 0 } = transaction
    if (type === "income") {
      totalIncome += amount
      if (owner === "person1") person1Income += amount
      else if (owner === "person2") person2Income += amount
      else {
        person1Income += (amount * person1Percentage) / 100
        person2Income += (amount * person2Percentage) / 100
      }
    } else {
      // type === "expense"
      totalExpenses += amount
      if (owner === "person1") person1Expenses += amount
      else if (owner === "person2") person2Expenses += amount
      else {
        person1Expenses += (amount * person1Percentage) / 100
        person2Expenses += (amount * person2Percentage) / 100
      }
    }
  })

  return {
    totalBalance: totalIncome - totalExpenses,
    person1TotalBalance: person1Income - person1Expenses,
    person2TotalBalance: person2Income - person2Expenses,
  }
}
