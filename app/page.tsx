"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import type { Transaction, MonthlyReport, TransactionFormData } from "@/types"
import { useFinancialData as useFinancialDataContext } from "@/hooks/use-financial-data"
import { useCloudSession } from "@/hooks/use-cloud-session"
import { useVault } from "@/hooks/use-vault"
import { useCalculations } from "@/hooks/use-calculations"
import { getCurrentMonth, getCurrentYear, formatMonthYear, calculateCumulativeBalances, getPreviousMonthYear, formatCurrency } from "@/lib/utils"
import { subtractMoney } from "@/lib/money"
import { generateSampleData } from "@/lib/sample-data"
import {
  getLastSeenMonth,
  hasAccountPromptBeenShown,
  markAccountPromptShown,
  parseImportedData,
  setLastSeenMonth,
} from "@/lib/storage"
import { countPerson2OpenTransactions } from "@/lib/single-mode"

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
import { PaidReconciliationModal } from "@/components/paid-reconciliation-modal"
import { AccountModal } from "@/components/account-modal"
import { CloudStatus } from "@/components/cloud-status"
import { VaultUnlock } from "@/components/vault-unlock"
import { AuthScreen } from "@/components/auth-screen"
import { RecoveryCodeDialog } from "@/components/recovery-code-dialog"
import { MasterCheckDialog } from "@/components/master-check-dialog"
import { isMasterCheckDue } from "@/lib/cloud/master-check"
import { recordMasterCheck } from "@/lib/cloud/repository"

import { Button } from "@/components/ui/button"
import { Plus, FileText, Settings, Calendar, Info, Heart, Copy, AlertTriangle } from "lucide-react"

// Pure helper — kept outside component to avoid stale-closure issues in callbacks.
// Devuelve el nombre del mes con la primera letra en mayúscula (ej. "Agosto").
function getMonthName(month: number): string {
  const name = new Date(2000, month, 1).toLocaleString("es-ES", { month: "long" })
  return name.charAt(0).toUpperCase() + name.slice(1)
}

const isFixedExpense = (t: Transaction) => t.type === "expense" && t.category === "fixed"
// Los ajustes de cierre de informe (ver monthly-report-modal) no se copian al mes siguiente.
const isCopyableIncome = (t: Transaction) => t.type === "income" && !/^Ajuste .+ - Cierre /.test(t.name)

export default function HomePage() {
  // Sesión en la nube: con hogar (y desbloqueado con la contraseña maestra), los datos se leen
  // y guardan cifrados en Firestore; si no, en local.
  const session = useCloudSession()
  const vault = useVault(session)
  const cloudTarget = useMemo(
    () =>
      session.services && session.householdId && vault.dek
        ? { db: session.services.db, householdId: session.householdId, dek: vault.dek }
        : null,
    [session.services, session.householdId, vault.dek],
  )

  const {
    data,
    isLoading: isDataLoading,
    addTransaction,
    updateTransaction,
    setTransactionsPaid,
    deleteTransaction,
    updateConfig,
    createOrUpdateReport,
    getTransactionsForMonth,
    getExistingReport,
    replaceAllData,
    householdInfo,
    syncError,
  } = useFinancialDataContext(cloudTarget)
  // La app exige cuenta verificada (si la build trae Firebase): hasta entonces no hay datos que usar.
  const needsAuth = session.enabled && (!session.user || !session.emailVerified)
  // Con hogar, los datos solo valen cuando está desbloqueado (antes, el hook aún tiene los locales).
  const isLoading =
    !session.ready || needsAuth || (session.householdId !== null && vault.status !== "unlocked") || isDataLoading
  // Hogar en la nube pero sin la clave en este dispositivo: hay que escribir la contraseña maestra.
  const isVaultLocked = session.ready && vault.status === "locked"

  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<MonthlyReport | null>(null)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [isSettingsModalOpen, setIsSettingsModal] = useState(false)
  const [isDocumentationModalOpen, setIsDocumentationModalOpen] = useState(false)
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)
  // Código de recuperación recién generado: se muestra una sola vez.
  const [recoveryCodeToShow, setRecoveryCodeToShow] = useState<string | null>(null)

  // Comprobación mensual de la contraseña maestra (solo con el hogar desbloqueado).
  const profile = session.profile
  const isMasterCheckOpen =
    vault.status === "unlocked" && profile !== null && !recoveryCodeToShow && isMasterCheckDue(profile, new Date())
  // Perfiles sin fecha (creados antes de esta comprobación): se registra la de ahora sin preguntar.
  useEffect(() => {
    if (vault.status !== "unlocked" || !profile || profile.lastMasterCheckAt || !session.services || !session.user) return
    recordMasterCheck(session.services.db, session.user.uid)
  }, [vault.status, profile, session.services, session.user])

  // Ya con la cuenta verificada y sin hogar, la ventana de Cuenta se abre sola UNA vez por
  // usuario (no en cada recarga). Después, el aviso amarillo de la cabecera lo recuerda.
  useEffect(() => {
    const uid = session.user?.uid
    if (!session.ready || !uid || !session.emailVerified || session.householdId) return
    if (hasAccountPromptBeenShown(uid, "household")) return
    markAccountPromptShown(uid, "household")
    setIsAccountModalOpen(true)
  }, [session.ready, session.user, session.emailVerified, session.householdId])

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [selectedYear, setSelectedYear] = useState(getCurrentYear())

  const [isConfirmCopyModalOpen, setIsConfirmCopyModalOpen] = useState(false)
  const [transactionsToCopy, setTransactionsToCopy] = useState<Transaction[]>([])

  const [isPaidReconcileOpen, setIsPaidReconcileOpen] = useState(false)
  const [reconcileExpenses, setReconcileExpenses] = useState<Transaction[]>([])
  const [reconcileLabel, setReconcileLabel] = useState<{ monthName: string; year: number }>({ monthName: "", year: 0 })

  const [transactionsToShow, setTransactionsToShow] = useState(5)

  useEffect(() => {
    setTransactionsToShow(5)
  }, [selectedMonth, selectedYear])

  const [monthToCloseReport, setMonthToCloseReport] = useState(getCurrentMonth())
  const [yearToCloseReport, setYearToCloseReport] = useState(getCurrentYear())

  const allTransactionsForSelectedMonth = getTransactionsForMonth(selectedMonth, selectedYear)

  const hasFixedExpensesInCurrentMonth = allTransactionsForSelectedMonth.some(isFixedExpense)
  const hasIncomesInCurrentMonth = allTransactionsForSelectedMonth.some(isCopyableIncome)
  // Cada tipo se copia solo si el mes seleccionado aún no lo tiene, para no duplicar.
  const hasNothingToCopy = hasFixedExpensesInCurrentMonth && hasIncomesInCurrentMonth

  const actualCurrentMonth = getCurrentMonth()
  const actualCurrentYear = getCurrentYear()

  const isSelectedMonthCurrent = selectedMonth === actualCurrentMonth && selectedYear === actualCurrentYear
  const isSelectedMonthFuture =
    selectedYear > actualCurrentYear ||
    (selectedYear === actualCurrentYear && selectedMonth > actualCurrentMonth)

  const calculations = useCalculations(allTransactionsForSelectedMonth)
  const existingReportForActualMonth = getExistingReport(actualCurrentMonth, actualCurrentYear)
  const existingReportForSelectedMonth = getExistingReport(selectedMonth, selectedYear)
  const { month: prevOfSelectedMonth, year: prevOfSelectedYear } = getPreviousMonthYear(selectedMonth, selectedYear)
  const isPreviousMonthClosed = !!getExistingReport(prevOfSelectedMonth, prevOfSelectedYear)
  // Un mes futuro solo se bloquea para copiar si el mes anterior aún no tiene informe cerrado.
  const isCopyBlockedByFuture = isSelectedMonthFuture && !isPreviousMonthClosed
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
    // El origen es el mes ANTERIOR al mes seleccionado (no al mes real de hoy).
    const { month: sourceMonth, year: sourceYear } = getPreviousMonthYear(selectedMonth, selectedYear)
    const sourceMonthName = getMonthName(sourceMonth - 1)
    const sourceTransactions = getTransactionsForMonth(sourceMonth, sourceYear)
    const toCopy = sourceTransactions.filter(
      (t) =>
        (!hasFixedExpensesInCurrentMonth && isFixedExpense(t)) || (!hasIncomesInCurrentMonth && isCopyableIncome(t))
    )

    if (toCopy.length === 0) {
      alert(`No hay gastos fijos ni ingresos en ${sourceMonthName} ${sourceYear} para copiar.`)
      return
    }

    setTransactionsToCopy(toCopy)
    setIsConfirmCopyModalOpen(true)
  }, [selectedMonth, selectedYear, getTransactionsForMonth, hasFixedExpensesInCurrentMonth, hasIncomesInCurrentMonth])

  const confirmCopyTransactions = useCallback(() => {
    // Las copias se fechan el día 1 del mes SELECCIONADO (string directo, sin conversión a UTC).
    const formattedDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`

    transactionsToCopy.forEach((transaction) => {
      const newTransaction: TransactionFormData = {
        type: transaction.type,
        category: transaction.category,
        // Se copia con el mismo nombre, limpiando el sufijo " (copiado)" que dejaban versiones anteriores.
        name: transaction.name.replace(/( \(copiado\))+$/, ""),
        amount: transaction.amount,
        owner: transaction.owner,
        person1Percentage: transaction.person1Percentage ?? 50,
        person2Percentage: transaction.person2Percentage ?? 50,
        date: formattedDate,
        nonComputable: transaction.nonComputable,
      }
      addTransaction(newTransaction)
    })

    const expenseCount = transactionsToCopy.filter(isFixedExpense).length
    const incomeCount = transactionsToCopy.length - expenseCount
    setIsConfirmCopyModalOpen(false)
    setTransactionsToCopy([])
    alert(
      `${expenseCount} gastos fijos y ${incomeCount} ingresos copiados a ${getMonthName(selectedMonth - 1)} ${selectedYear}`,
    )
  }, [transactionsToCopy, selectedMonth, selectedYear, addTransaction])

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

  // Importar sirve igual en local y en la nube: los datos pasan por `replaceAllData`.
  const handleImportData = (content: string): boolean => {
    const imported = parseImportedData(content)
    if (!imported) {
      alert("Error al importar los datos. Verifica que el archivo sea válido.")
      return false
    }
    replaceAllData(imported)
    return true
  }

  const handleLoadSampleData = () => {
    const sampleTransactions = generateSampleData(data.config.singleMode)
    replaceAllData({ ...data, transactions: sampleTransactions, reports: [] })
  }

  const handleClearData = () => {
    replaceAllData({ transactions: [], reports: [], config: data.config })
  }

  const handleLoadMoreTransactions = useCallback(() => {
    setTransactionsToShow((prev) => prev + 5)
  }, [])

  // Marca el mes real actual como "visto" en localStorage.
  const markCurrentMonthSeen = useCallback(() => {
    const now = new Date()
    setLastSeenMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`)
  }, [])

  const finishReconcile = useCallback(() => {
    markCurrentMonthSeen()
    setIsPaidReconcileOpen(false)
    setReconcileExpenses([])
  }, [markCurrentMonthSeen])

  // "Marcar todas": todos los gastos del mes que se cierra quedan pagados.
  const handleReconcileMarkAll = () => {
    setTransactionsPaid(
      reconcileExpenses.map((e) => e.id),
      true,
    )
    finishReconcile()
  }

  // "Guardar": los IDs marcados quedan pagados; el resto del mes, sin pagar.
  const handleReconcileSave = (paidIds: string[]) => {
    const paidSet = new Set(paidIds)
    const toPaid = reconcileExpenses.filter((e) => paidSet.has(e.id)).map((e) => e.id)
    const toUnpaid = reconcileExpenses.filter((e) => !paidSet.has(e.id)).map((e) => e.id)
    if (toPaid.length) setTransactionsPaid(toPaid, true)
    if (toUnpaid.length) setTransactionsPaid(toUnpaid, false)
    finishReconcile()
  }

  // Detección de cambio de mes real: al abrir la app en un mes de calendario nuevo,
  // ofrece reconciliar (marcar pagados) los gastos del mes que se acaba de cerrar.
  // Espera a que los datos estén cargados: en la nube llegan después del primer render.
  const hasCheckedMonthChange = useRef(false)
  useEffect(() => {
    if (isLoading || hasCheckedMonthChange.current) return
    hasCheckedMonthChange.current = true

    const now = new Date()
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    const lastSeen = getLastSeenMonth()

    if (!lastSeen) {
      // Primer uso: registra el mes actual sin mostrar nada (evita avalancha con el histórico).
      setLastSeenMonth(currentKey)
      return
    }

    if (lastSeen !== currentKey) {
      const { month: prevMonth, year: prevYear } = getPreviousMonthYear(getCurrentMonth(), getCurrentYear())
      const prevExpenses = getTransactionsForMonth(prevMonth, prevYear).filter((t) => t.type === "expense")
      const hasUnpaid = prevExpenses.some((t) => !t.paid)

      if (prevExpenses.length > 0 && hasUnpaid) {
        setReconcileExpenses(prevExpenses)
        setReconcileLabel({ monthName: getMonthName(prevMonth - 1), year: prevYear })
        setIsPaidReconcileOpen(true)
      } else {
        // Nada pendiente del mes anterior: solo actualiza el marcador.
        setLastSeenMonth(currentKey)
      }
    }
    // Se ejecuta una sola vez, cuando terminan de cargar los datos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading])

  // La app exige una cuenta con el email verificado (si la build trae Firebase; si no, es solo local).
  if (session.ready && needsAuth) {
    return <AuthScreen session={session} />
  }

  if (isVaultLocked) {
    return <VaultUnlock session={session} vault={vault} onRecoveryCode={setRecoveryCodeToShow} />
  }

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
          <div className="relative flex justify-center items-center h-16">
            <h1 className="text-2xl font-bold text-foreground relative">
              2Budge
              <span className="relative inline-block">
                t
                <Heart className="h-3 w-3 fill-red-500 text-red-500 absolute -top-1 -right-1" />
              </span>
            </h1>
            {/* Cuenta: nube con hogar, o modo local (solo si la build trae Firebase). */}
            {session.enabled && (
              <CloudStatus
                session={session}
                singleMode={data.config.singleMode}
                onOpenAccount={() => setIsAccountModalOpen(true)}
              />
            )}
          </div>
        </div>
      </header>

      {syncError && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-600">{syncError}</p>
          </div>
        </div>
      )}

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
          singleMode={data.config.singleMode}
        />

        <div className="flex flex-col lg:flex-row gap-8 mt-8">
          <aside className="w-full lg:w-80 space-y-8">
            <CumulativeBalanceCard
              totalBalance={cumulativeBalances.totalBalance}
              person1TotalBalance={cumulativeBalances.person1TotalBalance}
              person2TotalBalance={cumulativeBalances.person2TotalBalance}
              person1Name={data.config.person1Name}
              person2Name={data.config.person2Name}
              singleMode={data.config.singleMode}
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
                            {formatCurrency(subtractMoney(report.totalIncome, report.totalExpenses))}
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
              onTogglePaid={(id, paid) => setTransactionsPaid([id], paid)}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onMonthChange={setSelectedMonth}
              onYearChange={setSelectedYear}
              transactionsToShowCount={transactionsToShow}
              onLoadMore={handleLoadMoreTransactions}
              hasMore={hasMoreTransactions}
              singleMode={data.config.singleMode}
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
          variant={hasNothingToCopy || isCopyBlockedByFuture ? "outline" : "destructive"}
          size="icon"
          className={`shadow-lg ${!hasNothingToCopy && !isCopyBlockedByFuture ? "hover:bg-red-600" : "opacity-50 cursor-not-allowed"}`}
          disabled={hasNothingToCopy || isCopyBlockedByFuture}
          title={
            hasNothingToCopy
              ? "Ya hay gastos fijos e ingresos este mes"
              : isCopyBlockedByFuture
                ? "No se pueden copiar transacciones a un mes futuro hasta cerrar el informe del mes anterior"
                : "Copiar gastos fijos e ingresos del mes anterior"
          }
        >
          <Copy className="h-5 w-5" />
          <span className="sr-only">Copiar gastos fijos e ingresos</span>
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
        onConfirm={confirmCopyTransactions}
        monthName={getMonthName(selectedMonth - 1)}
        year={selectedYear}
        expenseCount={transactionsToCopy.filter(isFixedExpense).length}
        incomeCount={transactionsToCopy.filter(isCopyableIncome).length}
      />

      <PaidReconciliationModal
        isOpen={isPaidReconcileOpen}
        monthName={reconcileLabel.monthName}
        year={reconcileLabel.year}
        expenses={reconcileExpenses}
        onMarkAll={handleReconcileMarkAll}
        onSave={handleReconcileSave}
      />

      <TransactionForm
        isOpen={isTransactionFormOpen}
        onClose={handleCloseTransactionForm}
        onSubmit={handleAddOrUpdateTransaction}
        transaction={editingTransaction || undefined}
        person1Name={data.config.person1Name}
        person2Name={data.config.person2Name}
        singleMode={data.config.singleMode}
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
          singleMode={data.config.singleMode}
        />
      )}

      {selectedReport && (
        <ReportDetailModal
          isOpen={!!selectedReport}
          onClose={() => setSelectedReport(null)}
          report={selectedReport}
          person1Name={data.config.person1Name}
          person2Name={data.config.person2Name}
          singleMode={data.config.singleMode}
        />
      )}

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModal(false)}
        config={data.config}
        onUpdateConfig={updateConfig}
        appData={data}
        onImportData={handleImportData}
        isCloud={cloudTarget !== null}
        onLoadSampleData={handleLoadSampleData}
        onClearData={handleClearData}
        person2OpenTransactionsCount={countPerson2OpenTransactions(data.transactions, data.reports)}
      />

      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        session={session}
        householdInfo={householdInfo}
        person1Name={data.config.person1Name}
        person2Name={data.config.person2Name}
        singleMode={data.config.singleMode}
        onRecoveryCode={(code) => {
          setIsAccountModalOpen(false)
          setRecoveryCodeToShow(code)
        }}
      />

      <MasterCheckDialog
        isOpen={isMasterCheckOpen}
        session={session}
        vault={vault}
        onRecoveryCode={setRecoveryCodeToShow}
      />

      <RecoveryCodeDialog
        code={recoveryCodeToShow}
        email={session.user?.email ?? null}
        onClose={() => setRecoveryCodeToShow(null)}
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
