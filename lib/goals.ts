/**
 * @file lib/goals.ts
 * @description Metas de ahorro (3.3.0): cuánto dinero hay para repartir entre las metas de cada cuenta
 *              (la de cada persona y la compartida), cuánto queda sin asignar y cuánto baja cada meta
 *              si el mes en curso va en negativo. Todo se calcula; lo único guardado es lo que se ha
 *              asignado a cada meta (ver plan, decisiones D-7 a D-11).
 *
 *              - Solo se reparte el dinero de los meses TERMINADOS y con el informe CERRADO: el mes en
 *                curso aún no se sabe cuánto dejará (D-7).
 *              - Dinero de cada cuenta: el mismo reparto que el Total acumulado (`cumulativeAccountSplit`),
 *                sobre esos meses. Las metas personales salen de la cuenta de cada uno, sin su parte en
 *                la compartida, que es de las metas compartidas (D-11).
 *              - Si el mes en curso va en negativo con lo ya pagado (Hoy, D-8), primero se gasta lo sin
 *                asignar y luego baja la meta a la que se añadió dinero más recientemente, después la
 *                anterior, etc. (D-10). No se guarda: si el mes se recupera, la meta vuelve (D-9).
 */

import type { Goal, GoalOwner, MonthlyReport, Transaction } from "@/types"
import { aggregateTransactions, isSettled } from "@/lib/aggregations"
import { monthAccountSplit, usesSharedAccount } from "@/lib/shared-account"
import { fromCents, toCents } from "@/lib/money"
import { calculateCumulativeBalances } from "@/lib/utils"

const monthKey = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}`

/** Lo que tiene una cuenta (bolsa) del mes en curso: Hoy (lo pagado) y Previsto (todo lo apuntado). */
interface MonthResult {
  today: number
  expected: number
}

/** Una meta con lo que tiene ahora (lo asignado menos lo que le quita el mes en curso). */
export interface GoalView {
  goal: Goal
  /** Lo que tiene ahora la meta. */
  current: number
  /** Lo que le quita el mes en curso (Hoy). */
  reduction: number
  /** Lo que le quitaría el mes en curso si se cumple lo Previsto. */
  expectedReduction: number
}

/** Situación de las metas de una cuenta. */
export interface GoalPool {
  owner: GoalOwner
  /** Dinero de la cuenta en los meses terminados y cerrados. */
  available: number
  /** Suma de lo asignado a sus metas (lo guardado). */
  allocated: number
  /** Lo que queda para asignar (nunca negativo). */
  unassigned: number
  /** Resultado del mes en curso en esta cuenta. */
  month: MonthResult
  /** Sus metas, de la que tiene la aportación más reciente a la más antigua. */
  goals: GoalView[]
}

/** Situación de todas las metas. */
export interface GoalsSummary {
  pools: Record<GoalOwner, GoalPool>
  /** Meses terminados con movimientos y sin informe: su dinero aún no se puede asignar. */
  unclosedMonths: { month: number; year: number }[]
  /** Si el hogar usa la cuenta compartida (alguna aportación en los meses contados o en el actual). */
  usesShared: boolean
}

/** Resultado de un mes por cuenta, igual que las cifras «Hoy» y «Previsto» del Balance individual. */
function monthResult(transactions: Transaction[]): Record<GoalOwner, MonthResult> {
  const usesShared = usesSharedAccount(transactions)
  const totals = aggregateTransactions(transactions)
  const settled = transactions.filter(isSettled)
  const paid = aggregateTransactions(settled)
  const expected = monthAccountSplit(
    transactions,
    fromCents(toCents(totals.person1Income) - toCents(totals.person1Expenses)),
    fromCents(toCents(totals.person2Income) - toCents(totals.person2Expenses)),
    usesShared,
  )
  const today = monthAccountSplit(
    settled,
    fromCents(toCents(paid.person1Income) - toCents(paid.person1Expenses)),
    fromCents(toCents(paid.person2Income) - toCents(paid.person2Expenses)),
    usesShared,
  )
  return {
    person1: { today: today.person1Account, expected: expected.person1Account },
    person2: { today: today.person2Account, expected: expected.person2Account },
    shared: { today: today.shared, expected: expected.shared },
  }
}

/** Reparte una bajada (en céntimos) entre las metas, de la aportación más reciente a la más antigua. */
function spreadReduction(goals: Goal[], deficitCents: number): Map<string, number> {
  const reductions = new Map<string, number>()
  let left = Math.max(0, deficitCents)
  for (const goal of goals) {
    const take = Math.min(left, toCents(goal.allocated))
    reductions.set(goal.id, take)
    left -= take
  }
  return reductions
}

/**
 * @function summarizeGoals
 * @description Situación de las metas de cada cuenta en una fecha (por defecto, hoy).
 * @param {Transaction[]} transactions - Todas las transacciones.
 * @param {MonthlyReport[]} reports - Los informes (marcan qué meses están cerrados).
 * @param {Goal[]} goals - Las metas guardadas.
 * @param {Date} now - Fecha de referencia (el mes en curso es el suyo).
 */
export function summarizeGoals(transactions: Transaction[], reports: MonthlyReport[], goals: Goal[], now = new Date()): GoalsSummary {
  const currentKey = monthKey(now.getFullYear(), now.getMonth() + 1)
  const closed = new Set(reports.map((r) => monthKey(r.year, r.month)))

  const counted: Transaction[] = []
  const current: Transaction[] = []
  const unclosed = new Set<string>()
  for (const t of transactions) {
    const key = t.date.slice(0, 7)
    if (key === currentKey) current.push(t)
    else if (key < currentKey) {
      if (closed.has(key)) counted.push(t)
      else unclosed.add(key)
    }
  }

  const { accounts } = calculateCumulativeBalances(counted)
  const available: Record<GoalOwner, number> = {
    person1: accounts.person1Account,
    person2: accounts.person2Account,
    shared: accounts.shared,
  }
  const month = monthResult(current)

  const pools = {} as Record<GoalOwner, GoalPool>
  for (const owner of ["person1", "person2", "shared"] as const) {
    // De la aportación más reciente a la más antigua: en ese orden bajan si falta dinero.
    const own = goals
      .filter((g) => g.owner === owner)
      .sort((a, b) => (a.lastFundedAt < b.lastFundedAt ? 1 : a.lastFundedAt > b.lastFundedAt ? -1 : 0))
    const allocatedCents = own.reduce((sum, g) => sum + toCents(g.allocated), 0)
    const availableCents = toCents(available[owner])
    // Lo que falta para cubrir lo asignado: el mes en curso en negativo (o un mes cerrado que bajó).
    const freeToday = availableCents + Math.min(0, toCents(month[owner].today)) - allocatedCents
    const freeExpected = availableCents + Math.min(0, toCents(month[owner].expected)) - allocatedCents
    const reductions = spreadReduction(own, -freeToday)
    const expectedReductions = spreadReduction(own, -freeExpected)
    pools[owner] = {
      owner,
      available: available[owner],
      allocated: fromCents(allocatedCents),
      unassigned: fromCents(Math.max(0, freeToday)),
      month: month[owner],
      goals: own.map((goal) => {
        const reduction = reductions.get(goal.id) ?? 0
        return {
          goal,
          current: fromCents(toCents(goal.allocated) - reduction),
          reduction: fromCents(reduction),
          expectedReduction: fromCents(expectedReductions.get(goal.id) ?? 0),
        }
      }),
    }
  }

  return {
    pools,
    unclosedMonths: [...unclosed].sort().map((key) => ({ year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)) })),
    usesShared: accounts.usesShared || usesSharedAccount(current),
  }
}
