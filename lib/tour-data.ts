/**
 * @file lib/tour-data.ts
 * @description Datos ficticios del tour de bienvenida: siempre los mismos movimientos, fechados
 *              en el mes actual y en los dos anteriores (cerrados con su informe), para que todas
 *              las partes de la app tengan algo que enseñar. Solo viven en memoria mientras dura
 *              el tour: nunca se guardan (ver `useFinancialData`).
 *              En pareja, el mes actual lleva además las aportaciones a la cuenta compartida (ya
 *              enviadas: con una pendiente, la compartida de "Hoy" saldría en negativo y confundiría).
 *              Los meses cerrados no las llevan: sus informes son los de siempre.
 */

import type { AppConfig, AppData, MonthlyReport, Transaction } from "@/types"
import { DATA_VERSION } from "@/lib/storage"
import { calculateReportTotals, formatMonthYear, getLastDateOfMonth } from "@/lib/utils"
import { addMoney, subtractMoney } from "@/lib/money"

type Owner = Transaction["owner"]

/** Un movimiento de ejemplo: día del mes, nombre, importe y a quién pertenece. */
interface Sample {
  day: number
  type: Transaction["type"]
  category: Transaction["category"]
  name: string
  amount: number
  owner: Owner
  /** Gasto ya pagado o aportación ya enviada (en los meses cerrados, todos lo están). */
  paid?: boolean
  /** Solo en el mes actual (las aportaciones: ver la cabecera). */
  currentMonthOnly?: boolean
  nonComputable?: boolean
  categoryId?: string
}

const SAMPLES: Sample[] = [
  { day: 1, type: "contribution", category: "contribution", name: "Aportación", amount: 1100, owner: "person1", paid: true, currentMonthOnly: true },
  { day: 1, type: "contribution", category: "contribution", name: "Aportación", amount: 1000, owner: "person2", paid: true, currentMonthOnly: true },
  { day: 1, type: "income", category: "income", name: "Nómina", amount: 2100, owner: "person1", categoryId: "nomina" },
  { day: 1, type: "income", category: "income", name: "Nómina", amount: 1850, owner: "person2", categoryId: "nomina" },
  { day: 1, type: "expense", category: "fixed", name: "Alquiler", amount: 950, owner: "both", paid: true, categoryId: "casa" },
  { day: 3, type: "expense", category: "fixed", name: "Internet y móvil", amount: 45.9, owner: "both", paid: true, categoryId: "suministros" },
  { day: 4, type: "expense", category: "variable", name: "Supermercado", amount: 124.35, owner: "both", paid: true, categoryId: "supermercado" },
  { day: 6, type: "expense", category: "variable", name: "Gasolina", amount: 60, owner: "person1", paid: true, categoryId: "transporte" },
  { day: 8, type: "expense", category: "fixed", name: "Luz", amount: 68.4, owner: "both", categoryId: "suministros" },
  { day: 10, type: "expense", category: "variable", name: "Cena con amigos", amount: 72.5, owner: "both", categoryId: "ocio" },
  { day: 12, type: "expense", category: "fixed", name: "Gimnasio", amount: 35, owner: "person2", categoryId: "salud" },
  { day: 14, type: "expense", category: "variable", name: "Ahorro vacaciones", amount: 100, owner: "both", nonComputable: true, paid: true, categoryId: "ahorro" },
]

/** Fecha `YYYY-MM-DD` de un día del mes (sin pasarse del último). */
function dateIn(month: number, year: number, day: number): string {
  const last = Number(getLastDateOfMonth(month, year).slice(-2))
  return `${year}-${String(month).padStart(2, "0")}-${String(Math.min(day, last)).padStart(2, "0")}`
}

/** Mes y año `offset` meses antes del dado. */
function monthsBefore(month: number, year: number, offset: number): { month: number; year: number } {
  const d = new Date(year, month - 1 - offset, 1)
  return { month: d.getMonth() + 1, year: d.getFullYear() }
}

/**
 * @function createTourData
 * @description Construye los datos del tour para la fecha dada, con los nombres y el modo de la
 *              configuración real (en modo individual, todo es de la Persona 1).
 */
export function createTourData(now: Date, config: AppConfig): AppData {
  const single = Boolean(config.singleMode)
  const current = { month: now.getMonth() + 1, year: now.getFullYear() }
  const transactions: Transaction[] = []
  const reports: MonthlyReport[] = []
  let seq = 0

  const make = (s: Sample, month: number, year: number, closed: boolean): Transaction | null => {
    if (single && s.owner === "person2") return null
    // En modo individual no hay cuenta compartida; en pareja, las aportaciones solo en el mes actual.
    if (s.type === "contribution" && (single || closed)) return null
    if (s.currentMonthOnly && closed) return null
    const owner: Owner = single ? "person1" : s.owner
    const person1Percentage = owner === "person1" ? 100 : owner === "person2" ? 0 : 50
    // Ingresos y aportaciones llevan el nombre de su dueño ("Nómina Luis", "Aportación Laura").
    const ownerName = owner === "person1" ? config.person1Name : config.person2Name
    const name = s.type === "income" || s.type === "contribution" ? `${s.name} ${ownerName}` : s.name
    seq += 1
    return {
      id: `tour-${seq}`,
      type: s.type,
      category: s.category,
      name,
      amount: s.amount,
      owner,
      person1Percentage,
      person2Percentage: 100 - person1Percentage,
      date: dateIn(month, year, s.day),
      createdAt: new Date(now.getTime() - seq * 60_000).toISOString(),
      nonComputable: Boolean(s.nonComputable),
      paid: s.type !== "income" && (closed || Boolean(s.paid)),
      categoryId: s.categoryId,
    }
  }

  // Dos meses cerrados (con informe y ajustes) y el actual, abierto.
  for (const offset of [2, 1, 0]) {
    const { month, year } = monthsBefore(current.month, current.year, offset)
    const closed = offset > 0
    const monthTransactions = SAMPLES.map((s) => make(s, month, year, closed)).filter((t): t is Transaction => t !== null)

    if (closed) {
      // El dinero real difiere un poco de lo calculado: así el informe tiene sus ajustes.
      const before = calculateReportTotals(monthTransactions)
      const balance1 = subtractMoney(before.person1Income, before.person1Expenses)
      const balance2 = subtractMoney(before.person2Income, before.person2Expenses)
      const adjustment1 = offset === 1 ? 12.4 : -8.15
      const adjustment2 = single ? 0 : offset === 1 ? -5.3 : 3.2
      const adjustments: [Owner, string, number][] = [
        ["person1", config.person1Name, adjustment1],
        ["person2", config.person2Name, adjustment2],
      ]
      for (const [owner, name, amount] of adjustments) {
        if (amount === 0) continue
        seq += 1
        monthTransactions.push({
          id: `tour-${seq}`,
          type: amount > 0 ? "income" : "expense",
          category: amount > 0 ? "income" : "variable",
          name: `Ajuste ${name} - Cierre ${formatMonthYear(month, year)}`,
          amount: Math.abs(amount),
          owner,
          person1Percentage: owner === "person1" ? 100 : 0,
          person2Percentage: owner === "person1" ? 0 : 100,
          date: getLastDateOfMonth(month, year),
          createdAt: new Date(now.getTime() - seq * 60_000).toISOString(),
          nonComputable: false,
          paid: true,
          closingAdjustment: true,
        })
      }
      reports.push({
        id: `tour-report-${offset}`,
        month,
        year,
        person1RealMoney: addMoney(balance1, adjustment1),
        person2RealMoney: addMoney(balance2, adjustment2),
        person1Adjustment: adjustment1,
        person2Adjustment: adjustment2,
        ...calculateReportTotals(monthTransactions),
        transactions: monthTransactions,
        createdAt: new Date(year, month, 1).toISOString(),
      })
    }
    transactions.push(...monthTransactions)
  }

  return { transactions, reports, config, version: DATA_VERSION }
}
