/**
 * @file hooks/use-financial-data.ts
 * @description Este archivo define el hook personalizado `useFinancialData`,
 *              que es el corazón de la gestión de estado de la aplicación.
 *              Encapsula toda la lógica para cargar, guardar, añadir, actualizar,
 *              eliminar transacciones y gestionar informes mensuales,
 *              interactuando con el almacenamiento local del navegador.
 *              Es un Client Component (`"use client"`) porque utiliza hooks de React como `useState` y `useEffect`.
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import type { AppData, Transaction, MonthlyReport, AppConfig, TransactionFormData } from "@/types"
import { loadData, saveData } from "@/lib/storage" // Funciones para interactuar con localStorage.
import { generateId, calculateReportTotals } from "@/lib/utils" // Utilidades para generar IDs y calcular totales.

/**
 * @function useFinancialData
 * @description Hook personalizado para gestionar todos los datos financieros de la aplicación.
 *              Proporciona funciones para manipular transacciones, informes y configuración,
 *              y persiste los datos en el almacenamiento local del navegador.
 * @returns {object} Un objeto que contiene el estado de los datos y funciones para modificarlos.
 * @property {AppData} data - El objeto `AppData` actual que contiene transacciones, informes y configuración.
 * @property {boolean} isLoading - Indica si los datos aún se están cargando (inicialmente `true`).
 * @property {(transaction: TransactionFormData) => void} addTransaction - Añade una nueva transacción.
 * @property {(id: string, updates: Partial<Transaction>) => void} updateTransaction - Actualiza una transacción existente.
 * @property {(id: string) => void} deleteTransaction - Elimina una transacción por su ID.
 * @property {(config: AppConfig) => void} updateConfig - Actualiza la configuración de la aplicación.
 * @property {(reportBaseData: Omit<MonthlyReport, "id" | "createdAt" | "transactions" | "totalIncome" | "totalExpenses" | "person1Income" | "person2Income" | "person1Expenses" | "person2Expenses">, adjustmentsToCreate: Omit<Transaction, "id" | "createdAt">[], existingReportId?: string) => void} createOrUpdateReport - Crea un nuevo informe mensual o actualiza uno existente, incluyendo la creación de transacciones de ajuste.
 * @property {(month: number, year: number) => Transaction[]} getTransactionsForMonth - Obtiene todas las transacciones para un mes y año específicos.
 * @property {(month: number, year: number) => MonthlyReport | undefined} getExistingReport - Obtiene un informe mensual existente para un mes y año específicos.
 * @property {(newData: AppData) => void} replaceAllData - Reemplaza todos los datos de la aplicación (útil para importar o cargar datos de prueba).
 */
export function useFinancialData() {
  /**
   * `useState` para almacenar todos los datos de la aplicación.
   * La función de inicialización `() => loadData()` se ejecuta solo una vez
   * durante el renderizado inicial para cargar los datos de localStorage.
   */
  const [data, setData] = useState<AppData>(() => loadData())
  // Estado para indicar si los datos están cargando.
  const [isLoading, setIsLoading] = useState(true)

  /**
   * `useEffect` para indicar que la carga inicial ha terminado.
   * Se ejecuta una vez después del primer renderizado.
   */
  useEffect(() => {
    setIsLoading(false)
  }, []) // Array de dependencias vacío significa que se ejecuta solo una vez al montar.

  /**
   * @function addTransaction
   * @description Añade una nueva transacción al estado de la aplicación y la guarda en localStorage.
   *              Utiliza `useCallback` para memorizar la función y evitar recrearla en cada render.
   * @param {TransactionFormData} transaction - Los datos de la nueva transacción desde el formulario.
   */
  const addTransaction = useCallback((transaction: TransactionFormData) => {
    setData((prevData) => {
      // Crea un nuevo objeto de transacción con un ID y fecha de creación.
      const newTransaction: Transaction = {
        ...transaction,
        id: generateId(), // Genera un ID único.
        createdAt: new Date().toISOString(), // Fecha de creación en formato ISO.
        nonComputable: transaction.nonComputable || false, // Asegura que siempre tenga un valor booleano
      }
      // Crea un nuevo estado de datos, añadiendo la nueva transacción al principio del array.
      const newData = {
        ...prevData,
        transactions: [newTransaction, ...prevData.transactions],
      }
      saveData(newData) // Guarda los datos actualizados en localStorage.
      return newData // Devuelve el nuevo estado.
    })
  }, []) // Dependencias vacías: la función no depende de ningún valor del scope.

  /**
   * @function updateTransaction
   * @description Actualiza una transacción existente por su ID.
   * @param {string} id - El ID de la transacción a actualizar.
   * @param {Partial<Transaction>} updates - Un objeto con las propiedades a actualizar.
   */
  const updateTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
    setData((prevData) => {
      // Mapea las transacciones, actualizando la que coincide con el ID.
      const newData = {
        ...prevData,
        transactions: prevData.transactions.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      }
      saveData(newData)
      return newData
    })
  }, [])

  /**
   * @function deleteTransaction
   * @description Elimina una transacción por su ID.
   * @param {string} id - El ID de la transacción a eliminar.
   */
  const deleteTransaction = useCallback((id: string) => {
    setData((prevData) => {
      // Filtra las transacciones, excluyendo la que coincide con el ID.
      const newData = {
        ...prevData,
        transactions: prevData.transactions.filter((t) => t.id !== id),
      }
      saveData(newData)
      return newData
    })
  }, [])

  /**
   * @function updateConfig
   * @description Actualiza la configuración de la aplicación.
   * @param {AppConfig} config - El nuevo objeto de configuración.
   */
  const updateConfig = useCallback((config: AppConfig) => {
    setData((prevData) => {
      const newData = {
        ...prevData,
        config, // Actualiza el objeto de configuración.
      }
      saveData(newData)
      return newData
    })
  }, [])

  /**
   * @function createOrUpdateReport
   * @description Crea un nuevo informe mensual o actualiza uno existente.
   *              Esta función es "atómica": primero añade las transacciones de ajuste,
   *              luego recalcula los totales del informe basándose en todas las transacciones
   *              del mes (incluyendo los ajustes), y finalmente guarda el informe.
   * @param {Omit<MonthlyReport, "id" | "createdAt" | "transactions" | "totalIncome" | "totalExpenses" | "person1Income" | "person2Income" | "person1Expenses" | "person2Expenses">} reportBaseData - Datos base del informe (sin ID, createdAt, transactions ni totales calculados).
   * @param {Omit<Transaction, "id" | "createdAt">[]} adjustmentsToCreate - Array de transacciones de ajuste a añadir.
   * @param {string} [existingReportId] - ID del informe existente si se está actualizando.
   */
  const createOrUpdateReport = useCallback(
    (
      reportBaseData: Omit<
        MonthlyReport,
        | "id"
        | "createdAt"
        | "transactions"
        | "totalIncome"
        | "totalExpenses"
        | "person1Income"
        | "person2Income"
        | "person1Expenses"
        | "person2Expenses"
      >,
      adjustmentsToCreate: Omit<Transaction, "id" | "createdAt">[],
      existingReportId?: string,
    ) => {
      console.log("=== CREATE/UPDATE REPORT ATOMIC START ===")
      console.log("Base data (excluding calculated totals):", reportBaseData)
      console.log("Adjustments to create:", adjustmentsToCreate)
      console.log("Existing ID:", existingReportId)

      setData((prevData) => {
        console.log("Executing atomic update. Previous transaction count:", prevData.transactions.length)
        // 1. Crea nuevas transacciones de ajuste con IDs y fechas de creación.
        const newAdjustmentTransactions: Transaction[] = adjustmentsToCreate.map((adj) => ({
          ...adj,
          id: generateId(),
          createdAt: new Date().toISOString(),
        }))
        console.log("New adjustment transactions with IDs:", newAdjustmentTransactions)

        // 2. Combina las nuevas transacciones de ajuste con las transacciones existentes.
        //    Las nuevas se añaden al principio para que aparezcan primero si se ordenan por fecha de creación.
        const allTransactions = [...newAdjustmentTransactions, ...prevData.transactions]
        console.log("New total transaction count:", allTransactions.length)

        // 3. Obtiene TODAS las transacciones para el mes del informe de la lista *recién actualizada*.
        const finalReportTransactions = allTransactions.filter((t) => {
          const transactionDate = new Date(t.date)
          return (
            transactionDate.getMonth() + 1 === reportBaseData.month &&
            transactionDate.getFullYear() === reportBaseData.year
          )
        })
        console.log("Final transaction count for this report:", finalReportTransactions.length)

        // 4. RECALCULA los totales del informe basándose en `finalReportTransactions`.
        //    Esto asegura que los ajustes recién añadidos se incluyan en los totales del informe.
        const finalCalculations = calculateReportTotals(finalReportTransactions)
        console.log("Recalculated totals for report:", finalCalculations)

        let finalReportsList: MonthlyReport[]
        if (existingReportId) {
          // Si existe un ID de informe, actualiza el informe existente.
          const updatedReport: MonthlyReport = {
            ...reportBaseData,
            ...finalCalculations, // Usa los totales recién recalculados.
            transactions: finalReportTransactions, // Incluye todas las transacciones del mes.
            id: existingReportId,
            // Mantiene la fecha de creación original si el informe ya existía.
            createdAt: prevData.reports.find((r) => r.id === existingReportId)?.createdAt || new Date().toISOString(),
          }
          finalReportsList = prevData.reports.map((r) => (r.id === existingReportId ? updatedReport : r))
          console.log("Updated report object:", updatedReport)
        } else {
          // Si no hay ID, crea un nuevo informe.
          const newReport: MonthlyReport = {
            ...reportBaseData,
            ...finalCalculations, // Usa los totales recién recalculados.
            transactions: finalReportTransactions, // Incluye todas las transacciones del mes.
            id: generateId(), // Genera un nuevo ID para el informe.
            createdAt: new Date().toISOString(),
          }
          finalReportsList = [newReport, ...prevData.reports] // Añade el nuevo informe al principio.
          console.log("Created new report object:", newReport)
        }

        // 5. Construye el objeto de estado final y completo.
        const newData: AppData = {
          ...prevData,
          transactions: allTransactions, // Actualiza la lista global de transacciones.
          reports: finalReportsList, // Actualiza la lista global de informes.
        }

        // 6. Guarda el nuevo estado en localStorage y lo devuelve.
        console.log("Saving new state to localStorage.")
        saveData(newData)
        console.log("=== CREATE/UPDATE REPORT ATOMIC END ===")
        return newData
      })
    },
    [], // Dependencias vacías: la función no depende de ningún valor del scope.
  )

  /**
   * @function getTransactionsForMonth
   * @description Filtra y devuelve todas las transacciones que pertenecen a un mes y año específicos.
   * @param {number} month - El mes (1-12).
   * @param {number} year - El año.
   * @returns {Transaction[]} Un array de transacciones para el mes y año dados.
   */
  const getTransactionsForMonth = useCallback(
    (month: number, year: number) => {
      return data.transactions.filter((t) => {
        const transactionDate = new Date(t.date)
        return transactionDate.getMonth() + 1 === month && transactionDate.getFullYear() === year
      })
    },
    [data.transactions], // Dependencia: se ejecuta si la lista de transacciones cambia.
  )

  /**
   * @function getExistingReport
   * @description Busca y devuelve un informe mensual existente para un mes y año específicos.
   * @param {number} month - El mes (1-12).
   * @param {number} year - El año.
   * @returns {MonthlyReport | undefined} El informe encontrado o `undefined` si no existe.
   */
  const getExistingReport = useCallback(
    (month: number, year: number) => {
      return data.reports.find((r) => r.month === month && r.year === year)
    },
    [data.reports], // Dependencia: se ejecuta si la lista de informes cambia.
  )

  /**
   * @function replaceAllData
   * @description Reemplaza completamente todos los datos de la aplicación con un nuevo objeto `AppData`.
   *              Útil para funciones de importación o carga de datos de prueba.
   * @param {AppData} newData - El nuevo objeto `AppData` que reemplazará los datos actuales.
   */
  const replaceAllData = useCallback((newData: AppData) => {
    setData(newData) // Actualiza el estado con los nuevos datos.
    saveData(newData) // Guarda los nuevos datos en localStorage.
  }, [])

  // Devuelve el estado y las funciones para que los componentes puedan utilizarlos.
  return {
    data,
    isLoading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updateConfig,
    createOrUpdateReport,
    getTransactionsForMonth,
    getExistingReport,
    replaceAllData,
  }
}
