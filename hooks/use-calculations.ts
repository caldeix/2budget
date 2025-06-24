"use client"

/**
 * @file hooks/use-calculations.ts
 * @description Este archivo define un hook personalizado para realizar cálculos financieros
 *              basados en una lista de transacciones. Es fundamental para obtener los resúmenes
 *              de ingresos, gastos y balances por persona y totales.
 *              Utiliza `useMemo` para optimizar el rendimiento, recalculando solo cuando las transacciones cambian.
 */

import { useMemo } from "react"
import type { Transaction } from "@/types"

/**
 * @interface CalculationResult
 * @description Define la estructura del objeto que devuelve el hook `useCalculations`.
 *              Contiene todos los totales y balances calculados a partir de las transacciones.
 * @property {number} totalIncome - Suma total de todos los ingresos.
 * @property {number} totalExpenses - Suma total de todos los gastos.
 * @property {number} balance - Balance general (ingresos totales - gastos totales).
 * @property {number} person1Income - Ingresos atribuidos a la Persona 1.
 * @property {number} person2Income - Ingresos atribuidos a la Persona 2.
 * @property {number} person1Expenses - Gastos atribuidos a la Persona 1.
 * @property {number} person2Expenses - Gastos atribuidos a la Persona 2.
 * @property {number} person1Balance - Balance de la Persona 1 (ingresos P1 - gastos P1).
 * @property {number} person2Balance - Balance de la Persona 2 (ingresos P2 - gastos P2).
 * @property {number} fixedExpenses - Suma de los gastos de categoría "fijo".
 * @property {number} variableExpenses - Suma de los gastos de categoría "variable".
 */
interface CalculationResult {
  totalIncome: number
  totalExpenses: number
  balance: number
  person1Income: number
  person2Income: number
  person1Expenses: number
  person2Expenses: number
  person1Balance: number
  person2Balance: number
  fixedExpenses: number
  variableExpenses: number
}

/**
 * @function useCalculations
 * @description Hook personalizado que calcula y devuelve un resumen financiero
 *              a partir de una lista de transacciones.
 *              Es ideal para componentes que necesitan mostrar estadísticas actualizadas.
 * @param {Transaction[]} transactions - Un array de objetos de transacción.
 * @returns {CalculationResult} Un objeto con los totales de ingresos, gastos y balances.
 *
 * @example
 * // En un componente React:
 * const { totalIncome, totalExpenses, balance, person1Balance } = useCalculations(transactionsDelMes);
 * <div>Ingresos: {totalIncome}</div>
 */
export function useCalculations(transactions: Transaction[]): CalculationResult {
  /**
   * `useMemo` es un hook de React que memoriza el resultado de una función.
   * Solo recalcula el valor cuando sus dependencias (en este caso, `transactions`) cambian.
   * Esto evita cálculos innecesarios en cada renderizado del componente, mejorando el rendimiento.
   */
  return useMemo(() => {
    // Inicializa el objeto de resultados con todos los valores en cero.
    const result: CalculationResult = {
      totalIncome: 0,
      totalExpenses: 0,
      balance: 0,
      person1Income: 0,
      person2Income: 0,
      person1Expenses: 0,
      person2Expenses: 0,
      person1Balance: 0,
      person2Balance: 0,
      fixedExpenses: 0,
      variableExpenses: 0,
    }

    // Itera sobre cada transacción para acumular los valores.
    transactions.forEach((transaction) => {
      // Desestructuración para obtener las propiedades relevantes de cada transacción.
      const { amount, type, category, owner, person1Percentage = 0, person2Percentage = 0 } = transaction

      // Lógica para ingresos
      if (type === "income") {
        result.totalIncome += amount // Suma al total de ingresos

        // Distribución de ingresos según el propietario
        if (owner === "person1") {
          result.person1Income += amount
        } else if (owner === "person2") {
          result.person2Income += amount
        } else if (owner === "both") {
          // Si es de ambos, distribuye según los porcentajes
          result.person1Income += (amount * person1Percentage) / 100
          result.person2Income += (amount * person2Percentage) / 100
        }
      }
      // Lógica para gastos
      else if (type === "expense") {
        result.totalExpenses += amount // Suma al total de gastos

        // Clasificación por categoría de gasto
        if (category === "fixed") {
          result.fixedExpenses += amount
        } else if (category === "variable") {
          result.variableExpenses += amount
        }

        // Distribución de gastos según el propietario
        if (owner === "person1") {
          result.person1Expenses += amount
        } else if (owner === "person2") {
          result.person2Expenses += amount
        } else if (owner === "both") {
          // Si es de ambos, distribuye según los porcentajes
          result.person1Expenses += (amount * person1Percentage) / 100
          result.person2Expenses += (amount * person2Percentage) / 100
        }
      }
    })

    // Calcula los balances finales después de procesar todas las transacciones.
    result.balance = result.totalIncome - result.totalExpenses
    result.person1Balance = result.person1Income - result.person1Expenses
    result.person2Balance = result.person2Income - result.person2Expenses

    return result
  }, [transactions]) // Dependencia: el cálculo se ejecuta solo si 'transactions' cambia.
}
