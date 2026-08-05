/**
 * @file types/index.ts
 * @description Este archivo centraliza todas las definiciones de tipos e interfaces
 *              utilizadas en la aplicación. Esto mejora la consistencia y la legibilidad
 *              del código, permitiendo a TypeScript validar la estructura de los datos.
 */

/**
 * @interface Person
 * @description Define la estructura de una persona en la aplicación.
 * @property {'person1' | 'person2'} id - Identificador único para la persona.
 * @property {string} name - Nombre de la persona (ej. "Juan", "María").
 */
export interface Person {
  id: "person1" | "person2"
  name: string
}

/**
 * @interface Transaction
 * @description Define la estructura de una transacción financiera.
 * @property {string} id - Identificador único de la transacción.
 * @property {'income' | 'expense'} type - Tipo de transacción: 'income' (ingreso) o 'expense' (gasto).
 * @property {'fixed' | 'variable' | 'income'} category - Categoría de la transacción.
 *           Para gastos: 'fixed' (fijo) o 'variable'. Para ingresos: 'income'.
 * @property {string} name - Nombre o descripción de la transacción (ej. "Alquiler", "Salario").
 * @property {number} amount - Cantidad de dinero de la transacción.
 * @property {'person1' | 'person2' | 'both'} owner - Propietario de la transacción.
 *           Indica a quién se atribuye el ingreso/gasto.
 * @property {number} [person1Percentage] - Porcentaje de la transacción atribuido a la Persona 1 (opcional, solo si 'owner' es 'both').
 * @property {number} [person2Percentage] - Porcentaje de la transacción atribuido a la Persona 2 (opcional, solo si 'owner' es 'both').
 * @property {string} date - Fecha de la transacción en formato ISO 8601 (YYYY-MM-DD).
 * @property {string} createdAt - Marca de tiempo de creación de la transacción en formato ISO 8601.
 */
export interface Transaction {
  id: string
  type: "income" | "expense"
  category: "fixed" | "variable" | "income"
  name: string
  amount: number
  owner: "person1" | "person2" | "both"
  person1Percentage?: number
  person2Percentage?: number
  date: string
  createdAt: string
  nonComputable: boolean
  /** Indica si el gasto ya se ha pagado/ejecutado este mes. Es visual; no afecta a ningún cálculo. */
  paid?: boolean
}

/**
 * @interface MonthlyReport
 * @description Define la estructura de un informe mensual generado.
 * @property {string} id - Identificador único del informe.
 * @property {number} month - Mes del informe (1-12).
 * @property {number} year - Año del informe.
 * @property {number} person1RealMoney - Cantidad de dinero real que la Persona 1 tiene al final del mes.
 * @property {number} person2RealMoney - Cantidad de dinero real que la Persona 2 tiene al final del mes.
 * @property {number} person1Adjustment - Ajuste calculado para la Persona 1 (dinero real - balance calculado).
 * @property {number} person2Adjustment - Ajuste calculado para la Persona 2 (dinero real - balance calculado).
 * @property {number} totalIncome - Ingresos totales del mes (calculado).
 * @property {number} totalExpenses - Gastos totales del mes (calculado).
 * @property {number} person1Income - Ingresos de la Persona 1 (calculado).
 * @property {number} person2Income - Ingresos de la Persona 2 (calculado).
 * @property {number} person1Expenses - Gastos de la Persona 1 (calculado).
 * @property {number} person2Expenses - Gastos de la Persona 2 (calculado).
 * @property {Transaction[]} transactions - Array de transacciones incluidas en este informe mensual.
 * @property {string} createdAt - Marca de tiempo de creación del informe en formato ISO 8601.
 */
export interface MonthlyReport {
  id: string
  month: number
  year: number
  person1RealMoney: number
  person2RealMoney: number
  person1Adjustment: number
  person2Adjustment: number
  totalIncome: number
  totalExpenses: number
  person1Income: number
  person2Income: number
  person1Expenses: number
  person2Expenses: number
  transactions: Transaction[]
  createdAt: string
}

/**
 * @interface AppConfig
 * @description Define la estructura de la configuración global de la aplicación.
 * @property {string} person1Name - Nombre personalizado para la Persona 1.
 * @property {string} person2Name - Nombre personalizado para la Persona 2.
 */
export interface AppConfig {
  person1Name: string
  person2Name: string
}

/**
 * @interface AppData
 * @description Define la estructura completa de los datos de la aplicación que se guardan/cargan.
 * @property {Transaction[]} transactions - Array de todas las transacciones.
 * @property {MonthlyReport[]} reports - Array de todos los informes mensuales.
 * @property {AppConfig} config - Objeto de configuración de la aplicación.
 */
export interface AppData {
  transactions: Transaction[]
  reports: MonthlyReport[]
  config: AppConfig
}

/**
 * @interface TransactionFormData
 * @description Define la estructura de los datos del formulario de transacción.
 *              Es similar a `Transaction` pero sin `id` ni `createdAt`, ya que se generan al guardar.
 * @property {'income' | 'expense'} type - Tipo de transacción.
 * @property {'fixed' | 'variable' | 'income'} category - Categoría de la transacción.
 * @property {string} name - Nombre de la transacción.
 * @property {number} amount - Cantidad de dinero.
 * @property {'person1' | 'person2' | 'both'} owner - Propietario de la transacción.
 * @property {number} person1Percentage - Porcentaje de la Persona 1.
 * @property {number} person2Percentage - Porcentaje de la Persona 2.
 * @property {string} date - Fecha de la transacción.
 * @property {boolean} [nonComputable] - Indica si el gasto no debe afectar al balance global.
 */
export interface TransactionFormData {
  type: "income" | "expense"
  category: "fixed" | "variable" | "income"
  name: string
  amount: number
  owner: "person1" | "person2" | "both"
  person1Percentage: number
  person2Percentage: number
  date: string
  nonComputable?: boolean
}

/**
 * @function generateId
 * @description Genera un identificador único aleatorio para transacciones o informes.
 * @returns {string} Un string alfanumérico corto.
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}
