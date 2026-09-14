/**
 * @file lib/storage.ts
 * @description Este archivo contiene funciones para interactuar con el almacenamiento local (localStorage)
 *              del navegador. Es responsable de cargar, guardar, exportar, importar y borrar
 *              todos los datos de la aplicación (transacciones, informes, configuración).
 *              Utiliza JSON para serializar y deserializar los datos.
 */

import type { AppData, AppConfig, MonthlyReport, Transaction } from "@/types"
import { normalizePercentage, roundMoney } from "@/lib/money" // Normalización monetaria.

/**
 * @constant {string} STORAGE_KEY
 * @description Clave utilizada para almacenar los datos de la aplicación en localStorage.
 */
const STORAGE_KEY = "financial-manager-data"

/**
 * Versión del esquema de datos persistido.
 * v2 = todos los importes redondeados a 2 decimales y porcentajes coherentes.
 *
 * La versión es solo una marca de "ya reescrito", NO un requisito de corrección: la
 * normalización en lectura se aplica siempre y es idempotente, así que un JSON antiguo
 * importado mañana queda igual de protegido. Solo evita el guardado redundante en cada arranque.
 */
const DATA_VERSION = 2

/**
 * @constant {AppConfig} defaultConfig
 * @description Configuración por defecto de la aplicación si no se encuentra ninguna en localStorage.
 */
const defaultConfig: AppConfig = {
  person1Name: "Persona 1",
  person2Name: "Persona 2",
}

/**
 * @constant {AppData} defaultData
 * @description Estructura de datos por defecto de la aplicación si no se encuentra ninguna en localStorage.
 */
const defaultData: AppData = {
  transactions: [],
  reports: [],
  config: defaultConfig,
}

/**
 * @function normalizeTransaction
 * @description Rellena campos que pueden faltar en transacciones antiguas o importadas,
 *              garantizando un valor por defecto consistente (evita discrepancias tipo/runtime).
 * @param {Transaction} t - La transacción a normalizar.
 * @returns {Transaction} La transacción con los campos garantizados.
 */
function normalizeTransaction(t: Transaction): Transaction {
  // El porcentaje de la Persona 2 se deriva del de la Persona 1 para que un dato
  // incoherente (p. ej. 30/60) no rompa el cuadre de los repartos.
  const person1Percentage = normalizePercentage(t.person1Percentage ?? 50)
  return {
    ...t,
    amount: roundMoney(t.amount),
    person1Percentage,
    person2Percentage: 100 - person1Percentage,
    nonComputable: Boolean(t.nonComputable),
    paid: Boolean(t.paid),
  }
}

/**
 * @function normalizeReport
 * @description Normaliza los importes de un informe archivado. Se redondea campo a campo y
 *              NO se recalcula desde sus transacciones: un informe es el documento de lo que
 *              se cerró en su día, y recalcularlo podría mover cifras históricas de forma no
 *              acotada si los datos antiguos eran incoherentes. El redondeo campo a campo
 *              nunca mueve un valor más de medio céntimo.
 * @param {MonthlyReport} r - El informe a normalizar.
 * @returns {MonthlyReport} El informe con todos sus importes a 2 decimales.
 */
function normalizeReport(r: MonthlyReport): MonthlyReport {
  return {
    ...r,
    person1RealMoney: roundMoney(r.person1RealMoney),
    person2RealMoney: roundMoney(r.person2RealMoney),
    person1Adjustment: roundMoney(r.person1Adjustment),
    person2Adjustment: roundMoney(r.person2Adjustment),
    totalIncome: roundMoney(r.totalIncome),
    totalExpenses: roundMoney(r.totalExpenses),
    person1Income: roundMoney(r.person1Income),
    person2Income: roundMoney(r.person2Income),
    person1Expenses: roundMoney(r.person1Expenses),
    person2Expenses: roundMoney(r.person2Expenses),
    transactions: Array.isArray(r.transactions) ? r.transactions.map(normalizeTransaction) : [],
  }
}

/**
 * @function loadData
 * @description Carga los datos de la aplicación desde localStorage.
 *              Si no hay datos guardados o hay un error, devuelve los datos por defecto.
 *              Realiza una fusión superficial para asegurar que la estructura de datos sea completa.
 * @returns {AppData} Los datos de la aplicación cargados o los valores por defecto.
 */
export function loadData(): AppData {
  // Comprueba si el código se está ejecutando en el lado del cliente (en el navegador).
  // `localStorage` solo está disponible en el navegador.
  if (typeof window === "undefined") return defaultData

  try {
    // Intenta obtener los datos del localStorage usando la clave definida.
    const stored = localStorage.getItem(STORAGE_KEY)
    // Si no hay datos almacenados, devuelve los datos por defecto.
    if (!stored) return defaultData

    // Parsea la cadena JSON almacenada a un objeto AppData.
    const data = JSON.parse(stored) as AppData
    /**
     * Realiza una fusión de los datos cargados con los datos por defecto.
     * Esto asegura que si se añaden nuevas propiedades a la estructura de `AppData`
     * en futuras versiones, los datos antiguos sigan siendo compatibles y tengan valores por defecto.
     * La configuración también se fusiona para mantener los nombres personalizados.
     */
    const normalized: AppData = {
      ...defaultData, // Empieza con la estructura por defecto
      ...data, // Sobrescribe con los datos cargados
      version: DATA_VERSION,
      // Normaliza cada transacción para garantizar campos por defecto en datos antiguos.
      transactions: Array.isArray(data.transactions) ? data.transactions.map(normalizeTransaction) : [],
      reports: Array.isArray(data.reports) ? data.reports.map(normalizeReport) : [],
      config: { ...defaultConfig, ...data.config }, // Fusiona la configuración
    }

    // Migración de un solo disparo: deja el localStorage ya limpio y evita repetir la
    // reescritura en cada arranque. La app es correcta aunque esto no llegue a ejecutarse,
    // porque la normalización en lectura de arriba se aplica siempre.
    if (data.version !== DATA_VERSION) {
      saveData(normalized)
    }

    return normalized
  } catch (error) {
    // Si ocurre un error al cargar o parsear los datos (ej. JSON corrupto),
    // se registra el error y se devuelven los datos por defecto para evitar que la aplicación falle.
    console.error("Error loading data:", error)
    return defaultData
  }
}

/**
 * @function saveData
 * @description Guarda los datos de la aplicación en localStorage.
 *              Los datos se serializan a una cadena JSON antes de guardarse.
 * @param {AppData} data - El objeto `AppData` que se va a guardar.
 * @returns {void}
 */
export function saveData(data: AppData): void {
  // Asegura que la función solo se ejecute en el lado del cliente.
  if (typeof window === "undefined") return

  try {
    // Serializa el objeto `AppData` a una cadena JSON y lo guarda en localStorage.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    // Registra cualquier error que ocurra durante el proceso de guardado.
    console.error("Error saving data:", error)
  }
}

/**
 * @function exportData
 * @description Exporta todos los datos de la aplicación como una cadena JSON formateada.
 *              Útil para copias de seguridad o transferir datos.
 * @returns {string} Una cadena JSON que representa los datos de la aplicación.
 */
export function exportData(): string {
  // Carga los datos actuales y los convierte a una cadena JSON con formato legible (2 espacios de indentación).
  const data = loadData()
  return JSON.stringify(data, null, 2)
}

/**
 * @function importData
 * @description Importa datos a la aplicación desde una cadena JSON.
 *              Realiza una validación básica de la estructura del JSON y fusiona los datos.
 * @param {string} jsonString - La cadena JSON que contiene los datos a importar.
 * @returns {boolean} `true` si la importación fue exitosa, `false` en caso contrario.
 */
export function importData(jsonString: string): boolean {
  try {
    // Intenta parsear la cadena JSON.
    const raw = JSON.parse(jsonString)

    // Validación básica: asegura que el JSON es un objeto y no nulo.
    if (typeof raw !== "object" || raw === null) {
      throw new Error("El archivo no contiene un objeto JSON válido")
    }

    /**
     * Hidratación/Fallback: Construye el objeto `AppData` importado.
     * Si alguna propiedad esperada (ej. `transactions`, `reports`, `config`) no está presente
     * o no tiene el tipo correcto en el JSON importado, se usan arrays vacíos o la configuración por defecto.
     * Esto previene errores si el archivo importado está incompleto o mal formado.
     */
    const imported: AppData = {
      version: DATA_VERSION,
      transactions: Array.isArray(raw.transactions) ? raw.transactions.map(normalizeTransaction) : [],
      // Los informes importados también se normalizan: pueden traer importes sin redondear.
      reports: Array.isArray(raw.reports) ? raw.reports.map(normalizeReport) : [],
      config: {
        ...defaultConfig, // Empieza con la configuración por defecto
        ...(typeof raw.config === "object" && raw.config !== null ? raw.config : {}), // Fusiona la configuración importada
      },
    }

    // Guarda los datos importados en localStorage.
    saveData(imported)
    return true // Indica que la importación fue exitosa.
  } catch (error) {
    // Si ocurre un error (ej. JSON inválido), registra el error y devuelve `false`.
    console.error("Error importing data:", error)
    return false // Indica que la importación falló.
  }
}

/**
 * @function clearAllData
 * @description Elimina todos los datos de la aplicación de localStorage.
 *              Esta acción es irreversible.
 * @returns {void}
 */
export function clearAllData(): void {
  // Asegura que la función solo se ejecute en el lado del cliente.
  if (typeof window === "undefined") return
  // Elimina el elemento con la clave `STORAGE_KEY` de localStorage.
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * @constant {string} LAST_SEEN_MONTH_KEY
 * @description Clave de localStorage con el último mes real ("YYYY-MM") en que se abrió la app.
 *              Sirve para detectar el cambio de mes de calendario y disparar la reconciliación de pagados.
 */
const LAST_SEEN_MONTH_KEY = "2budget:last-seen-month"

/**
 * @function getLastSeenMonth
 * @description Devuelve el último mes visto ("YYYY-MM") o `null` si no hay registro.
 * @returns {string | null}
 */
export function getLastSeenMonth(): string | null {
  if (typeof window === "undefined") return null
  try {
    return localStorage.getItem(LAST_SEEN_MONTH_KEY)
  } catch (error) {
    console.error("Error reading last seen month:", error)
    return null
  }
}

/**
 * @function setLastSeenMonth
 * @description Guarda el último mes visto ("YYYY-MM").
 * @param {string} monthKey - Clave de mes en formato "YYYY-MM".
 * @returns {void}
 */
export function setLastSeenMonth(monthKey: string): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(LAST_SEEN_MONTH_KEY, monthKey)
  } catch (error) {
    console.error("Error saving last seen month:", error)
  }
}
