/**
 * @file hooks/use-financial-data.ts
 * @description Este archivo define el hook personalizado `useFinancialData`,
 *              que es el corazón de la gestión de estado de la aplicación.
 *              Encapsula toda la lógica para cargar, guardar, añadir, actualizar,
 *              eliminar transacciones y gestionar informes mensuales.
 *              Los datos se guardan en el almacenamiento local del navegador o, con sesión
 *              iniciada y un hogar, en Firestore (sincronizados entre dispositivos).
 *              Es un Client Component (`"use client"`) porque utiliza hooks de React como `useState` y `useEffect`.
 */

"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { Firestore } from "firebase/firestore"
import type { AppData, Transaction, MonthlyReport, AppConfig, TransactionFormData } from "@/types"
import { loadData, saveData } from "@/lib/storage" // Funciones para interactuar con localStorage.
import { subscribeHousehold, writeChanges, type HouseholdInfo } from "@/lib/cloud/repository" // Sincronización con Firestore.
import { getErrorMessage } from "@/lib/cloud/auth" // Mensajes de error en español.
import { generateId, calculateReportTotals, parseLocalDate, resolvePaidDate } from "@/lib/utils" // Utilidades para generar IDs, calcular totales, parsear fechas locales y refechar pagos.
import { roundMoney } from "@/lib/money" // Redondeo canónico a 2 decimales.

/**
 * @interface CloudTarget
 * @description Hogar de Firestore donde se guardan los datos.
 */
export interface CloudTarget {
  db: Firestore
  householdId: string
}

/**
 * @function useFinancialData
 * @description Hook personalizado para gestionar todos los datos financieros de la aplicación.
 *              Proporciona funciones para manipular transacciones, informes y configuración,
 *              y persiste los datos en el almacenamiento local del navegador o en la nube.
 *
 *              Cada cambio pasa por `commit`: calcula el estado nuevo a partir del actual
 *              (`dataRef`), lo muestra al momento y lo guarda donde toque. En la nube solo se
 *              envía la diferencia (ver `lib/cloud/diff.ts`) y los cambios del otro dispositivo
 *              o de la pareja llegan por los listeners de Firestore.
 * @param {CloudTarget | null} cloud - Hogar en la nube, o `null` para el modo local.
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
 * @property {HouseholdInfo | null} householdInfo - Miembros del hogar en la nube (`null` en local).
 * @property {string | null} syncError - Último error de sincronización con la nube.
 */
export function useFinancialData(cloud: CloudTarget | null = null) {
  /**
   * `useState` para almacenar todos los datos de la aplicación.
   * Se arranca con los datos de localStorage; en modo nube los sustituye el primer snapshot.
   */
  const [data, setData] = useState<AppData>(() => loadData())
  // Copia síncrona del estado: varios cambios seguidos (p. ej. copiar gastos fijos) encadenan
  // sobre el último estado sin esperar a que React vuelva a renderizar.
  const dataRef = useRef(data)
  const [householdInfo, setHouseholdInfo] = useState<HouseholdInfo | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)

  const db = cloud?.db ?? null
  const householdId = cloud?.householdId ?? null
  // Dónde se guarda cada cambio; se actualiza al cambiar de modo.
  const targetRef = useRef<CloudTarget | null>(null)

  // Origen pedido ("local" o el id del hogar) y origen cuyos datos ya están en `data`.
  // Se compara en el mismo render: al cambiar de origen, `isLoading` es `true` desde el primer
  // render, sin esperar a un efecto (así nadie trabaja con los datos del origen anterior).
  const source = householdId ?? "local"
  const [loadedSource, setLoadedSource] = useState<string | null>(null)
  const isLoading = loadedSource !== source

  /**
   * `useEffect` que conecta con el origen de los datos: localStorage o el hogar en Firestore.
   * Se vuelve a ejecutar al iniciar o cerrar sesión y al entrar o salir de un hogar.
   */
  useEffect(() => {
    setSyncError(null)

    if (!db || !householdId) {
      // Modo local: los datos de este navegador, como siempre.
      targetRef.current = null
      const local = loadData()
      dataRef.current = local
      setData(local)
      setHouseholdInfo(null)
      setLoadedSource("local")
      return
    }

    // Modo nube: se espera al primer snapshot completo del hogar.
    targetRef.current = { db, householdId }
    return subscribeHousehold(
      db,
      householdId,
      (cloudData, info) => {
        dataRef.current = cloudData
        setData(cloudData)
        setHouseholdInfo(info)
        setLoadedSource(householdId)
      },
      () => {
        setHouseholdInfo(null)
        setSyncError("Ya no tienes acceso a este hogar. Sal del hogar desde tu cuenta para seguir.")
        setLoadedSource(householdId)
      },
      (error) => {
        console.error("Error syncing household:", error)
        setSyncError(getErrorMessage(error))
        setLoadedSource(householdId)
      },
    )
  }, [db, householdId])

  /**
   * @function commit
   * @description Aplica un cambio: calcula el estado nuevo, lo muestra y lo guarda.
   *              El cálculo va fuera del actualizador de `setData` para que se haga una sola
   *              vez (en modo estricto, React ejecuta los actualizadores dos veces y se
   *              generarían IDs distintos).
   * @param {(prev: AppData) => AppData} compute - Función pura que devuelve el estado nuevo.
   */
  const commit = useCallback((compute: (prev: AppData) => AppData) => {
    const prev = dataRef.current
    const next = compute(prev)
    if (next === prev) return
    dataRef.current = next
    setData(next)

    const target = targetRef.current
    if (!target) {
      saveData(next) // Modo local: localStorage.
      return
    }
    // Modo nube: se envía la diferencia. Sin conexión queda en la cola de Firestore.
    writeChanges(target.db, target.householdId, prev, next).catch((error) => {
      console.error("Error saving to the cloud:", error)
      setSyncError(getErrorMessage(error))
    })
  }, [])

  /**
   * @function addTransaction
   * @description Añade una nueva transacción al estado de la aplicación y la guarda.
   *              Utiliza `useCallback` para memorizar la función y evitar recrearla en cada render.
   * @param {TransactionFormData} transaction - Los datos de la nueva transacción desde el formulario.
   */
  const addTransaction = useCallback((transaction: TransactionFormData) => {
    commit((prevData) => {
      // Crea un nuevo objeto de transacción con un ID y fecha de creación.
      const newTransaction: Transaction = {
        ...transaction,
        id: generateId(), // Genera un ID único.
        amount: roundMoney(transaction.amount), // Ningún importe entra con más de 2 decimales.
        createdAt: new Date().toISOString(), // Fecha de creación en formato ISO.
        nonComputable: transaction.nonComputable || false, // Asegura que siempre tenga un valor booleano
        paid: false, // Los gastos nuevos nacen sin pagar.
      }
      // Crea un nuevo estado de datos, añadiendo la nueva transacción al principio del array.
      const newData = {
        ...prevData,
        transactions: [newTransaction, ...prevData.transactions],
      }
      return newData // Devuelve el nuevo estado.
    })
  }, [commit]) // `commit` es estable: la función no cambia entre renders.

  /**
   * @function updateTransaction
   * @description Actualiza una transacción existente por su ID.
   * @param {string} id - El ID de la transacción a actualizar.
   * @param {Partial<Transaction>} updates - Un objeto con las propiedades a actualizar.
   */
  const updateTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
    commit((prevData) => {
      // NOTA: esta función no gestiona `paid`. Para marcar o desmarcar usa
      // `setTransactionsPaid`, que además aplica la regla de refechado.
      const safeUpdates =
        updates.amount === undefined ? updates : { ...updates, amount: roundMoney(updates.amount) }

      // Mapea las transacciones, actualizando la que coincide con el ID.
      const newData = {
        ...prevData,
        transactions: prevData.transactions.map((t) => (t.id === id ? { ...t, ...safeUpdates } : t)),
      }
      return newData
    })
  }, [commit])

  /**
   * @function setTransactionsPaid
   * @description Marca (o desmarca) como pagadas varias transacciones a la vez, en un solo guardado.
   *              Es el ÚNICO punto del código autorizado a escribir `paid`: lo usan tanto el
   *              toggle individual de la tabla como la reconciliación de cierre de mes.
   *
   *              EFECTO SOBRE `date`: al marcar como pagado, y SOLO en la transición
   *              `no pagado -> pagado`, la transacción se refecha con `resolvePaidDate`
   *              (hoy si es del mes en curso, el último día de su mes en cualquier otro caso).
   *              El MES nunca cambia.
   *
   *              Por qué solo en la transición: el modal de cierre premarca los gastos que ya
   *              estaban pagados, así que refechar siempre que `paid === true` sobrescribiría
   *              la fecha real de un gasto que el usuario ya marcó dentro de su mes (un pago
   *              del día 10 pasaría a día 31 sin que él hiciera nada). Además hace la
   *              operación idempotente.
   *
   *              Desmarcar NO toca la fecha: al volver a marcar será otra transición y se
   *              recalculará entonces.
   * @param {string[]} ids - IDs de las transacciones a actualizar.
   * @param {boolean} paid - Estado de pagado a aplicar.
   */
  const setTransactionsPaid = useCallback((ids: string[], paid: boolean) => {
    const idSet = new Set(ids)
    commit((prevData) => {
      // Un único "hoy" para todo el lote: un lote que cruce la medianoche no se parte en dos fechas.
      const today = new Date()

      const newData = {
        ...prevData,
        transactions: prevData.transactions.map((t) => {
          if (!idSet.has(t.id)) return t
          // `paid` solo tiene sentido en gastos; un ingreso jamás se refecha.
          if (t.type !== "expense") return t
          // Desmarcar: la fecha se queda como está.
          if (!paid) return t.paid ? { ...t, paid: false } : t
          // Ya estaba pagado: no se refecha (ver nota de arriba).
          if (t.paid) return t
          // Transición no pagado -> pagado: única rama que escribe `date`.
          return { ...t, paid: true, date: resolvePaidDate(t.date, today) }
        }),
      }
      return newData
    })
  }, [commit])

  /**
   * @function deleteTransaction
   * @description Elimina una transacción por su ID.
   * @param {string} id - El ID de la transacción a eliminar.
   */
  const deleteTransaction = useCallback((id: string) => {
    commit((prevData) => {
      // Filtra las transacciones, excluyendo la que coincide con el ID.
      const newData = {
        ...prevData,
        transactions: prevData.transactions.filter((t) => t.id !== id),
      }
      return newData
    })
  }, [commit])

  /**
   * @function updateConfig
   * @description Actualiza la configuración de la aplicación.
   * @param {AppConfig} config - El nuevo objeto de configuración.
   */
  const updateConfig = useCallback((config: AppConfig) => {
    commit((prevData) => {
      const newData = {
        ...prevData,
        config, // Actualiza el objeto de configuración.
      }
      return newData
    })
  }, [commit])

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
      commit((prevData) => {
        // 1. Crea nuevas transacciones de ajuste con IDs y fechas de creación.
        const newAdjustmentTransactions: Transaction[] = adjustmentsToCreate.map((adj) => ({
          ...adj,
          id: generateId(),
          amount: roundMoney(adj.amount), // El ajuste es un valor derivado: se persiste ya redondeado.
          createdAt: new Date().toISOString(),
        }))

        // 2. Combina las nuevas transacciones de ajuste con las transacciones existentes.
        //    Las nuevas se añaden al principio para que aparezcan primero si se ordenan por fecha de creación.
        const allTransactions = [...newAdjustmentTransactions, ...prevData.transactions]

        // 3. Obtiene TODAS las transacciones para el mes del informe de la lista *recién actualizada*.
        const finalReportTransactions = allTransactions.filter((t) => {
          const transactionDate = parseLocalDate(t.date)
          return (
            transactionDate.getMonth() + 1 === reportBaseData.month &&
            transactionDate.getFullYear() === reportBaseData.year
          )
        })

        // 4. RECALCULA los totales del informe basándose en `finalReportTransactions`.
        //    Esto asegura que los ajustes recién añadidos se incluyan en los totales del informe.
        const finalCalculations = calculateReportTotals(finalReportTransactions)

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
        }

        // 5. Construye el objeto de estado final y completo.
        const newData: AppData = {
          ...prevData,
          transactions: allTransactions, // Actualiza la lista global de transacciones.
          reports: finalReportsList, // Actualiza la lista global de informes.
        }

        // 6. Devuelve el estado nuevo (`commit` lo guarda).
        return newData
      })
    },
    [commit], // `commit` es estable: la función no cambia entre renders.
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
        const transactionDate = parseLocalDate(t.date)
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
  const replaceAllData = useCallback(
    (newData: AppData) => {
      commit(() => newData)
    },
    [commit],
  )

  // Devuelve el estado y las funciones para que los componentes puedan utilizarlos.
  return {
    data,
    isLoading,
    addTransaction,
    updateTransaction,
    setTransactionsPaid,
    deleteTransaction,
    updateConfig,
    createOrUpdateReport,
    getTransactionsForMonth,
    getExistingReport,
    replaceAllData,
    householdInfo,
    syncError,
  }
}
