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
import { aggregateTransactions, isSettled } from "@/lib/aggregations"
import { subtractMoney } from "@/lib/money"
import { monthAccountSplit, usesSharedAccount, type AccountSplit } from "@/lib/shared-account"

/**
 * @interface TodayFigures
 * @description Cifras "a día de hoy": solo con los gastos ya pagados y las aportaciones ya enviadas
 *              (los ingresos cuentan siempre).
 */
export interface TodayFigures {
  totalExpenses: number
  person1Expenses: number
  person2Expenses: number
  balance: number
  person1Balance: number
  person2Balance: number
  /** Reparto entre la cuenta de cada uno y la compartida, a día de hoy. */
  accounts: AccountSplit
}

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
 * @property {AccountSplit} accounts - Reparto entre la cuenta de cada uno y la compartida (ver `lib/shared-account.ts`).
 * @property {TodayFigures} today - Las mismas cifras de gastos y balances, solo con lo ya pagado.
 * @property {boolean} hasPendingExpenses - Si queda algún gasto o aportación sin pagar (si no, "hoy" = "previsto").
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
  accounts: AccountSplit
  today: TodayFigures
  hasPendingExpenses: boolean
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
    // "A día de hoy": el mismo cálculo, solo con lo ya pagado (ver `isSettled`).
    const settled = transactions.filter(isSettled)
    const paid = aggregateTransactions(settled)

    // Restas monetarias exactas: el operador `-` nativo reintroduce error de coma
    // flotante incluso con operandos de 2 decimales limpios.
    const person1Balance = subtractMoney(totals.person1Income, totals.person1Expenses)
    const person2Balance = subtractMoney(totals.person2Income, totals.person2Expenses)
    const todayPerson1Balance = subtractMoney(paid.person1Income, paid.person1Expenses)
    const todayPerson2Balance = subtractMoney(paid.person2Income, paid.person2Expenses)
    // El mes usa la compartida si tiene alguna aportación, aunque aún no se haya enviado.
    const usesShared = usesSharedAccount(transactions)

    return {
      ...totals,
      balance: subtractMoney(totals.totalIncome, totals.totalExpenses),
      person1Balance,
      person2Balance,
      accounts: monthAccountSplit(transactions, person1Balance, person2Balance, usesShared),
      today: {
        totalExpenses: paid.totalExpenses,
        person1Expenses: paid.person1Expenses,
        person2Expenses: paid.person2Expenses,
        balance: subtractMoney(paid.totalIncome, paid.totalExpenses),
        person1Balance: todayPerson1Balance,
        person2Balance: todayPerson2Balance,
        accounts: monthAccountSplit(settled, todayPerson1Balance, todayPerson2Balance, usesShared),
      },
      hasPendingExpenses: settled.length < transactions.length,
    }
  }, [transactions]) // Dependencia: el cálculo se ejecuta solo si 'transactions' cambia.
}
