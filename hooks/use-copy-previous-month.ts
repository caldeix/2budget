/**
 * @file hooks/use-copy-previous-month.ts
 * @description Copiar al mes seleccionado los gastos fijos, los ingresos y las aportaciones del mes
 *              anterior (3.1.1: separado de `app/page.tsx`). Cada tipo se copia solo si el mes aún no
 *              lo tiene, para no duplicar; las copias se fechan el día 1 y conservan su categoría.
 */

"use client"

import { useCallback, useMemo, useState } from "react"
import type { Transaction, TransactionFormData } from "@/types"
import type { CopyAmounts } from "@/components/confirm-copy-modal"
import type { Flash } from "@/components/flash-message"
import { isClosingAdjustment, isContribution } from "@/lib/aggregations"
import { getMonthName, getPreviousMonthYear } from "@/lib/utils"

export const isFixedExpense = (t: Transaction) => t.type === "expense" && t.category === "fixed"
// Los ajustes de cierre de informe (ver monthly-report-modal) no se copian al mes siguiente.
const isCopyableIncome = (t: Transaction) => t.type === "income" && !isClosingAdjustment(t)
// Las aportaciones a la cuenta compartida se copian como los fijos y los ingresos.
const isCopyableContribution = (t: Transaction) => isContribution(t)

interface UseCopyPreviousMonthOptions {
  selectedMonth: number
  selectedYear: number
  /** Transacciones del mes seleccionado. */
  monthTransactions: Transaction[]
  getTransactionsForMonth: (month: number, year: number) => Transaction[]
  addTransaction: (transaction: TransactionFormData) => void
  onFlash: (flash: Flash) => void
}

export function useCopyPreviousMonth({
  selectedMonth,
  selectedYear,
  monthTransactions,
  getTransactionsForMonth,
  addTransaction,
  onFlash,
}: UseCopyPreviousMonthOptions) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [transactionsToCopy, setTransactionsToCopy] = useState<Transaction[]>([])

  const hasFixedExpenses = monthTransactions.some(isFixedExpense)
  const hasIncomes = monthTransactions.some(isCopyableIncome)
  const hasContributions = monthTransactions.some(isCopyableContribution)
  // Las aportaciones solo faltan si el mes anterior las tenía (sin cuenta compartida no hay nada que copiar).
  const previousMonthHasContributions = useMemo(() => {
    const { month, year } = getPreviousMonthYear(selectedMonth, selectedYear)
    return getTransactionsForMonth(month, year).some(isCopyableContribution)
  }, [selectedMonth, selectedYear, getTransactionsForMonth])
  // Cada tipo se copia solo si el mes seleccionado aún no lo tiene, para no duplicar.
  const hasNothingToCopy = hasFixedExpenses && hasIncomes && (hasContributions || !previousMonthHasContributions)

  const prepare = useCallback(() => {
    // El origen es el mes ANTERIOR al mes seleccionado (no al mes real de hoy).
    const { month: sourceMonth, year: sourceYear } = getPreviousMonthYear(selectedMonth, selectedYear)
    const toCopy = getTransactionsForMonth(sourceMonth, sourceYear).filter(
      (t) =>
        (!hasFixedExpenses && isFixedExpense(t)) ||
        (!hasIncomes && isCopyableIncome(t)) ||
        (!hasContributions && isCopyableContribution(t)),
    )
    if (toCopy.length === 0) {
      onFlash({
        text: `No hay gastos fijos, ingresos ni aportaciones en ${getMonthName(sourceMonth)} ${sourceYear} para copiar.`,
        tone: "error",
      })
      return
    }
    setTransactionsToCopy(toCopy)
    setIsConfirmOpen(true)
  }, [selectedMonth, selectedYear, getTransactionsForMonth, hasFixedExpenses, hasIncomes, hasContributions, onFlash])

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
    previousMonthHasContributions,
    prepare,
    confirm,
  }
}
