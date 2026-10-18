"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import type { AppData, Transaction, MonthlyReport, TransactionFormData } from "@/types"
import { useFinancialData as useFinancialDataContext } from "@/hooks/use-financial-data"
import { useCloudSession } from "@/hooks/use-cloud-session"
import { useVault } from "@/hooks/use-vault"
import { useCalculations } from "@/hooks/use-calculations"
import { useCopyPreviousMonth } from "@/hooks/use-copy-previous-month"
import { getCurrentMonth, getCurrentYear, formatMonthYear, calculateCumulativeBalances, getPreviousMonthYear, getMonthName } from "@/lib/utils"
import {
  downloadAppData,
  getLastSeenMonth,
  hasAccountPromptBeenShown,
  hasAppData,
  hasSeenTourOnDevice,
  markAccountPromptShown,
  markTourSeenOnDevice,
  parseImportedData,
  setLastSeenMonth,
} from "@/lib/storage"
import { countPerson2OpenTransactions } from "@/lib/single-mode"
import { isClosingAdjustment, isPayable } from "@/lib/aggregations"
import { isHiddenFromViewer, type Person } from "@/lib/privacy"
import { laterSharedClosings } from "@/lib/shared-account"
import { isZeroMoney, subtractMoney } from "@/lib/money"
import { categoriesOf, categoryNameOf, normalizeName } from "@/lib/categories"
import { CategorySpreadModal } from "@/components/category-spread-modal"
import { evolutionViewsFor, lastMonths, monthlyEvolution, type EvolutionView } from "@/lib/evolution"
import { EvolutionCard } from "@/components/evolution-card"
import { EvolutionModal } from "@/components/evolution-modal"
import { GoalsModal, goalTabsFor } from "@/components/goals-modal"
import { summarizeGoals } from "@/lib/goals"

import { SummaryCards } from "@/components/summary-cards"
import { TransactionsTable } from "@/components/transactions-table"
import { TransactionForm } from "@/components/transaction-form"
import { MonthlyReportModal as MonthlyReportModalComponent } from "@/components/monthly-report-modal"
import { ReportDetailModal } from "@/components/report-detail-modal"
import { ReportButton, ReportsListModal, sortReportsDesc } from "@/components/reports-list-modal"
import { SettingsModal } from "@/components/settings-modal"
import { FloatingActions } from "@/components/floating-actions"
import { CumulativeBalanceCard } from "@/components/cumulative-balance-card"
import { DocumentationModal } from "@/components/documentation-modal"
import { UpdateNotice, UpdateRequired } from "@/components/update-notice"
import { LocalStorageNotice } from "@/components/local-storage-notice"
import { IosInstallNotice } from "@/components/ios-install-notice"
import { ClosingReminder } from "@/components/closing-reminder"
import { FlashMessage, type Flash } from "@/components/flash-message"
import { APP_VERSION, isOlderVersion } from "@/lib/app-version"
import { ConfirmCopyModal } from "@/components/confirm-copy-modal"
import { PaidReconciliationModal } from "@/components/paid-reconciliation-modal"
import { AccountModal } from "@/components/account-modal"
import { CloudStatus } from "@/components/cloud-status"
import { VaultUnlock } from "@/components/vault-unlock"
import { AuthScreen } from "@/components/auth-screen"
import { RecoveryCodeDialog } from "@/components/recovery-code-dialog"
import { MasterCheckDialog } from "@/components/master-check-dialog"
import { isMasterCheckDue } from "@/lib/cloud/master-check"
import { recordMasterCheck, recordTourCompleted } from "@/lib/cloud/repository"
import { AppTour, type TourStep, type TourWindow } from "@/components/app-tour"
import { getTourSteps } from "@/components/tour-steps"
import { createTourData } from "@/lib/tour-data"

import { Button } from "@/components/ui/button"
import { NonModalContext } from "@/components/ui/modal"
import { FileText, Calendar, Heart, AlertTriangle, List } from "lucide-react"

// Vista de la Evolución elegida en este dispositivo (3.4.0).
const EVOLUTION_VIEW_KEY = "2budget:evolution-view"
// En la tarjeta "Informes" solo se ven los últimos; el resto, en el modal con todos.
const RECENT_REPORTS = 3


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

  // Tour de bienvenida: mientras dura, la app enseña datos ficticios (y no guarda nada).
  const [tourData, setTourData] = useState<AppData | null>(null)
  const [tourSteps, setTourSteps] = useState<TourStep[] | null>(null)

  const {
    data,
    isLoading: isDataLoading,
    addTransaction,
    updateTransaction,
    applyCategoryToName,
    setTransactionsPaid,
    deleteTransaction,
    updateConfig,
    createOrUpdateReport,
    deleteReport,
    getTransactionsForMonth,
    getExistingReport,
    replaceAllData,
    addGoal,
    updateGoal,
    deleteGoal,
    moveToGoal,
    householdInfo,
    syncError,
    loadError,
  } = useFinancialDataContext(cloudTarget, tourData)
  // La app exige cuenta verificada (si la build trae Firebase): hasta entonces no hay datos que usar.
  // Una entrada con Google pendiente de decidir (¿ya tienes cuenta?) sigue en la pantalla de acceso.
  const needsAuth = session.enabled && (!session.user || !session.emailVerified || session.googleLink !== null)
  // Con hogar, los datos solo valen cuando está desbloqueado (antes, el hook aún tiene los locales).
  const isLoading =
    !session.ready || needsAuth || (session.householdId !== null && vault.status !== "unlocked") || isDataLoading
  // Hogar en la nube pero sin la clave en este dispositivo: hay que escribir la contraseña maestra.
  const isVaultLocked = session.ready && vault.status === "locked"

  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<MonthlyReport | null>(null)
  const [isReportsListOpen, setIsReportsListOpen] = useState(false)
  const [isEvolutionOpen, setIsEvolutionOpen] = useState(false)
  const [isGoalsOpen, setIsGoalsOpen] = useState(false)
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


  const [isPaidReconcileOpen, setIsPaidReconcileOpen] = useState(false)
  const [reconcileExpenses, setReconcileExpenses] = useState<Transaction[]>([])
  const [reconcileLabel, setReconcileLabel] = useState<{ monthName: string; year: number }>({ monthName: "", year: 0 })
  // Avisos breves (copiar fijos, importar), en lugar de `alert()`.
  const [flash, setFlash] = useState<Flash | null>(null)
  const closeFlash = useCallback(() => setFlash(null), [])

  const [transactionsToShow, setTransactionsToShow] = useState(5)

  useEffect(() => {
    setTransactionsToShow(5)
  }, [selectedMonth, selectedYear])

  const [monthToCloseReport, setMonthToCloseReport] = useState(getCurrentMonth())
  const [yearToCloseReport, setYearToCloseReport] = useState(getCurrentYear())

  // Memorizado: un array nuevo en cada render anulaba el `useMemo` de `useCalculations`.
  const allTransactionsForSelectedMonth = useMemo(
    () => getTransactionsForMonth(selectedMonth, selectedYear),
    [getTransactionsForMonth, selectedMonth, selectedYear],
  )

  // Copiar los fijos, ingresos y aportaciones del mes anterior (ver el hook).
  const copyPrevious = useCopyPreviousMonth({
    selectedMonth,
    selectedYear,
    monthTransactions: allTransactionsForSelectedMonth,
    getTransactionsForMonth,
    addTransaction,
    onFlash: setFlash,
  })
  const { hasNothingToCopy, previousMonthHasContributions } = copyPrevious

  const actualCurrentMonth = getCurrentMonth()
  const actualCurrentYear = getCurrentYear()

  const isSelectedMonthCurrent = selectedMonth === actualCurrentMonth && selectedYear === actualCurrentYear
  const isSelectedMonthFuture =
    selectedYear > actualCurrentYear ||
    (selectedYear === actualCurrentYear && selectedMonth > actualCurrentMonth)
  const { month: previousMonth, year: previousYear } = getPreviousMonthYear(actualCurrentMonth, actualCurrentYear)
  const isSelectedMonthPrevious = selectedMonth === previousMonth && selectedYear === previousYear
  // Primera fecha admitida al añadir una transacción: el mes anterior mientras no esté cerrado (a
  // principios de mes aún se apunta algo olvidado); si ya tiene informe, el mes actual.
  const isPreviousMonthClosedNow = !!getExistingReport(previousMonth, previousYear)
  const minTransactionDate = isPreviousMonthClosedNow
    ? `${actualCurrentYear}-${String(actualCurrentMonth).padStart(2, "0")}-01`
    : `${previousYear}-${String(previousMonth).padStart(2, "0")}-01`

  const calculations = useCalculations(allTransactionsForSelectedMonth)
  const existingReportForActualMonth = getExistingReport(actualCurrentMonth, actualCurrentYear)
  const existingReportForSelectedMonth = getExistingReport(selectedMonth, selectedYear)
  const { month: prevOfSelectedMonth, year: prevOfSelectedYear } = getPreviousMonthYear(selectedMonth, selectedYear)
  const isPreviousMonthClosed = !!getExistingReport(prevOfSelectedMonth, prevOfSelectedYear)
  // Un mes futuro solo se bloquea para copiar si el mes anterior aún no tiene informe cerrado.
  const isCopyBlockedByFuture = isSelectedMonthFuture && !isPreviousMonthClosed
  // Un mes pasado con informe está cerrado: sus transacciones son de solo lectura. Para cambiar
  // algo se borra su informe (si es el último), y el mes vuelve a quedar abierto.
  const isSelectedMonthLocked = !!existingReportForSelectedMonth && !isSelectedMonthCurrent && !isSelectedMonthFuture
  // Una transacción es de solo lectura si su mes es pasado y tiene informe (para los resultados
  // de otros meses al buscar).
  const isTransactionLocked = useCallback(
    (t: Transaction) => {
      const month = Number(t.date.slice(5, 7))
      const year = Number(t.date.slice(0, 4))
      const isPast = year < actualCurrentYear || (year === actualCurrentYear && month < actualCurrentMonth)
      return isPast && !!getExistingReport(month, year)
    },
    [actualCurrentMonth, actualCurrentYear, getExistingReport],
  )
  // Solo el último informe se puede borrar (p. ej. si se cerró el mes sin querer).
  const latestReportId = sortReportsDesc(data.reports)[0]?.id ?? null
  const cumulativeBalances = useMemo(() => calculateCumulativeBalances(data.transactions), [data.transactions])
  // Evolución mensual (ingresos, gastos y ahorro por mes) para la tarjeta del lateral y su modal.
  // Mi rol en el hogar (persona 1 o 2); `null` sin hogar en la nube.
  const viewerRole: Person | null = (session.user && householdInfo?.roles[session.user.uid]) || null
  // Evolución por cuenta (3.4.0): en pareja, la de quien mira o la compartida (ver `evolutionViewsFor`).
  const evolutionViews = useMemo(
    () =>
      evolutionViewsFor({
        viewer: viewerRole,
        singleMode: Boolean(data.config.singleMode),
        usesShared: cumulativeBalances.accounts.usesShared,
        person1Name: data.config.person1Name,
        person2Name: data.config.person2Name,
      }),
    [viewerRole, data.config.singleMode, data.config.person1Name, data.config.person2Name, cumulativeBalances.accounts.usesShared],
  )
  // La vista elegida se recuerda en este dispositivo y la sigue también la tarjeta del lateral (D-16).
  const [evolutionViewChoice, setEvolutionViewChoice] = useState<EvolutionView | null>(null)
  useEffect(() => {
    try {
      setEvolutionViewChoice(localStorage.getItem(EVOLUTION_VIEW_KEY) as EvolutionView | null)
    } catch {
      // Sin almacenamiento: la primera vista.
    }
  }, [])
  const chooseEvolutionView = useCallback((view: EvolutionView) => {
    setEvolutionViewChoice(view)
    try {
      localStorage.setItem(EVOLUTION_VIEW_KEY, view)
    } catch {
      // Sin almacenamiento, se elige de nuevo la próxima vez.
    }
  }, [])
  const evolutionView =
    evolutionViews.find((v) => v.value === evolutionViewChoice)?.value ?? evolutionViews[0].value
  const evolutionPoints = useMemo(() => monthlyEvolution(data.transactions, evolutionView), [data.transactions, evolutionView])
  // Metas de ahorro (3.3.0): se calculan sobre los meses terminados y cerrados (ver `lib/goals.ts`).
  const goalsSummary = useMemo(
    () => summarizeGoals(data.transactions, data.reports, data.goals ?? []),
    [data.transactions, data.reports, data.goals],
  )
  // El mes terminado sin informe más reciente, para el recordatorio de cierre.
  const latestUnclosed = goalsSummary.unclosedMonths.at(-1) ?? null
  const recentEvolution = useMemo(() => lastMonths(evolutionPoints, new Date(), 6), [evolutionPoints])
  const hasMoreTransactions = transactionsToShow < allTransactionsForSelectedMonth.length

  // Privacidad en pareja: si mi pareja me oculta sus transacciones individuales (mi rol, arriba).
  const isAmountHidden = useCallback(
    (t: Transaction) => isHiddenFromViewer(t, viewerRole, data.config),
    [viewerRole, data.config],
  )
  const handleHideOwnFromPartnerChange = (hidden: boolean) => {
    if (!viewerRole) return
    updateConfig({
      ...data.config,
      hideIndividualFromPartner: { ...data.config.hideIndividualFromPartner, [viewerRole]: hidden },
    })
  }

  // Nombres ya usados (sin los ajustes de cierre), del más reciente al más antiguo, para
  // sugerirlos al escribir el nombre de una transacción.
  const nameSuggestions = useMemo(() => {
    const seen = new Set<string>()
    const out: { name: string; type: Transaction["type"]; categoryId?: string }[] = []
    for (const t of [...data.transactions].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))) {
      const name = t.name.trim()
      const key = `${t.type}:${name.toLowerCase()}`
      if (!name || isClosingAdjustment(t) || seen.has(key)) continue
      seen.add(key)
      out.push({ name, type: t.type, categoryId: t.categoryId })
    }
    return out
  }, [data.transactions])

  // Al poner categoría a un nombre que ya se usó antes sin ella, se ofrece aplicarla a las anteriores.
  const [categorySpread, setCategorySpread] = useState<{
    name: string
    type: Transaction["type"]
    categoryId: string
    count: number
  } | null>(null)

  const handleAddOrUpdateTransaction = (transactionData: TransactionFormData) => {
    const editedId = editingTransaction?.id
    if (editingTransaction) {
      updateTransaction(editingTransaction.id, transactionData)
      setEditingTransaction(null)
    } else {
      addTransaction(transactionData)
    }

    const { name, type, categoryId } = transactionData
    if (!categoryId || isTourActive) return
    const target = normalizeName(name)
    const count = data.transactions.filter(
      (t) =>
        t.id !== editedId &&
        t.type === type &&
        !t.categoryId &&
        !isClosingAdjustment(t) &&
        normalizeName(t.name) === target,
    ).length
    if (count > 0) setCategorySpread({ name: name.trim(), type, categoryId, count })
  }

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setIsTransactionFormOpen(true)
  }

  const handleCloseTransactionForm = () => {
    setIsTransactionFormOpen(false)
    setEditingTransaction(null)
  }

  const handleOpenReportModalForCurrentMonth = () => {
    setMonthToCloseReport(actualCurrentMonth)
    setYearToCloseReport(actualCurrentYear)
    setIsReportModalOpen(true)
  }

  // Recordatorio de cierre (3.4.1): abre el cierre del mes terminado sin informe más reciente.
  const handleOpenReportModalForMonth = (month: number, year: number) => {
    setMonthToCloseReport(month)
    setYearToCloseReport(year)
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
    const { month, year } = reportDataFromModal
    const existingReport = getExistingReport(month, year)
    const previousSharedAdjustment = existingReport?.sharedAdjustment ?? 0
    createOrUpdateReport(reportDataFromModal, adjustmentTransactionsToCreate, existingReport?.id)
    setIsReportModalOpen(false)
    // Si cambia el ajuste de la compartida, los cierres siguientes con compartida dejan de cuadrar.
    const later = existingReport ? laterSharedClosings(data.reports, month, year) : []
    if (later.length > 0 && !isZeroMoney(subtractMoney(reportDataFromModal.sharedAdjustment ?? 0, previousSharedAdjustment))) {
      const next = later[0]
      setFlash({
        text: `Informe actualizado. Actualiza ahora el cierre de ${formatMonthYear(next.month, next.year)} para que la compartida vuelva a cuadrar.`,
        tone: "warning",
      })
    }
  }

  const handleViewReport = (report: MonthlyReport) => {
    setSelectedReport(report)
  }

  // Importar sirve igual en local y en la nube: los datos pasan por `replaceAllData`.
  // Antes de sustituir se descarga una copia de lo que había (si había algo), por si el archivo no era
  // el que tocaba.
  const handleImportData = (content: string): boolean => {
    const imported = parseImportedData(content)
    if (!imported.ok) {
      setFlash({ text: imported.error, tone: "error" })
      return false
    }
    const hadData = hasAppData(data)
    if (hadData) downloadAppData(data, "antes-de-importar")
    replaceAllData(imported.data)
    setFlash({
      text: hadData ? "Datos importados. Se ha descargado una copia de los anteriores." : "Datos importados.",
      tone: "success",
    })
    return true
  }

  const handleClearData = () => {
    replaceAllData({ transactions: [], reports: [], config: data.config, goals: [] })
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
  // Solo se envía lo que se ha cambiado en la ventana (3.1.1): si la pareja marcó o desmarcó algo
  // mientras estaba abierta, no se le deshace.
  const handleReconcileMarkAll = () => {
    const toPaid = reconcileExpenses.filter((e) => !e.paid).map((e) => e.id)
    if (toPaid.length) setTransactionsPaid(toPaid, true)
    finishReconcile()
  }

  // "Guardar": los marcados quedan pagados y los desmarcados, sin pagar (respecto a cómo se abrió).
  const handleReconcileSave = (paidIds: string[]) => {
    const paidSet = new Set(paidIds)
    const toPaid = reconcileExpenses.filter((e) => paidSet.has(e.id) && !e.paid).map((e) => e.id)
    const toUnpaid = reconcileExpenses.filter((e) => !paidSet.has(e.id) && e.paid).map((e) => e.id)
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
      // Gastos y aportaciones (las aportaciones se marcan como enviadas igual que un gasto pagado).
      const prevExpenses = getTransactionsForMonth(prevMonth, prevYear).filter(isPayable)
      const hasUnpaid = prevExpenses.some((t) => !t.paid)

      if (prevExpenses.length > 0 && hasUnpaid) {
        setReconcileExpenses(prevExpenses)
        setReconcileLabel({ monthName: getMonthName(prevMonth), year: prevYear })
        setIsPaidReconcileOpen(true)
      } else {
        // Nada pendiente del mes anterior: solo actualiza el marcador.
        setLastSeenMonth(currentKey)
      }
    }
    // Se ejecuta una sola vez, cuando terminan de cargar los datos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading])

  // --- Tour de bienvenida ---
  // Se muestra una sola vez por usuario: queda marcado en su perfil (en todos sus dispositivos)
  // y en este dispositivo. Sin cuenta (build solo local), solo en el dispositivo.
  const uid = session.user?.uid ?? null
  const isTourActive = tourData !== null
  // Durante el tour, la app de detrás queda inerte: ni el tabulador ni un lector de pantalla salen
  // del tour (el tour y sus modales van en portales, fuera de este contenedor).
  const appRootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    appRootRef.current?.toggleAttribute("inert", isTourActive)
  }, [isTourActive])
  const hasSeenTour = hasSeenTourOnDevice(uid) || Boolean(profile?.tourCompletedAt)
  // Con cuenta, hay que esperar al perfil para saber si ya lo vio.
  const isProfileReady = !session.enabled || profile !== null
  const isAnyModalOpen =
    isMasterCheckOpen ||
    recoveryCodeToShow !== null ||
    isPaidReconcileOpen ||
    isAccountModalOpen ||
    isTransactionFormOpen ||
    isReportModalOpen ||
    selectedReport !== null ||
    isReportsListOpen ||
    isEvolutionOpen ||
    isGoalsOpen ||
    isSettingsModalOpen ||
    isDocumentationModalOpen ||
    copyPrevious.isConfirmOpen
  const canAutoStartTour =
    !isTourActive && !hasSeenTour && isProfileReady && !isLoading && !isVaultLocked && !needsAuth && !isAnyModalOpen

  const startTour = useCallback(() => {
    // Siempre sobre el mes actual, con los nombres y el modo de la configuración real.
    setSelectedMonth(getCurrentMonth())
    setSelectedYear(getCurrentYear())
    window.scrollTo({ top: 0 })
    setTourData(createTourData(new Date(), data.config))
    setTourSteps(
      getTourSteps({
        person1Name: data.config.person1Name,
        person2Name: data.config.person2Name,
        singleMode: Boolean(data.config.singleMode),
        cloud: session.enabled,
        isDesktop: window.matchMedia("(min-width: 640px)").matches,
      }),
    )
  }, [data.config, session.enabled])

  // El tour abre el formulario de transacción y el cierre de mes para enseñarlos por dentro.
  const handleTourOpenChange = useCallback((open: TourWindow | null) => {
    setEditingTransaction(null)
    setIsTransactionFormOpen(open === "transaction-form")
    if (open === "close-month") {
      setMonthToCloseReport(getCurrentMonth())
      setYearToCloseReport(getCurrentYear())
    }
    setIsReportModalOpen(open === "close-month")
  }, [])

  const finishTour = useCallback(() => {
    setTourData(null)
    setTourSteps(null)
    setIsTransactionFormOpen(false)
    setIsReportModalOpen(false)
    markTourSeenOnDevice(uid)
    if (session.services && uid) recordTourCompleted(session.services.db, uid)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [uid, session.services])

  // Arranca solo la primera vez, cuando no hay ninguna otra ventana abierta. La espera deja que
  // se abran antes las que salen al cargar (p. ej. la de gastos pagados del mes anterior).
  useEffect(() => {
    if (!canAutoStartTour) return
    const timer = setTimeout(startTour, 600)
    return () => clearTimeout(timer)
  }, [canAutoStartTour, startTour])

  // La app exige una cuenta con el email verificado (si la build trae Firebase; si no, es solo local).
  if (session.ready && needsAuth) {
    return <AuthScreen session={session} />
  }

  if (isVaultLocked) {
    return <VaultUnlock session={session} vault={vault} onRecoveryCode={setRecoveryCodeToShow} />
  }

  // No se ha podido abrir el hogar: no se enseñan datos de otro sitio ni se guarda nada.
  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md space-y-4 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-600 mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">No se ha podido abrir tu hogar</h1>
          <p className="text-muted-foreground">{loadError}</p>
          <p className="text-sm text-muted-foreground">
            Tus datos siguen en la nube; no se ha cambiado nada. Comprueba la conexión y vuelve a intentarlo.
          </p>
          <Button onClick={() => window.location.reload()}>Reintentar</Button>
        </div>
      </div>
    )
  }

  // Los datos del hogar necesitan una versión más nueva que esta (ver `lib/app-version.ts`).
  if (householdInfo?.minAppVersion && isOlderVersion(APP_VERSION, householdInfo.minAppVersion)) {
    return <UpdateRequired minVersion={householdInfo.minAppVersion} />
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
    <NonModalContext.Provider value={isTourActive}>
    <div ref={appRootRef} className="min-h-screen bg-background">
      <header className="bg-card shadow-lg border-b border-border">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex justify-center items-center h-12 sm:h-16">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground relative">
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
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-600">{syncError}</p>
          </div>
        </div>
      )}

      {/* Documentos dañados que no se han podido leer: el resto funciona (ver `createDecryptingCache`). */}
      {householdInfo?.unreadable ? (
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-600">
              {householdInfo.unreadable === 1
                ? "Hay un movimiento o informe que no se ha podido leer (está dañado)."
                : `Hay ${householdInfo.unreadable} movimientos o informes que no se han podido leer (están dañados).`}{" "}
              El resto de tus datos funciona con normalidad y no se ha borrado nada.
            </p>
          </div>
        </div>
      ) : null}

      {/* Mes terminado sin cerrar: no cuenta para las metas (3.4.1). */}
      {!isTourActive && latestUnclosed && (
        <ClosingReminder
          month={latestUnclosed.month}
          year={latestUnclosed.year}
          olderCount={goalsSummary.unclosedMonths.length - 1}
          onCloseMonth={() => handleOpenReportModalForMonth(latestUnclosed.month, latestUnclosed.year)}
        />
      )}

      {/* Modo local: los datos solo están en este navegador (ver `LocalStorageNotice`). */}
      {!cloudTarget && !isTourActive && <LocalStorageNotice />}
      {/* Con cuenta: cómo instalarla en iPhone (Safari no lo ofrece solo). */}
      {cloudTarget && !isTourActive && <IosInstallNotice />}

      {/* Abajo, margen para que el footer fijo no tape el final de la página. */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-24">
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
          accounts={calculations.accounts}
          today={calculations.today}
          // "Hoy" solo tiene sentido si queda algo por pagar y el mes ya ha empezado.
          showToday={calculations.hasPendingExpenses && !isSelectedMonthFuture}
        />

        {/* Desde 1280 px, el lateral mide lo mismo que una tarjeta del resumen (4 columnas con
            separación de 24 px): así la lista de transacciones empieza donde empieza la tarjeta de Ingresos. */}
        <div className="flex flex-col lg:flex-row gap-8 xl:gap-6 mt-8">
          <aside className="w-full lg:w-80 xl:w-[calc((100%-72px)/4)] xl:shrink-0 space-y-8">
            <CumulativeBalanceCard
              totalBalance={cumulativeBalances.totalBalance}
              person1TotalBalance={cumulativeBalances.person1TotalBalance}
              person2TotalBalance={cumulativeBalances.person2TotalBalance}
              person1Name={data.config.person1Name}
              person2Name={data.config.person2Name}
              singleMode={data.config.singleMode}
              accounts={cumulativeBalances.accounts}
              onOpen={() => setIsGoalsOpen(true)}
            />

            <EvolutionCard
              points={recentEvolution}
              onOpen={() => setIsEvolutionOpen(true)}
              viewLabel={evolutionViews.length > 1 ? evolutionViews.find((v) => v.value === evolutionView)?.label : undefined}
            />

            <div data-tour="reports" className="bg-card rounded-2xl shadow-lg border">
              <div className="p-6 border-b border-border">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Informes
                </h3>
              </div>
              <div className="p-4">
                <div className="mb-4 flex gap-2">
                  {data.reports.length > 0 && (
                    // En PC la columna es estrecha: solo el icono, para que el otro botón quepa entero.
                    <Button
                      onClick={() => setIsReportsListOpen(true)}
                      variant="outline"
                      className="shrink-0 flex items-center gap-2 lg:px-3"
                      title="Ver todos los informes"
                      data-tour="reports-all"
                      aria-label="Ver todos los informes"
                    >
                      <List className="h-4 w-4" />
                      <span className="lg:hidden">Todos</span>
                    </Button>
                  )}
                  <Button
                    onClick={handleOpenReportModalForCurrentMonth}
                    variant="secondary"
                    className="flex-1 min-w-0 flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    {existingReportForActualMonth ? "Actualizar Mes Actual" : "Cerrar Mes Actual"}
                  </Button>
                </div>

                {/* Un mes pasado sin informe se puede cerrar (generar) siempre; actualizarlo, solo si es
                    el mes anterior al actual: los más antiguos ya son de solo lectura. */}
                {!isSelectedMonthCurrent &&
                  !isSelectedMonthFuture &&
                  (!existingReportForSelectedMonth || isSelectedMonthPrevious) && (
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
                    {sortReportsDesc(data.reports)
                      .slice(0, RECENT_REPORTS)
                      .map((report) => (
                        <ReportButton key={report.id} report={report} onClick={() => handleViewReport(report)} />
                      ))}
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* `min-w-0`: sin él, la tabla ensancha la columna y la página entera se desplaza en horizontal. */}
          <div className="flex-1 min-w-0 space-y-8">
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
              locked={isSelectedMonthLocked}
              allTransactions={data.transactions}
              isTransactionLocked={isTransactionLocked}
              isAmountHidden={isAmountHidden}
              categories={categoriesOf(data.config)}
            />
          </div>
        </div>
      </div>

      <FloatingActions
        onAdd={() => setIsTransactionFormOpen(true)}
        onCopy={copyPrevious.prepare}
        copyDisabled={hasNothingToCopy || isCopyBlockedByFuture}
        copyTitle={
          hasNothingToCopy
            ? previousMonthHasContributions
              ? "Ya hay gastos fijos, ingresos y aportaciones este mes"
              : "Ya hay gastos fijos e ingresos este mes"
            : isCopyBlockedByFuture
              ? "No se pueden copiar transacciones a un mes futuro hasta cerrar el informe del mes anterior"
              : previousMonthHasContributions
                ? "Copiar gastos fijos, ingresos y aportaciones del mes anterior"
                : "Copiar gastos fijos e ingresos del mes anterior"
        }
        onSettings={() => setIsSettingsModal(true)}
        onHelp={() => setIsDocumentationModalOpen(true)}
        isTourActive={isTourActive}
      />

      <ConfirmCopyModal
        isOpen={copyPrevious.isConfirmOpen}
        onClose={copyPrevious.closeConfirm}
        onConfirm={copyPrevious.confirm}
        monthName={getMonthName(selectedMonth)}
        year={selectedYear}
        transactions={copyPrevious.transactionsToCopy}
        isAmountHidden={isAmountHidden}
        {...copyPrevious.counts}
      />

      <CategorySpreadModal
        isOpen={categorySpread !== null}
        onClose={() => setCategorySpread(null)}
        onConfirm={() => {
          if (categorySpread) applyCategoryToName(categorySpread.name, categorySpread.type, categorySpread.categoryId)
          setCategorySpread(null)
        }}
        name={categorySpread?.name ?? ""}
        categoryName={categorySpread ? categoryNameOf(data.config, { categoryId: categorySpread.categoryId }) : ""}
        count={categorySpread?.count ?? 0}
      />

      <PaidReconciliationModal
        isOpen={isPaidReconcileOpen}
        monthName={reconcileLabel.monthName}
        year={reconcileLabel.year}
        expenses={reconcileExpenses}
        onMarkAll={handleReconcileMarkAll}
        onSave={handleReconcileSave}
        isAmountHidden={isAmountHidden}
      />

      <TransactionForm
        isOpen={isTransactionFormOpen}
        onClose={handleCloseTransactionForm}
        onSubmit={handleAddOrUpdateTransaction}
        transaction={editingTransaction || undefined}
        person1Name={data.config.person1Name}
        person2Name={data.config.person2Name}
        singleMode={data.config.singleMode}
        nameSuggestions={nameSuggestions}
        categories={categoriesOf(data.config)}
        minDate={minTransactionDate}
        viewerRole={viewerRole}
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
          allTransactions={data.transactions}
          laterSharedReports={laterSharedClosings(data.reports, monthToCloseReport, yearToCloseReport)}
        />
      )}

      <GoalsModal
        isOpen={isGoalsOpen}
        onClose={() => setIsGoalsOpen(false)}
        summary={goalsSummary}
        tabs={goalTabsFor({
          viewer: viewerRole,
          singleMode: Boolean(data.config.singleMode),
          usesShared: goalsSummary.usesShared,
          person1Name: data.config.person1Name,
          person2Name: data.config.person2Name,
        })}
        onAddGoal={addGoal}
        onUpdateGoal={updateGoal}
        onDeleteGoal={deleteGoal}
        onMoveToGoal={moveToGoal}
      />

      <EvolutionModal
        isOpen={isEvolutionOpen}
        onClose={() => setIsEvolutionOpen(false)}
        points={evolutionPoints}
        views={evolutionViews}
        view={evolutionView}
        onViewChange={chooseEvolutionView}
        currentYear={actualCurrentYear}
      />

      <ReportsListModal
        isOpen={isReportsListOpen}
        onClose={() => setIsReportsListOpen(false)}
        reports={data.reports}
        onViewReport={(report) => {
          setIsReportsListOpen(false)
          handleViewReport(report)
        }}
      />

      {selectedReport && (
        <ReportDetailModal
          isOpen={!!selectedReport}
          onClose={() => setSelectedReport(null)}
          report={selectedReport}
          person1Name={data.config.person1Name}
          person2Name={data.config.person2Name}
          singleMode={data.config.singleMode}
          config={data.config}
          onDelete={
            selectedReport.id === latestReportId
              ? () => {
                  deleteReport(selectedReport.id)
                  setSelectedReport(null)
                }
              : undefined
          }
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
        hidesOwnFromPartner={viewerRole ? Boolean(data.config.hideIndividualFromPartner?.[viewerRole]) : false}
        onHideOwnFromPartnerChange={viewerRole ? handleHideOwnFromPartnerChange : undefined}
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
        onStartTour={() => {
          setIsDocumentationModalOpen(false)
          startTour()
        }}
      />

      {tourSteps && <AppTour steps={tourSteps} onFinish={finishTour} onOpenChange={handleTourOpenChange} />}
      <UpdateNotice />
      <FlashMessage flash={flash} onClose={closeFlash} />
    </div>
    </NonModalContext.Provider>
  )
}
