/**
 * @file lib/goals.ts
 * @description Metas de ahorro (3.3.0): cuánto dinero hay para repartir entre las metas de cada cuenta
 *              (la de cada persona y la compartida), cuánto queda sin asignar y cuánto baja cada meta
 *              si el mes en curso va en negativo. Todo se calcula; lo único guardado es lo que se ha
 *              asignado a cada meta (ver plan, decisiones D-7 a D-11).
 *
 *              - Solo se reparte el dinero de los meses con el informe CERRADO: el mes en curso sin cerrar
 *                aún no se sabe cuánto dejará (D-7). Desde la 3.15.0 también el mes en curso si ya se ha
 *                cerrado (p. ej. al preparar el siguiente antes de que acabe).
 *              - Dinero de cada cuenta: el mismo reparto que el Total acumulado (`cumulativeAccountSplit`),
 *                sobre esos meses. Las metas personales salen de la cuenta de cada uno, sin su parte en
 *                la compartida, que es de las metas compartidas (D-11).
 *              - Los gastos no computables PAGADOS del mes en curso (3.17.0) son dinero ya apartado a un
 *                ahorro: cuentan ya como «Sin asignar» de su cuenta, sin esperar al cierre. Los de meses
 *                futuros no cuentan (ese dinero aún no se ha movido).
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
  /** No computables ya pagados (3.17.0): dinero apartado este mes que ya se puede asignar. */
  setAside: number
  /** Todos los no computables del mes, pagados o no (para lo Previsto). */
  setAsideExpected: number
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
  /** Dinero de la cuenta en los meses cerrados (también el mes en curso, si ya está cerrado). */
  available: number
  /** No computables pagados del mes en curso sin cerrar que se suman a lo que se puede asignar (como
   *  mucho, lo que deja el mes). */
  setAside: number
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

/**
 * Resultado de un mes por cuenta, como las cifras «Hoy» y «Previsto» del Balance individual pero SIN los
 * gastos no computables (3.14.2): el dinero de los meses cerrados (`calculateCumulativeBalances`) tampoco
 * los resta. Si el mes en curso los restara, ese dinero bajaría las metas hasta cerrar el mes y luego
 * volvería como «Sin asignar» aunque ya estuviera en una meta. Lo apartado como no computable va aparte
 * (`setAside`): el de una persona es de su cuenta y el de «Ambos», de la compartida, como en el acumulado.
 */
function monthResult(all: Transaction[]): Record<GoalOwner, MonthResult> {
  const usesShared = usesSharedAccount(all)
  const isNonComputable = (t: Transaction) => t.type === "expense" && Boolean(t.nonComputable)
  const transactions = all.filter((t) => !isNonComputable(t))
  const setAside = { person1: 0, person2: 0, shared: 0 }
  const setAsideExpected = { person1: 0, person2: 0, shared: 0 }
  for (const t of all.filter(isNonComputable)) {
    const pool: GoalOwner = t.owner === "both" ? "shared" : t.owner
    setAsideExpected[pool] += toCents(t.amount)
    if (isSettled(t)) setAside[pool] += toCents(t.amount)
  }
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
  const result = (pool: GoalOwner, today: number, expected: number): MonthResult => ({
    today,
    expected,
    setAside: fromCents(setAside[pool]),
    setAsideExpected: fromCents(setAsideExpected[pool]),
  })
  return {
    person1: result("person1", today.person1Account, expected.person1Account),
    person2: result("person2", today.person2Account, expected.person2Account),
    shared: result("shared", today.shared, expected.shared),
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
    // El mes en curso ya cerrado cuenta como cerrado (3.15.0): se puede repartir sin esperar a que acabe.
    if (key === currentKey && !closed.has(key)) current.push(t)
    else if (key <= currentKey) {
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
    // Lo que falta para cubrir lo asignado: el mes en curso en negativo (o un mes cerrado que bajó). Lo
    // apartado este mes como no computable ya se puede asignar (3.17.0), pero nunca más de lo que deja el
    // mes: ese dinero ya está dentro de su resultado (que no resta los no computables), y si el resto del
    // mes va en negativo no hay tanto. Así, al cerrar el mes, la cifra no baja de golpe.
    const { today, expected, setAside, setAsideExpected } = month[owner]
    const freeToday = availableCents + Math.min(toCents(today), toCents(setAside)) - allocatedCents
    const freeExpected = availableCents + Math.min(toCents(expected), toCents(setAsideExpected)) - allocatedCents
    const reductions = spreadReduction(own, -freeToday)
    const expectedReductions = spreadReduction(own, -freeExpected)
    pools[owner] = {
      owner,
      available: available[owner],
      setAside: fromCents(Math.max(0, Math.min(toCents(today), toCents(setAside)))),
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
