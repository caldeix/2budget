/**
 * @file hooks/use-copy-previous-month.ts
 * @description Copiar al mes seleccionado los gastos fijos, los ingresos y las aportaciones del mes
 *              anterior (3.1.1: separado de `app/page.tsx`). Cada tipo se copia solo si el mes aún no
 *              lo tiene, para no duplicar; las copias se fechan el día 1 y conservan su categoría.
 *
 *              Por persona (3.15.0): lo que falta se mira por tipo Y por dueño (antes, una nómina apuntada
 *              a mano impedía copiar los ingresos de la pareja), y lo que la pareja oculta no se copia:
 *              se queda para ella, que al entrar ve un aviso con lo suyo que falta (`mineMissing`) y lo
 *              copia revisando sus importes.
 */

"use client"

import { useCallback, useMemo, useState } from "react"
import type { Transaction, TransactionFormData } from "@/types"
import type { CopyAmounts } from "@/components/confirm-copy-modal"
import type { Flash } from "@/components/flash-message"
import { isClosingAdjustment, isContribution } from "@/lib/aggregations"
import { getMonthName, getPreviousMonthYear } from "@/lib/utils"
import { belongsOnlyTo, type Person } from "@/lib/privacy"

export const isFixedExpense = (t: Transaction) => t.type === "expense" && t.category === "fixed"
// Los ajustes de cierre de informe (ver monthly-report-modal) no se copian al mes siguiente.
const isCopyableIncome = (t: Transaction) => t.type === "income" && !isClosingAdjustment(t)
// Las aportaciones a la cuenta compartida se copian como los fijos y los ingresos.
const isCopyableContribution = (t: Transaction) => isContribution(t)

/** Tipo de copia de una transacción (o `null` si no se copia). */
const copyKindOf = (t: Transaction) =>
  isFixedExpense(t) ? "fixed" : isCopyableIncome(t) ? "income" : isCopyableContribution(t) ? "contribution" : null
/** Hueco que ocupa en el mes: su tipo de copia y su dueño. Si el mes ya tiene uno igual, no se copia. */
const copySlotOf = (t: Transaction) => `${copyKindOf(t)}:${t.owner}`

interface UseCopyPreviousMonthOptions {
  selectedMonth: number
  selectedYear: number
  /** Transacciones del mes seleccionado. */
  monthTransactions: Transaction[]
  getTransactionsForMonth: (month: number, year: number) => Transaction[]
  addTransaction: (transaction: TransactionFormData) => void
  onFlash: (flash: Flash) => void
  /** Si la pareja oculta el importe: esas transacciones no se copian, las copia ella. */
  isAmountHidden?: (t: Transaction) => boolean
  /** Mi rol en el hogar (`null` sin hogar en la nube): para saber qué falta de lo mío. */
  viewer?: Person | null
}

export function useCopyPreviousMonth({
  selectedMonth,
  selectedYear,
  monthTransactions,
  getTransactionsForMonth,
  addTransaction,
  onFlash,
  isAmountHidden = () => false,
  viewer = null,
}: UseCopyPreviousMonthOptions) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [transactionsToCopy, setTransactionsToCopy] = useState<Transaction[]>([])

  // Lo del mes anterior que aún falta en el mes seleccionado, por tipo y dueño.
  const missing = useMemo(() => {
    const { month, year } = getPreviousMonthYear(selectedMonth, selectedYear)
    const present = new Set(monthTransactions.filter((t) => copyKindOf(t)).map(copySlotOf))
    return getTransactionsForMonth(month, year).filter((t) => copyKindOf(t) && !present.has(copySlotOf(t)))
  }, [selectedMonth, selectedYear, monthTransactions, getTransactionsForMonth])
  // Lo que copio yo: todo lo que falta menos lo que mi pareja me oculta.
  const copyable = useMemo(() => missing.filter((t) => !isAmountHidden(t)), [missing, isAmountHidden])
  // Lo mío que falta cuando el mes ya está preparado: tiene algo copiable que no es solo mío (mi pareja
  // copió lo suyo y lo compartido). Lo que apunto yo a mano no cuenta como «preparado».
  const mineMissing = useMemo(
    () =>
      viewer && monthTransactions.some((t) => copyKindOf(t) && !belongsOnlyTo(t, viewer))
        ? missing.filter((t) => belongsOnlyTo(t, viewer))
        : [],
    [viewer, monthTransactions, missing],
  )

  // Las aportaciones solo faltan si el mes anterior las tenía (sin cuenta compartida no hay nada que copiar).
  const previousMonthHasContributions = useMemo(() => {
    const { month, year } = getPreviousMonthYear(selectedMonth, selectedYear)
    return getTransactionsForMonth(month, year).some(isCopyableContribution)
  }, [selectedMonth, selectedYear, getTransactionsForMonth])
  const hasNothingToCopy = copyable.length === 0
  // Lo que falta y no copio yo porque es de mi pareja y me lo oculta.
  const leftForPartner = missing.length - copyable.length

  const prepare = useCallback(() => {
    // El origen es el mes ANTERIOR al mes seleccionado (no al mes real de hoy).
    const { month: sourceMonth, year: sourceYear } = getPreviousMonthYear(selectedMonth, selectedYear)
    if (copyable.length === 0) {
      onFlash({
        text: `No hay gastos fijos, ingresos ni aportaciones en ${getMonthName(sourceMonth)} ${sourceYear} para copiar.`,
        tone: "error",
      })
      return
    }
    setTransactionsToCopy(copyable)
    setIsConfirmOpen(true)
  }, [selectedMonth, selectedYear, copyable, onFlash])

  const counts = {
    expenseCount: transactionsToCopy.filter(isFixedExpense).length,
    incomeCount: transactionsToCopy.filter(isCopyableIncome).length,
    contributionCount: transactionsToCopy.filter(isCopyableContribution).length,
  }

  const confirm = useCallback(
    (amounts: CopyAmounts) => {
      // Las copias se fechan el día 1 del mes SELECCIONADO (string directo, sin conversión a UTC).
      const formattedDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`
      transactionsToCopy.forEach((transaction) => {
        addTransaction({
          type: transaction.type,
          category: transaction.category,
          // Se copia con el mismo nombre, limpiando el sufijo " (copiado)" que dejaban versiones anteriores.
          name: transaction.name.replace(/( \(copiado\))+$/, ""),
          // Importe revisado en el modal ("Revisar importes"), o el del mes anterior.
          amount: amounts[transaction.id] ?? transaction.amount,
          owner: transaction.owner,
          person1Percentage: transaction.person1Percentage ?? 50,
          person2Percentage: transaction.person2Percentage ?? 50,
          date: formattedDate,
          nonComputable: transaction.nonComputable,
          // La copia conserva la categoría de la original (antes quedaba en "Sin categoría").
          categoryId: transaction.categoryId,
        })
      })

      const expenseCount = transactionsToCopy.filter(isFixedExpense).length
      const incomeCount = transactionsToCopy.filter(isCopyableIncome).length
      const contributionCount = transactionsToCopy.filter(isCopyableContribution).length
      setIsConfirmOpen(false)
      setTransactionsToCopy([])
      const copied =
        contributionCount > 0
          ? `${expenseCount} gastos fijos, ${incomeCount} ingresos y ${contributionCount} aportaciones`
          : `${expenseCount} gastos fijos y ${incomeCount} ingresos`
      onFlash({ text: `${copied} copiados a ${getMonthName(selectedMonth)} ${selectedYear}`, tone: "success" })
    },
    [transactionsToCopy, selectedMonth, selectedYear, addTransaction, onFlash],
  )

  return {
    isConfirmOpen,
    closeConfirm: () => setIsConfirmOpen(false),
    transactionsToCopy,
    counts,
    hasNothingToCopy,
    leftForPartner,
    mineMissing,
    previousMonthHasContributions,
    prepare,
    confirm,
  }
}
