/**
 * @file lib/sample-data.ts
 * @description Este archivo contiene una función para generar datos de transacciones de ejemplo.
 *              Estos datos son útiles para probar la aplicación sin tener que introducir
 *              transacciones manualmente, y cubren un período de 12 meses.
 */

import { type Transaction, generateId } from "@/types" // Importa el tipo Transaction y la función generateId.

/**
 * @function generateSampleData
 * @description Genera un array de transacciones de ejemplo para los últimos 12 meses.
 *              Incluye ingresos, gastos fijos y gastos variables con montos y propietarios aleatorios.
 * @returns {Transaction[]} Un array de objetos de transacción.
 */
export function generateSampleData(): Transaction[] {
  const transactions: Transaction[] = []
  const currentYear = new Date().getFullYear() // Obtiene el año actual.

  // Definición de transacciones de ingresos de ejemplo.
  const incomeTransactions = [
    { name: "Salario Persona 1", amount: 2500, owner: "person1" as const },
    { name: "Salario Persona 2", amount: 2200, owner: "person2" as const },
    { name: "Freelance", amount: 800, owner: "person1" as const },
    { name: "Venta online", amount: 150, owner: "both" as const },
  ]

  // Definición de gastos fijos de ejemplo.
  const fixedExpenses = [
    { name: "Alquiler", amount: 900, owner: "both" as const },
    { name: "Electricidad", amount: 80, owner: "both" as const },
    { name: "Internet", amount: 45, owner: "person1" as const },
    { name: "Seguro coche", amount: 120, owner: "person2" as const },
    { name: "Gimnasio P1", amount: 35, owner: "person1" as const },
    { name: "Gimnasio P2", amount: 40, owner: "person2" as const },
    { name: "Netflix", amount: 12, owner: "both" as const },
    { name: "Spotify", amount: 10, owner: "person1" as const },
  ]

  // Definición de gastos variables de ejemplo.
  const variableExpenses = [
    { name: "Supermercado", amount: 120, owner: "both" as const },
    { name: "Gasolina", amount: 60, owner: "person2" as const },
    { name: "Restaurante", amount: 45, owner: "both" as const },
    { name: "Farmacia", amount: 25, owner: "person1" as const },
    { name: "Ropa", amount: 80, owner: "person2" as const },
    { name: "Ocio", amount: 35, owner: "both" as const },
    { name: "Transporte", amount: 15, owner: "person1" as const },
  ]

  // Genera transacciones para los últimos 12 meses.
  for (let monthOffset = 11; monthOffset >= 0; monthOffset--) {
    const date = new Date()
    date.setMonth(date.getMonth() - monthOffset) // Ajusta la fecha al mes actual menos el offset.
    const month = date.getMonth() + 1 // Obtiene el número del mes (1-12).
    const year = date.getFullYear() // Obtiene el año.

    // Añade transacciones de ingresos (una vez al mes).
    incomeTransactions.forEach((income) => {
      // Genera una fecha aleatoria dentro del mes.
      const transactionDate = new Date(year, month - 1, Math.floor(Math.random() * 28) + 1)
      // Genera un monto aleatorio con pequeñas variaciones y lo redondea a 2 decimales.
      const randomAmount = Number.parseFloat((income.amount + (Math.random() - 0.5) * 200).toFixed(2))

      // Define los porcentajes de distribución para Persona 1 y Persona 2.
      // Para ingresos fijos o 50/50, los porcentajes son enteros.
      const p1Perc = income.owner === "both" ? 50 : income.owner === "person1" ? 100 : 0
      const p2Perc = income.owner === "both" ? 50 : income.owner === "person2" ? 100 : 0

      transactions.push({
        id: generateId(), // Genera un ID único.
        type: "income",
        category: "income",
        name: income.name,
        amount: randomAmount,
        owner: income.owner,
        person1Percentage: p1Perc,
        person2Percentage: p2Perc,
        date: transactionDate.toISOString().split("T")[0], // Formato YYYY-MM-DD.
        createdAt: transactionDate.toISOString(), // Fecha de creación.
      })
    })

    // Añade gastos fijos (una vez al mes).
    fixedExpenses.forEach((expense) => {
      const transactionDate = new Date(year, month - 1, Math.floor(Math.random() * 28) + 1)
      const randomAmount = Number.parseFloat((expense.amount + (Math.random() - 0.5) * 20).toFixed(2))

      const p1Perc = expense.owner === "both" ? 50 : expense.owner === "person1" ? 100 : 0
      const p2Perc = expense.owner === "both" ? 50 : expense.owner === "person2" ? 100 : 0

      transactions.push({
        id: generateId(),
        type: "expense",
        category: "fixed",
        name: expense.name,
        amount: randomAmount,
        owner: expense.owner,
        person1Percentage: p1Perc,
        person2Percentage: p2Perc,
        date: transactionDate.toISOString().split("T")[0],
        createdAt: transactionDate.toISOString(),
      })
    })

    // Añade gastos variables (2-4 veces por mes).
    const variableCount = Math.floor(Math.random() * 3) + 2 // Genera entre 2 y 4 gastos variables.
    for (let i = 0; i < variableCount; i++) {
      variableExpenses.forEach((expense) => {
        if (Math.random() > 0.3) {
          // 70% de probabilidad de incluir cada gasto variable.
          const transactionDate = new Date(year, month - 1, Math.floor(Math.random() * 28) + 1)
          const randomAmount = Number.parseFloat((expense.amount + (Math.random() - 0.5) * 40).toFixed(2))

          let p1Perc: number
          let p2Perc: number

          if (expense.owner === "both") {
            // Para gastos variables compartidos, los porcentajes pueden variar.
            p1Perc = Math.round(50 + (Math.random() - 0.5) * 40) // Genera un valor entre 30 y 70, redondeado.
            p1Perc = Math.max(0, Math.min(100, p1Perc)) // Asegura que esté entre 0 y 100.
            p2Perc = 100 - p1Perc // El porcentaje de la Persona 2 es el complemento.
          } else if (expense.owner === "person1") {
            p1Perc = 100
            p2Perc = 0
          } else {
            // person2
            p1Perc = 0
            p2Perc = 100
          }

          transactions.push({
            id: generateId(),
            type: "expense",
            category: "variable",
            name: expense.name,
            amount: randomAmount,
            owner: expense.owner,
            person1Percentage: p1Perc,
            person2Percentage: p2Perc,
            date: transactionDate.toISOString().split("T")[0],
            createdAt: transactionDate.toISOString(),
          })
        }
      })
    }
  }

  // Ordena todas las transacciones generadas por fecha de forma descendente (más recientes primero).
  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}
