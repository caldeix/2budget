/**
 * @file lib/demo-data.ts
 * @description Datos del emulador (3.18.0): una pareja inventada con 6 meses de movimientos para probar
 *              la app sin crear cuenta. Los 5 meses anteriores están cerrados con su informe y sus
 *              ajustes; el actual, abierto, con gastos pagados y pendientes. Los dos últimos meses usan
 *              la cuenta compartida. Además: un viaje con etiqueta («Lisboa»), presupuestos, metas y una
 *              cena de más este mes para que salga una tendencia. Así todas las tarjetas tienen algo.
 *
 *              Las fechas van relativas a hoy, para que nunca se queden viejas. Viven solo en memoria
 *              (ver `useFinancialData`): nunca se guardan. Se pasan por la misma comprobación y
 *              normalización que un archivo importado (`parseImportedData`).
 */

import type { AppConfig, AppData, Goal, MonthlyReport, Transaction } from "@/types"
import { DATA_VERSION, parseImportedData } from "@/lib/storage"
import { calculateReportTotals, formatMonthYear, getLastDateOfMonth } from "@/lib/utils"
import { addMoney, subtractMoney } from "@/lib/money"

export const DEMO_PERSON1 = "Lucía"
export const DEMO_PERSON2 = "Marcos"

type Owner = Transaction["owner"]

/** [día, tipo, categoría, nombre, importe, dueño, % de la persona 1, id de categoría, no computable] */
type Row = [number, Transaction["type"], Transaction["category"], string, number, Owner, number, string | undefined, boolean?]

const MONTHLY: Row[] = [
  [1, "income", "income", `Nómina ${DEMO_PERSON1}`, 2100, "person1", 100, "nomina"],
  [1, "income", "income", `Nómina ${DEMO_PERSON2}`, 1850, "person2", 0, "nomina"],
  [1, "expense", "fixed", "Alquiler", 950, "both", 50, "casa"],
  [2, "expense", "fixed", "Luz", 64.3, "both", 50, "suministros"],
  [3, "expense", "fixed", "Internet y móvil", 45.9, "both", 50, "suministros"],
  [4, "expense", "fixed", "Gimnasio", 35, "person2", 0, "salud"],
  [5, "expense", "fixed", "Seguro coche", 48.2, "person1", 100, "transporte"],
  [6, "expense", "variable", "Mercadona", 112.45, "both", 50, "supermercado"],
  [8, "expense", "variable", "Gasolina", 60, "both", 70, "transporte"],
  [10, "expense", "variable", "Cena con amigos", 72.5, "both", 50, "ocio"],
  [12, "expense", "variable", "Lidl", 54.2, "both", 50, "supermercado"],
  [14, "expense", "variable", "Ahorro vacaciones", 100, "both", 50, "ahorro", true],
  [15, "expense", "variable", "Farmacia", 18.6, "person1", 100, "salud"],
  [18, "expense", "variable", "Ropa", 89.99, "person2", 0, "ropa"],
  [20, "expense", "variable", "Regalo cumpleaños", 45, "both", 50, "regalos", true],
  [22, "expense", "variable", "Carrefour", 96.3, "both", 50, "supermercado"],
  [25, "expense", "variable", "Cine", 24, "both", 50, "ocio"],
  [27, "expense", "variable", "Peluquería", 30, "person2", 0, undefined],
]

/** Viaje de hace dos meses: gastos de los dos y alguno de uno solo, con la misma etiqueta. */
const TRIP_TAG = "Lisboa"
const TRIP: Row[] = [
  [16, "expense", "variable", "Hotel en Lisboa", 240, "both", 50, "viajes"],
  [17, "expense", "variable", "Cena en Alfama", 68.4, "both", 50, "ocio"],
  [18, "expense", "variable", "Desayuno (invito yo)", 14.5, "person1", 100, "ocio"],
]

/** Este mes, una cena de más: la tendencia de «Restaurantes y ocio» sale hacia arriba. */
const CURRENT_EXTRA: Row = [2, "expense", "variable", "Cena de aniversario", 95, "both", 50, "ocio"]

/** Aportaciones a la compartida (los dos últimos meses) y lo que no cuadra al cerrarla. */
const CONTRIBUTIONS: [Owner, string, number][] = [
  ["person1", DEMO_PERSON1, 1100],
  ["person2", DEMO_PERSON2, 1000],
]
const SHARED_ADJUSTMENT = -2.5
/** Lo que difiere el dinero real de lo calculado en cada cierre (del más reciente al más antiguo). */
const ADJUSTMENTS_1 = [12.4, -8.15, 5.3, -20, 3.75]
const ADJUSTMENTS_2 = [-5.3, 3.2, -1.1, 9.8, 0]

const pad = (n: number) => String(n).padStart(2, "0")
const round = (n: number) => Math.round(n * 100) / 100

function dateIn(month: number, year: number, day: number): string {
  const last = Number(getLastDateOfMonth(month, year).slice(-2))
  return `${year}-${pad(month)}-${pad(Math.min(day, last))}`
}

/**
 * @function createDemoData
 * @description Los datos del emulador para la fecha dada.
 */
export function createDemoData(now: Date): AppData {
  let seq = 0
  const nextId = () => `demo-${++seq}`
  const transactions: Transaction[] = []
  const reports: MonthlyReport[] = []

  const make = (row: Row, month: number, year: number, closed: boolean, index: number, offset: number): Transaction => {
    const [day, type, category, name, baseAmount, owner, p1, categoryId, nonComputable] = row
    const person1Percentage = owner === "person1" ? 100 : owner === "person2" ? 0 : p1
    // Pequeña variación mes a mes en los gastos variables, para que no sean todos iguales.
    const amount = type === "expense" && category === "variable" ? round(baseAmount * (1 + ((offset * 7 + index) % 5) / 25)) : baseAmount
    return {
      id: nextId(),
      type,
      category,
      name,
      amount,
      owner,
      person1Percentage,
      person2Percentage: 100 - person1Percentage,
      date: dateIn(month, year, day),
      createdAt: new Date(year, month - 1, day, 12).toISOString(),
      nonComputable: Boolean(nonComputable),
      categoryId,
      // Mes cerrado: todo pagado. Mes actual: lo de hasta hoy, menos algún pendiente.
      paid: type === "expense" && (closed || (day <= now.getDate() && index % 4 !== 2)),
    }
  }

  for (let offset = 5; offset >= 0; offset--) {
    const first = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    const month = first.getMonth() + 1
    const year = first.getFullYear()
    const closed = offset > 0
    const rows = [...MONTHLY, ...(offset === 2 ? TRIP : []), ...(offset === 0 ? [CURRENT_EXTRA] : [])]
    const monthTransactions = rows.map((row, index) => {
      const t = make(row, month, year, closed, index, offset)
      return offset === 2 && TRIP.includes(row) ? { ...t, tag: TRIP_TAG } : t
    })

    // Cuenta compartida en los dos últimos meses (en el actual, la aportación de Marcos sin enviar).
    const usesShared = offset <= 1
    if (usesShared) {
      for (const [owner, name, amount] of CONTRIBUTIONS) {
        monthTransactions.unshift({
          id: nextId(),
          type: "contribution",
          category: "contribution",
          name: `Aportación ${name}`,
          amount,
          owner,
          person1Percentage: owner === "person1" ? 100 : 0,
          person2Percentage: owner === "person1" ? 0 : 100,
          date: dateIn(month, year, 1),
          createdAt: new Date(year, month - 1, 1, 10).toISOString(),
          nonComputable: false,
          paid: closed || owner === "person1",
        })
      }
    }

    if (closed) {
      const totals = calculateReportTotals(monthTransactions)
      let balance1 = subtractMoney(totals.person1Income, totals.person1Expenses)
      let balance2 = subtractMoney(totals.person2Income, totals.person2Expenses)
      // Con compartida, el dinero real de cada uno es su cuenta: su balance menos lo que puso en la
      // compartida más su parte de lo compartido. La compartida se cierra por su saldo.
      let shared: { real: number; adjustment: number } | null = null
      if (usesShared) {
        const both = monthTransactions.filter((t) => t.owner === "both")
        const bothTotals = calculateReportTotals(both)
        const bothComputable = calculateReportTotals(both.filter((t) => !t.nonComputable))
        const sent = (owner: Owner) =>
          addMoney(...monthTransactions.filter((t) => t.type === "contribution" && t.owner === owner).map((t) => t.amount))
        balance1 = round(balance1 - (sent("person1") - bothTotals.person1Expenses))
        balance2 = round(balance2 - (sent("person2") - bothTotals.person2Expenses))
        const expected = round(sent("person1") + sent("person2") - bothComputable.totalExpenses)
        shared = { real: round(expected + SHARED_ADJUSTMENT), adjustment: SHARED_ADJUSTMENT }
      }

      const adjustment1 = ADJUSTMENTS_1[offset - 1]
      const adjustment2 = ADJUSTMENTS_2[offset - 1]
      const lastDay = getLastDateOfMonth(month, year)
      const closedAt = new Date(year, month, 1, 9).toISOString()
      const adjustments: [Owner, string, number][] = [
        ["person1", DEMO_PERSON1, adjustment1],
        ["person2", DEMO_PERSON2, adjustment2],
        ...(shared ? [["both", "Compartida", shared.adjustment] as [Owner, string, number]] : []),
      ]
      for (const [owner, name, amount] of adjustments) {
        if (amount === 0) continue
        monthTransactions.push({
          id: nextId(),
          type: amount > 0 ? "income" : "expense",
          category: amount > 0 ? "income" : "variable",
          name: `Ajuste ${name} - Cierre ${formatMonthYear(month, year)}`,
          amount: Math.abs(amount),
          owner,
          person1Percentage: owner === "person2" ? 0 : owner === "person1" ? 100 : 50,
          person2Percentage: owner === "person2" ? 100 : owner === "person1" ? 0 : 50,
          date: lastDay,
          createdAt: closedAt,
          nonComputable: false,
          paid: true,
          closingAdjustment: true,
        })
      }

      reports.push({
        id: `demo-report-${year}-${pad(month)}`,
        month,
        year,
        person1RealMoney: round(balance1 + adjustment1),
        person2RealMoney: round(balance2 + adjustment2),
        person1Adjustment: adjustment1,
        person2Adjustment: adjustment2,
        ...(shared && { sharedRealMoney: shared.real, sharedAdjustment: shared.adjustment }),
        ...calculateReportTotals(monthTransactions),
        transactions: monthTransactions,
        createdAt: closedAt,
      })
    }
    transactions.push(...monthTransactions)
  }

  const config: AppConfig = {
    person1Name: DEMO_PERSON1,
    person2Name: DEMO_PERSON2,
    budgetsByOwner: {
      person1: { salud: 30, transporte: 60 },
      person2: { ropa: 80, salud: 40 },
      shared: { supermercado: 300, ocio: 150, transporte: 80, suministros: 120 },
    },
  }
  const ago = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString()
  const goals: Goal[] = [
    { id: "demo-goal-1", name: "Viaje a Japón", owner: "shared", allocated: 300, target: 3000, lastFundedAt: ago(20), createdAt: ago(60) },
    { id: "demo-goal-2", name: "Fondo de imprevistos", owner: "person1", allocated: 450, target: 2000, lastFundedAt: ago(35), createdAt: ago(120) },
    { id: "demo-goal-3", name: "Bici nueva", owner: "person2", allocated: 180, target: 600, lastFundedAt: ago(30), createdAt: ago(90) },
  ]

  const raw: AppData = { transactions, reports, config, goals, version: DATA_VERSION }
  // La misma comprobación y normalización que un archivo importado: si algo no encajara, fallaría aquí.
  const parsed = parseImportedData(JSON.stringify(raw))
  if (!parsed.ok) throw new Error(`Datos del emulador no válidos: ${parsed.error}`)
  return parsed.data
}
