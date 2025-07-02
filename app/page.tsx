/**
 * @file app/page.tsx
 * @description Este es el componente principal de la aplicación (la página de inicio).
 *              Es un Client Component (`"use client"`) porque gestiona el estado global
 *              de la aplicación, interactúa con el usuario y coordina otros componentes.
 *              Aquí se orquesta la carga de datos, la visualización de resúmenes,
 *              la tabla de transacciones, los modales de formularios, informes y configuración.
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import type { Transaction, MonthlyReport, TransactionFormData } from "@/types"
import { useFinancialData as useFinancialDataContext } from "@/hooks/use-financial-data" // Hook para la gestión de datos.
import { useCalculations } from "@/hooks/use-calculations" // Hook para cálculos financieros.
import { getCurrentMonth, getCurrentYear, formatMonthYear, calculateCumulativeBalances } from "@/lib/utils" // Utilidades de fecha y cálculos.
import { generateSampleData } from "@/lib/sample-data" // Función para generar datos de prueba.

// Importación de componentes de la aplicación.
import { SummaryCards } from "@/components/summary-cards"
import { TransactionsTable } from "@/components/transactions-table"
import { TransactionForm } from "@/components/transaction-form"
import { MonthlyReportModal as MonthlyReportModalComponent } from "@/components/monthly-report-modal" // Renombrado para evitar conflicto de nombres.
import { ReportDetailModal } from "@/components/report-detail-modal"
import { SettingsModal } from "@/components/settings-modal"
import { ThemeToggle } from "@/components/theme-toggle"
import { CumulativeBalanceCard } from "@/components/cumulative-balance-card"
import { DocumentationModal } from "@/components/documentation-modal"
import { ConfirmCopyModal } from "@/components/confirm-copy-modal"

// Importación de componentes UI de Shadcn y iconos.
import { Button } from "@/components/ui/button"
import { Plus, FileText, Settings, Calendar, Info, Heart, Copy } from "lucide-react"

/**
 * @function HomePage
 * @description Componente principal de la aplicación financiera.
 *              Gestiona el estado global, la lógica de negocio y la renderización de la interfaz.
 * @returns {JSX.Element} La estructura principal de la aplicación.
 */
export default function HomePage() {
  // Desestructuración del hook `useFinancialData` para acceder a los datos y funciones.
  const {
    data, // Todos los datos de la aplicación (transacciones, informes, config).
    isLoading, // Estado de carga inicial de los datos.
    addTransaction, // Función para añadir una transacción.
    updateTransaction, // Función para actualizar una transacción.
    deleteTransaction, // Función para eliminar una transacción.
    updateConfig, // Función para actualizar la configuración.
    createOrUpdateReport, // Función para crear/actualizar informes.
    getTransactionsForMonth, // Función para obtener transacciones de un mes específico.
    getExistingReport, // Función para obtener un informe existente.
    replaceAllData, // Función para reemplazar todos los datos.
  } = useFinancialDataContext()

  // Estados para controlar la visibilidad de los diferentes modales y formularios.
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<MonthlyReport | null>(null) // Informe seleccionado para ver detalles.
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null) // Transacción en edición.
  const [isSettingsModalOpen, setIsSettingsModal] = useState(false)
  const [isDocumentationModalOpen, setIsDocumentationModalOpen] = useState(false) // Estado para el modal de documentación.
  const [reportsListKey, setReportsListKey] = useState(0) // Clave para forzar la re-renderización de la lista de informes.

  // Estados para el mes y año actualmente seleccionados en la interfaz (afecta la tabla y el resumen).
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [selectedYear, setSelectedYear] = useState(getCurrentYear())
  
  // Estados para el modal de confirmación de copia de gastos fijos
  const [isConfirmCopyModalOpen, setIsConfirmCopyModalOpen] = useState(false)
  const [previousMonthFixedExpenses, setPreviousMonthFixedExpenses] = useState<Transaction[]>([])
  const [previousMonthName, setPreviousMonthName] = useState("")

  // Estado para el número de transacciones a mostrar en la tabla (para la carga infinita).
  const [transactionsToShow, setTransactionsToShow] = useState(5)

  /**
   * `useEffect` para resetear el contador de transacciones a mostrar (`transactionsToShow`)
   * cada vez que el mes o el año seleccionado cambian. Esto asegura que al cambiar de mes,
   * la tabla se reinicie mostrando solo las primeras 5 transacciones.
   */
  useEffect(() => {
    setTransactionsToShow(5)
  }, [selectedMonth, selectedYear]) // Dependencias: se ejecuta cuando `selectedMonth` o `selectedYear` cambian.

  // Estado para el mes y año que se pasarán al modal de informe (puede ser diferente al `selectedMonth/Year`).
  const [monthToCloseReport, setMonthToCloseReport] = useState(getCurrentMonth())
  const [yearToCloseReport, setYearToCloseReport] = useState(getCurrentYear())

  // Obtiene TODAS las transacciones para el mes y año seleccionados (sin límite de 5).
  const allTransactionsForSelectedMonth = getTransactionsForMonth(selectedMonth, selectedYear)
  
  // Verifica si hay gastos fijos en el mes actual
  const hasFixedExpensesInCurrentMonth = allTransactionsForSelectedMonth.some(
    (t) => t.type === "expense" && t.category === "fixed"
  )
  
  // Verificar si el mes seleccionado es mayor al mes actual
  const currentDate = new Date()
  const isFutureMonth = 
    selectedYear > currentDate.getFullYear() || 
    (selectedYear === currentDate.getFullYear() && selectedMonth > currentDate.getMonth() + 1)
  // Realiza cálculos financieros sobre todas las transacciones del mes seleccionado.
  const calculations = useCalculations(allTransactionsForSelectedMonth)

  // Obtiene el mes y año actuales del sistema para el botón "Cerrar Mes Actual".
  const actualCurrentMonth = getCurrentMonth()
  const actualCurrentYear = getCurrentYear()
  // Verifica si ya existe un informe para el mes actual del sistema.
  const existingReportForActualMonth = getExistingReport(actualCurrentMonth, actualCurrentYear)

  // Verifica si ya existe un informe para el mes y año actualmente VISUALIZADO en la tabla.
  const existingReportForSelectedMonth = getExistingReport(selectedMonth, selectedYear)

  // Calcula los balances acumulados de TODAS las transacciones en la aplicación.
  const cumulativeBalances = calculateCumulativeBalances(data.transactions)

  // Determina si hay más transacciones para cargar en la tabla (para el scroll infinito).
  const hasMoreTransactions = transactionsToShow < allTransactionsForSelectedMonth.length

  /**
   * `useEffect` para forzar la re-renderización de la lista de informes.
   * Se incrementa `reportsListKey` cada vez que `data.reports` cambia,
   * lo que hace que React re-renderice la lista de informes en la barra lateral.
   */
  useEffect(() => {
    console.log("HomePage: data.reports changed, incrementing reportsListKey.")
    setReportsListKey((prevKey) => prevKey + 1)
  }, [data.reports]) // Dependencia: se ejecuta cuando `data.reports` cambia.

  /**
   * @function handleAddOrUpdateTransaction
   * @description Manejador para añadir o actualizar una transacción.
   *              Determina si se está editando una transacción existente o añadiendo una nueva.
   * @param {TransactionFormData} transactionData - Los datos del formulario de transacción.
   * @returns {void}
   */
  const handleAddOrUpdateTransaction = (transactionData: TransactionFormData) => {
    if (editingTransaction) {
      updateTransaction(editingTransaction.id, transactionData) // Actualiza si hay una transacción en edición.
      setEditingTransaction(null) // Limpia el estado de edición.
    } else {
      addTransaction(transactionData) // Añade una nueva transacción.
    }
  }

  /**
   * @function handleEditTransaction
   * @description Manejador para iniciar la edición de una transacción.
   *              Establece la transacción a editar y abre el formulario.
   * @param {Transaction} transaction - La transacción a editar.
   * @returns {void}
   */
  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setIsTransactionFormOpen(true)
  }

  /**
   * @function handleCloseTransactionForm
   * @description Manejador para cerrar el formulario de transacción.
   *              También limpia el estado de la transacción en edición.
   * @returns {void}
   */
  const handleCloseTransactionForm = () => {
    setIsTransactionFormOpen(false)
    setEditingTransaction(null)
  }

  // Función para obtener el mes anterior
  const getPreviousMonthData = useCallback((month: number, year: number) => {
    let prevMonth = month - 1
    let prevYear = year
    
    if (prevMonth === 0) {
      prevMonth = 12
      prevYear--
    }
    
    return { prevMonth, prevYear }
  }, [])

  // Función para obtener el nombre del mes
  const getMonthName = (month: number) => {
    const date = new Date(2000, month, 1)
    return date.toLocaleString('es-ES', { month: 'long' })
  }

  // Función para preparar la copia de gastos fijos
  const prepareCopyFixedExpenses = useCallback(() => {
    const today = new Date()
    let prevMonth = today.getMonth()
    let prevYear = today.getFullYear()

   // Si es enero (0), el mes anterior es diciembre del año anterior
    if (prevMonth === 0) {
      prevMonth = 11 // Diciembre
      prevYear--
    } 

    const prevMonthName = getMonthName(prevMonth)
    
    // Obtener gastos fijos del mes anterior
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
  }, [selectedMonth, selectedYear, getPreviousMonthData])

  // Función para confirmar y copiar los gastos fijos
  const confirmCopyFixedExpenses = useCallback(() => {
    // Crear la fecha del primer día del mes seleccionado
    const targetDate = new Date(selectedYear, selectedMonth, 1);
    const formattedDate = targetDate.toISOString().split('T')[0];
    
    console.log(`Copiando ${previousMonthFixedExpenses.length} gastos fijos a ${formattedDate}`);

    previousMonthFixedExpenses.forEach((expense) => {
      // Crear una copia del gasto con la nueva fecha
      const newExpense: TransactionFormData = {
        type: expense.type,
        category: expense.category,
        name: `${expense.name} (copiado)`,
        amount: expense.amount,
        owner: expense.owner,
        person1Percentage: expense.person1Percentage || 50,
        person2Percentage: expense.person2Percentage || 50,
        date: formattedDate,  // Usamos la fecha formateada
      };
      
      console.log('Copiando gasto:', {
        originalDate: expense.date,
        newDate: formattedDate,
        name: expense.name,
        amount: expense.amount
      });

      // Añadir el nuevo gasto
      addTransaction(newExpense);
    });
    
    // Cerrar el modal y limpiar el estado
    setIsConfirmCopyModalOpen(false);
    setPreviousMonthFixedExpenses([]);
    
    // Mostrar feedback al usuario
    alert(`${previousMonthFixedExpenses.length} gastos fijos copiados a ${getMonthName(selectedMonth)} ${selectedYear}`);
  }, [previousMonthFixedExpenses, selectedMonth, selectedYear, addTransaction, getMonthName])

  /**
   * @function handleOpenReportModalForCurrentMonth
   * @description Abre el modal de informe para el mes y año actuales del sistema.
   * @returns {void}
   */
  const handleOpenReportModalForCurrentMonth = () => {
    setMonthToCloseReport(actualCurrentMonth)
    setYearToCloseReport(actualCurrentYear)
    setIsReportModalOpen(true)
  }

  /**
   * @function handleOpenReportModalForSelectedMonth
   * @description Abre el modal de informe para el mes y año actualmente seleccionados en la tabla.
   * @returns {void}
   */
  const handleOpenReportModalForSelectedMonth = () => {
    setMonthToCloseReport(selectedMonth)
    setYearToCloseReport(selectedYear)
    setIsReportModalOpen(true)
  }

  /**
   * @function handleReportSubmission
   * @description Manejador para la sumisión de un informe mensual desde el modal.
   *              Llama a `createOrUpdateReport` para procesar el informe y los ajustes.
   * @param {Omit<MonthlyReport, "id" | "createdAt" | "transactions" | "totalIncome" | "totalExpenses" | "person1Income" | "person2Income" | "person1Expenses" | "person2Expenses">} reportDataFromModal - Datos del informe desde el modal.
   * @param {Omit<Transaction, "id" | "createdAt">[]} adjustmentTransactionsToCreate - Transacciones de ajuste a crear.
   * @returns {void}
   */
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
    // Obtiene el informe existente para el mes/año del modal.
    const existingReport = getExistingReport(reportDataFromModal.month, reportDataFromModal.year)
    // Llama a la función del hook para crear o actualizar el informe.
    createOrUpdateReport(reportDataFromModal, adjustmentTransactionsToCreate, existingReport?.id)
    setIsReportModalOpen(false) // Cierra el modal de informe.
  }

  /**
   * @function handleViewReport
   * @description Manejador para ver los detalles de un informe mensual.
   *              Establece el informe seleccionado para mostrar el modal de detalle.
   * @param {MonthlyReport} report - El informe a visualizar.
   * @returns {void}
   */
  const handleViewReport = (report: MonthlyReport) => {
    setSelectedReport(report)
  }

  /**
   * @function handleImportData
   * @description Manejador para el resultado de la importación de datos.
   *              Recarga la página si la importación fue exitosa para reflejar los nuevos datos.
   * @param {boolean} success - Indica si la importación fue exitosa.
   * @returns {void}
   */
  const handleImportData = (success: boolean) => {
    if (success) {
      window.location.reload() // Recarga la página para que `loadData` obtenga los nuevos datos.
    } else {
      alert("Error al importar los datos. Verifica que el archivo sea válido.")
    }
  }

  /**
   * @function handleLoadSampleData
   * @description Manejador para cargar datos de prueba en la aplicación.
   *              Reemplaza los datos existentes con datos de ejemplo.
   * @returns {void}
   */
  const handleLoadSampleData = () => {
    const sampleTransactions = generateSampleData() // Genera transacciones de ejemplo.
    const newData = {
      ...data,
      transactions: sampleTransactions,
      reports: [], // Los informes se reinician al cargar datos de prueba.
    }
    replaceAllData(newData) // Reemplaza todos los datos.
  }

  /**
   * @function handleClearData
   * @description Manejador para eliminar todos los datos de la aplicación.
   *              Reinicia el estado de los datos a un estado vacío.
   * @returns {void}
   */
  const handleClearData = () => {
    const newData = {
      transactions: [],
      reports: [],
      config: data.config, // Mantiene la configuración de nombres.
    }
    replaceAllData(newData) // Reemplaza todos los datos con un estado vacío.
  }

  /**
   * @function handleLoadMoreTransactions
   * @description Función de callback para el scroll infinito en la tabla de transacciones.
   *              Incrementa el número de transacciones a mostrar en 5.
   *              Utiliza `useCallback` para memorizar la función.
   * @returns {void}
   */
  const handleLoadMoreTransactions = useCallback(() => {
    setTransactionsToShow((prev) => prev + 5) // Carga 5 transacciones más.
  }, []) // Dependencias vacías: la función no depende de ningún valor del scope.

  // Muestra un estado de carga inicial mientras los datos se cargan de localStorage.
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

  // Determina si el mes seleccionado en la interfaz es el mes actual del sistema.
  const isSelectedMonthCurrent = selectedMonth === actualCurrentMonth && selectedYear === actualCurrentYear

  // Determina si el mes seleccionado en la interfaz es un mes futuro.
  const isSelectedMonthFuture =
    selectedYear > actualCurrentYear || (selectedYear === actualCurrentYear && selectedMonth > actualCurrentMonth)

  return (
    <div className="min-h-screen bg-background">
      {/* Cabecera de la aplicación */}
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

      {/* Contenido principal de la página */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tarjetas de Resumen Mensual */}
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

        {/* Contenedor flexible para la tabla de transacciones y la barra lateral de informes.
            En móvil (`flex-col`), la barra lateral (`aside`) aparecerá antes de la tabla.
            En escritorio (`lg:flex-row`), la barra lateral aparecerá a la derecha. */}
        <div className="flex flex-col lg:flex-row gap-8 mt-8">
          {/* Barra lateral (Balance Acumulado e Informes Mensuales) */}
          <aside className="w-full lg:w-80 space-y-8">
            {/* Tarjeta de Balance Total Acumulado */}
            <CumulativeBalanceCard
              totalBalance={cumulativeBalances.totalBalance}
              person1TotalBalance={cumulativeBalances.person1TotalBalance}
              person2TotalBalance={cumulativeBalances.person2TotalBalance}
              person1Name={data.config.person1Name}
              person2Name={data.config.person2Name}
            />

            {/* Sección de Informes Mensuales */}
            <div className="bg-card rounded-2xl shadow-lg border">
              <div className="p-6 border-b border-border">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Informes Mensuales
                </h3>
              </div>
              {/* `key` para forzar la re-renderización de la lista de informes cuando cambian. */}
              <div key={reportsListKey} className="p-4 max-h-96 overflow-y-auto">
                {/* Botón para cerrar/actualizar el informe del mes actual del sistema. */}
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

                {/* Botón condicional para generar/actualizar informe del mes seleccionado en la tabla.
                    Solo se muestra si no es el mes actual del sistema y no es un mes futuro. */}
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

                {/* Mensaje si no hay informes generados. */}
                {data.reports.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted" />
                    <p className="text-sm">No hay informes generados</p>
                    <p className="text-xs text-muted-foreground mt-1">Cierra un mes para generar tu primer informe</p>
                  </div>
                ) : (
                  // Lista de informes generados.
                  <div className="space-y-2">
                    {[...data.reports] // Crea una copia para ordenar sin mutar el original.
                      .sort((a, b) => {
                        // Ordena los informes por año (descendente) y luego por mes (descendente).
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

          {/* Contenido principal: Tabla de Transacciones */}
          <div className="flex-1 space-y-8">
            <TransactionsTable
              transactions={allTransactionsForSelectedMonth} // Pasa la lista completa de transacciones del mes.
              person1Name={data.config.person1Name}
              person2Name={data.config.person2Name}
              onEdit={handleEditTransaction}
              onDelete={deleteTransaction}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onMonthChange={setSelectedMonth}
              onYearChange={setSelectedYear}
              transactionsToShowCount={transactionsToShow} // Número de transacciones a mostrar inicialmente.
              onLoadMore={handleLoadMoreTransactions} // Función para cargar más transacciones.
              hasMore={hasMoreTransactions} // Indica si hay más transacciones disponibles.
            />
          </div>
        </div>
      </div>

      {/* Botones flotantes en la esquina inferior izquierda */}
      <div className="mb-8 fixed bottom-6 left-6 flex flex-col gap-3 z-50">
        {/* Botón para añadir nueva transacción */}
        <Button onClick={() => setIsTransactionFormOpen(true)} variant="secondary" size="icon" className="shadow-lg">
          <Plus className="h-5 w-5" />
          <span className="sr-only">Nueva Transacción</span>
        </Button>
        
        {/* Botón para copiar gastos fijos del mes anterior */}
        <Button 
          onClick={prepareCopyFixedExpenses} 
          variant={hasFixedExpensesInCurrentMonth || isFutureMonth ? "outline" : "destructive"} 
          size="icon" 
          className={`shadow-lg ${!hasFixedExpensesInCurrentMonth && !isFutureMonth ? 'hover:bg-red-600' : 'opacity-50 cursor-not-allowed'}`}
          disabled={hasFixedExpensesInCurrentMonth || isFutureMonth}
          title={
            hasFixedExpensesInCurrentMonth 
              ? 'Ya hay gastos fijos este mes' 
              : isFutureMonth 
                ? 'No se pueden copiar gastos a meses futuros' 
                : 'Copiar gastos fijos del mes anterior'
          }
        >
          <Copy className="h-5 w-5" />
          <span className="sr-only">Copiar gastos fijos</span>
        </Button>
        
        {/* Botón para alternar tema (claro/oscuro) */}
        <ThemeToggle />
        
        {/* Botón para abrir la configuración */}
        <Button onClick={() => setIsSettingsModal(true)} variant="outline" size="icon" className="shadow-lg">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Configuración</span>
        </Button>
        
        {/* Botón para abrir la documentación */}
        <Button onClick={() => setIsDocumentationModalOpen(true)} variant="outline" size="icon" className="shadow-lg">
          <Info className="h-4 w-4" />
          <span className="sr-only">Documentación</span>
        </Button>
      </div>
      
      {/* Modal de confirmación para copiar gastos fijos */}
      <ConfirmCopyModal
        isOpen={isConfirmCopyModalOpen}
        onClose={() => setIsConfirmCopyModalOpen(false)}
        onConfirm={confirmCopyFixedExpenses}
        monthName={getMonthName(selectedMonth)}
        year={selectedYear}
        count={previousMonthFixedExpenses.length}
      />

      {/* Modales de la aplicación (renderizados condicionalmente) */}
      <TransactionForm
        isOpen={isTransactionFormOpen}
        onClose={handleCloseTransactionForm}
        onSubmit={handleAddOrUpdateTransaction}
        transaction={editingTransaction || undefined} // Pasa la transacción a editar o `undefined`.
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
          isOpen={!!selectedReport} // `!!` convierte el objeto a booleano.
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
