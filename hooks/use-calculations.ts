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
import { aggregateTransactions } from "@/lib/aggregations"
import { subtractMoney } from "@/lib/money"

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
  nonComputableExpenses: number
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
    // Los gastos no computables SÍ entran en los totales del mes y además se contabilizan
    // aparte en `nonComputableExpenses` (comportamiento histórico de este hook).
    const totals = aggregateTransactions(transactions)

    return {
      ...totals,
      // Restas monetarias exactas: el operador `-` nativo reintroduce error de coma
      // flotante incluso con operandos de 2 decimales limpios.
      balance: subtractMoney(totals.totalIncome, totals.totalExpenses),
      person1Balance: subtractMoney(totals.person1Income, totals.person1Expenses),
      person2Balance: subtractMoney(totals.person2Income, totals.person2Expenses),
    }
  }, [transactions]) // Dependencia: el cálculo se ejecuta solo si 'transactions' cambia.
}
