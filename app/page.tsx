"use client"

import { useState, useEffect, useCallback } from "react"
import type { Transaction, MonthlyReport, TransactionFormData } from "@/types"
import { useFinancialData as useFinancialDataContext } from "@/hooks/use-financial-data"
import { useCalculations } from "@/hooks/use-calculations"
import { getCurrentMonth, getCurrentYear, formatMonthYear, calculateCumulativeBalances } from "@/lib/utils"
import { generateSampleData } from "@/lib/sample-data"

import { SummaryCards } from "@/components/summary-cards"
import { TransactionsTable } from "@/components/transactions-table"
import { TransactionForm } from "@/components/transaction-form"
import { MonthlyReportModal as MonthlyReportModalComponent } from "@/components/monthly-report-modal"
import { ReportDetailModal } from "@/components/report-detail-modal"
import { SettingsModal } from "@/components/settings-modal"
import { ThemeToggle } from "@/components/theme-toggle"
import { CumulativeBalanceCard } from "@/components/cumulative-balance-card"
import { DocumentationModal } from "@/components/documentation-modal"
import { ConfirmCopyModal } from "@/components/confirm-copy-modal"

import { Button } from "@/components/ui/button"
import { Plus, FileText, Settings, Calendar, Info, Heart, Copy } from "lucide-react"

// Pure helper — kept outside component to avoid stale-closure issues in callbacks.
function getMonthName(month: number): string {
  return new Date(2000, month, 1).toLocaleString("es-ES", { month: "long" })
}

export default function HomePage() {
  const {
    data,
    isLoading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updateConfig,
    createOrUpdateReport,
    getTransactionsForMonth,
    getExistingReport,
    replaceAllData,
  } = useFinancialDataContext()

  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<MonthlyReport | null>(null)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [isSettingsModalOpen, setIsSettingsModal] = useState(false)
  const [isDocumentationModalOpen, setIsDocumentationModalOpen] = useState(false)

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [selectedYear, setSelectedYear] = useState(getCurrentYear())

  const [isConfirmCopyModalOpen, setIsConfirmCopyModalOpen] = useState(false)
  const [previousMonthFixedExpenses, setPreviousMonthFixedExpenses] = useState<Transaction[]>([])
  const [previousMonthName, setPreviousMonthName] = useState("")

  const [transactionsToShow, setTransactionsToShow] = useState(5)

  useEffect(() => {
    setTransactionsToShow(5)
  }, [selectedMonth, selectedYear])

  const [monthToCloseReport, setMonthToCloseReport] = useState(getCurrentMonth())
  const [yearToCloseReport, setYearToCloseReport] = useState(getCurrentYear())

  const allTransactionsForSelectedMonth = getTransactionsForMonth(selectedMonth, selectedYear)

  const hasFixedExpensesInCurrentMonth = allTransactionsForSelectedMonth.some(
    (t) => t.type === "expense" && t.category === "fixed"
  )

  const actualCurrentMonth = getCurrentMonth()
  const actualCurrentYear = getCurrentYear()

  const isSelectedMonthCurrent = selectedMonth === actualCurrentMonth && selectedYear === actualCurrentYear
  const isSelectedMonthFuture =
    selectedYear > actualCurrentYear ||
    (selectedYear === actualCurrentYear && selectedMonth > actualCurrentMonth)

  const calculations = useCalculations(allTransactionsForSelectedMonth)
  const existingReportForActualMonth = getExistingReport(actualCurrentMonth, actualCurrentYear)
  const existingReportForSelectedMonth = getExistingReport(selectedMonth, selectedYear)
  const cumulativeBalances = calculateCumulativeBalances(data.transactions)
  const hasMoreTransactions = transactionsToShow < allTransactionsForSelectedMonth.length

  const handleAddOrUpdateTransaction = (transactionData: TransactionFormData) => {
    if (editingTransaction) {
      updateTransaction(editingTransaction.id, transactionData)
      setEditingTransaction(null)
    } else {
      addTransaction(transactionData)
    }
  }

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setIsTransactionFormOpen(true)
  }

  const handleCloseTransactionForm = () => {
    setIsTransactionFormOpen(false)
    setEditingTransaction(null)
  }

  const prepareCopyFixedExpenses = useCallback(() => {
    const today = new Date()
    let prevMonth = today.getMonth()
    let prevYear = today.getFullYear()

    if (prevMonth === 0) {
      prevMonth = 11
      prevYear--
    }

    const prevMonthName = getMonthName(prevMonth)
    const prevMonthTransactions = getTransactionsForMonth(prevMonth, prevYear)
    const fixedExpenses = prevMonthTransactions.filter(
      (t) => t.type === "expense" && t.category === "fixed"
    )

    if (fixedExpenses.length === 0) {
      alert(`No hay gastos fijos en ${prevMonthName} ${prevYear} para copiar.`)
      return
    }

    setPreviousMonthFixedExpenses(fixedExpenses)
    setPreviousMonthName(prevMonthName)
    setIsConfirmCopyModalOpen(true)
  }, [getTransactionsForMonth])

  const confirmCopyFixedExpenses = useCallback(() => {
    const targetDate = new Date(selectedYear, selectedMonth, 1)
    const formattedDate = targetDate.toISOString().split("T")[0]

    previousMonthFixedExpenses.forEach((expense) => {
      const newExpense: TransactionFormData = {
        type: expense.type,
        category: expense.category,
        name: `${expense.name} (copiado)`,
        amount: expense.amount,
        owner: expense.owner,
        person1Percentage: expense.person1Percentage || 50,
        person2Percentage: expense.person2Percentage || 50,
        date: formattedDate,
      }
      addTransaction(newExpense)
    })

    setIsConfirmCopyModalOpen(false)
    setPreviousMonthFixedExpenses([])
    alert(`${previousMonthFixedExpenses.length} gastos fijos copiados a ${getMonthName(selectedMonth - 1)} ${selectedYear}`)
  }, [previousMonthFixedExpenses, selectedMonth, selectedYear, addTransaction])

  const handleOpenReportModalForCurrentMonth = () => {
    setMonthToCloseReport(actualCurrentMonth)
    setYearToCloseReport(actualCurrentYear)
    setIsReportModalOpen(true)
  }

  const handleOpenReportModalForSelectedMonth = () => {
    setMonthToCloseReport(selectedMonth)
    setYearToCloseReport(selectedYear)
    setIsReportModalOpen(true)
  }

  const handleReportSubmission = (
    reportDataFromModal: Omit<
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
    adjustmentTransactionsToCreate: Omit<Transaction, "id" | "createdAt">[],
  ) => {
    const existingReport = getExistingReport(reportDataFromModal.month, reportDataFromModal.year)
    createOrUpdateReport(reportDataFromModal, adjustmentTransactionsToCreate, existingReport?.id)
    setIsReportModalOpen(false)
  }

  const handleViewReport = (report: MonthlyReport) => {
    setSelectedReport(report)
  }

  const handleImportData = (success: boolean) => {
    if (success) {
      window.location.reload()
    } else {
      alert("Error al importar los datos. Verifica que el archivo sea válido.")
    }
  }

  const handleLoadSampleData = () => {
    const sampleTransactions = generateSampleData()
    replaceAllData({ ...data, transactions: sampleTransactions, reports: [] })
  }

  const handleClearData = () => {
    replaceAllData({ transactions: [], reports: [], config: data.config })
  }

  const handleLoadMoreTransactions = useCallback(() => {
    setTransactionsToShow((prev) => prev + 5)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-16">
            <h1 className="text-2xl font-bold text-foreground relative">
              2Budge
              <span className="relative inline-block">
                t
                <Heart className="h-3 w-3 fill-red-500 text-red-500 absolute -top-1 -right-1" />
              </span>
            </h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SummaryCards
          totalIncome={calculations.totalIncome}
          totalExpenses={calculations.totalExpenses}
          balance={calculations.balance}
          person1Income={calculations.person1Income}
          person2Income={calculations.person2Income}
          person1Expenses={calculations.person1Expenses}
          person2Expenses={calculations.person2Expenses}
          person1Balance={calculations.person1Balance}
          person2Balance={calculations.person2Balance}
          person1Name={data.config.person1Name}
          person2Name={data.config.person2Name}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          nonComputableExpenses={calculations.nonComputableExpenses}
        />

        <div className="flex flex-col lg:flex-row gap-8 mt-8">
          <aside className="w-full lg:w-80 space-y-8">
            <CumulativeBalanceCard
              totalBalance={cumulativeBalances.totalBalance}
              person1TotalBalance={cumulativeBalances.person1TotalBalance}
              person2TotalBalance={cumulativeBalances.person2TotalBalance}
              person1Name={data.config.person1Name}
              person2Name={data.config.person2Name}
            />

            <div className="bg-card rounded-2xl shadow-lg border">
              <div className="p-6 border-b border-border">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Informes Mensuales
                </h3>
              </div>
              <div className="p-4 max-h-96 overflow-y-auto">
                <div className="mb-4">
                  <Button
                    onClick={handleOpenReportModalForCurrentMonth}
                    variant="secondary"
                    className="w-full flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    {existingReportForActualMonth ? "Actualizar Mes Actual" : "Cerrar Mes Actual"}
                  </Button>
                </div>

                {!isSelectedMonthCurrent && !isSelectedMonthFuture && (
                  <div className="mb-4">
                    <Button
                      onClick={handleOpenReportModalForSelectedMonth}
                      variant="secondary"
                      className="w-full flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      {existingReportForSelectedMonth
                        ? `Actualizar informe ${formatMonthYear(selectedMonth, selectedYear)}`
                        : `Generar informe ${formatMonthYear(selectedMonth, selectedYear)}`}
                    </Button>
                  </div>
                )}

                {data.reports.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted" />
                    <p className="text-sm">No hay informes generados</p>
                    <p className="text-xs text-muted-foreground mt-1">Cierra un mes para generar tu primer informe</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {[...data.reports]
                      .sort((a, b) => {
                        if (a.year !== b.year) return b.year - a.year
                        return b.month - a.month
                      })
                      .map((report) => (
                        <button
                          key={report.id}
                          onClick={() => handleViewReport(report)}
                          className="w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors border border-border"
                        >
                          <div className="font-medium text-foreground">
                            {formatMonthYear(report.month, report.year)}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Balance:{" "}
                            {new Intl.NumberFormat("es-ES", {
                              style: "currency",
                              currency: "EUR",
                            }).format(report.totalIncome - report.totalExpenses)}
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </aside>

          <div className="flex-1 space-y-8">
            <TransactionsTable
              transactions={allTransactionsForSelectedMonth}
              person1Name={data.config.person1Name}
              person2Name={data.config.person2Name}
              onEdit={handleEditTransaction}
              onDelete={deleteTransaction}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onMonthChange={setSelectedMonth}
              onYearChange={setSelectedYear}
              transactionsToShowCount={transactionsToShow}
              onLoadMore={handleLoadMoreTransactions}
              hasMore={hasMoreTransactions}
            />
          </div>
        </div>
      </div>

      <div className="mb-8 fixed bottom-6 left-6 flex flex-col gap-3 z-50">
        <Button onClick={() => setIsTransactionFormOpen(true)} variant="secondary" size="icon" className="shadow-lg">
          <Plus className="h-5 w-5" />
          <span className="sr-only">Nueva Transacción</span>
        </Button>

        <Button
          onClick={prepareCopyFixedExpenses}
          variant={hasFixedExpensesInCurrentMonth || isSelectedMonthFuture ? "outline" : "destructive"}
          size="icon"
          className={`shadow-lg ${!hasFixedExpensesInCurrentMonth && !isSelectedMonthFuture ? "hover:bg-red-600" : "opacity-50 cursor-not-allowed"}`}
          disabled={hasFixedExpensesInCurrentMonth || isSelectedMonthFuture}
          title={
            hasFixedExpensesInCurrentMonth
              ? "Ya hay gastos fijos este mes"
              : isSelectedMonthFuture
                ? "No se pueden copiar gastos a meses futuros"
                : "Copiar gastos fijos del mes anterior"
          }
        >
          <Copy className="h-5 w-5" />
          <span className="sr-only">Copiar gastos fijos</span>
        </Button>

        <ThemeToggle />

        <Button onClick={() => setIsSettingsModal(true)} variant="outline" size="icon" className="shadow-lg">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Configuración</span>
        </Button>

        <Button onClick={() => setIsDocumentationModalOpen(true)} variant="outline" size="icon" className="shadow-lg">
          <Info className="h-4 w-4" />
          <span className="sr-only">Documentación</span>
        </Button>
      </div>

      <ConfirmCopyModal
        isOpen={isConfirmCopyModalOpen}
        onClose={() => setIsConfirmCopyModalOpen(false)}
        onConfirm={confirmCopyFixedExpenses}
        monthName={getMonthName(selectedMonth - 1)}
        year={selectedYear}
        count={previousMonthFixedExpenses.length}
      />

      <TransactionForm
        isOpen={isTransactionFormOpen}
        onClose={handleCloseTransactionForm}
        onSubmit={handleAddOrUpdateTransaction}
        transaction={editingTransaction || undefined}
        person1Name={data.config.person1Name}
        person2Name={data.config.person2Name}
      />

      {isReportModalOpen && (
        <MonthlyReportModalComponent
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          onSave={handleReportSubmission}
          month={monthToCloseReport}
          year={yearToCloseReport}
          transactions={getTransactionsForMonth(monthToCloseReport, yearToCloseReport)}
          person1Name={data.config.person1Name}
          person2Name={data.config.person2Name}
          existingReport={getExistingReport(monthToCloseReport, yearToCloseReport)}
        />
      )}

      {selectedReport && (
        <ReportDetailModal
          isOpen={!!selectedReport}
          onClose={() => setSelectedReport(null)}
          report={selectedReport}
          person1Name={data.config.person1Name}
          person2Name={data.config.person2Name}
        />
      )}

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModal(false)}
        config={data.config}
        onUpdateConfig={updateConfig}
        onImportData={handleImportData}
        onLoadSampleData={handleLoadSampleData}
        onClearData={handleClearData}
      />

      <DocumentationModal
        isOpen={isDocumentationModalOpen}
        onClose={() => setIsDocumentationModalOpen(false)}
        person1Name={data.config.person1Name}
        person2Name={data.config.person2Name}
      />
    </div>
  )
}
