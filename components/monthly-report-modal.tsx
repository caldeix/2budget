/**
 * @file components/monthly-report-modal.tsx
 * @description Este archivo define el componente `MonthlyReportModal`, un modal utilizado
 *              para "cerrar" un mes financiero. Permite al usuario introducir el dinero real
 *              disponible para cada persona y calcula los ajustes necesarios, generando
 *              transacciones de ajuste si hay diferencias.
 *              Es un Client Component (`"use client"`) debido al uso de estados y efectos.
 */

"use client"

import type React from "react"
import { useEffect, useState, useMemo } from "react"
import type { MonthlyReport, Transaction } from "@/types"
import { Modal } from "@/components/ui/modal" // Componente base del modal.
import { Button } from "@/components/ui/button" // Componente de botón.
import { Input } from "@/components/ui/input" // Componente de input.
import { Label } from "@/components/ui/label" // Componente de etiqueta para inputs.
import { formatCurrency, formatMonthYear } from "@/lib/utils" // Utilidades de formato.
import { useCalculations } from "@/hooks/use-calculations" // Hook para cálculos financieros.
import { AlertTriangle, CheckCircle, Plus, Minus } from "lucide-react" // Iconos.

/**
 * @interface MonthlyReportModalProps
 * @description Define las propiedades que acepta el componente `MonthlyReportModal`.
 * @property {boolean} isOpen - Controla la visibilidad del modal.
 * @property {() => void} onClose - Función para cerrar el modal.
 * @property {(reportBaseData: Omit<MonthlyReport, "id" | "createdAt" | "transactions">, adjustmentTransactions: Omit<Transaction, "id" | "createdAt">[]) => void} onSave - Función que se llama al guardar el informe. Recibe los datos base del informe y las transacciones de ajuste a crear.
 * @property {number} month - El mes para el que se está generando/actualizando el informe.
 * @property {number} year - El año para el que se está generando/actualizando el informe.
 * @property {Transaction[]} transactions - Las transacciones del mes y año actuales.
 * @property {string} person1Name - Nombre de la Persona 1.
 * @property {string} person2Name - Nombre de la Persona 2.
 * @property {MonthlyReport} [existingReport] - Objeto de informe mensual existente si se está actualizando uno.
 */
interface MonthlyReportModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (
    reportBaseData: Omit<MonthlyReport, "id" | "createdAt" | "transactions">,
    adjustmentTransactions: Omit<Transaction, "id" | "createdAt">[],
  ) => void
  month: number
  year: number
  transactions: Transaction[]
  person1Name: string
  person2Name: string
  existingReport?: MonthlyReport
}

/**
 * @function MonthlyReportModal
 * @description Componente modal para cerrar un mes financiero y generar un informe.
 *              Permite al usuario introducir el dinero real y calcula los ajustes necesarios.
 * @param {MonthlyReportModalProps} props - Propiedades del componente.
 * @returns {JSX.Element} El componente modal.
 */
export function MonthlyReportModal({
  isOpen,
  onClose,
  onSave,
  month,
  year,
  transactions,
  person1Name,
  person2Name,
  existingReport,
}: MonthlyReportModalProps) {
  // Estado para el dinero real disponible de la Persona 1.
  const [person1RealMoney, setPerson1RealMoney] = useState(0)
  // Estado para el dinero real disponible de la Persona 2.
  const [person2RealMoney, setPerson2RealMoney] = useState(0)
  // Estado para controlar si el formulario está en proceso de envío.
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Hook `useCalculations` para obtener los balances calculados de las transacciones del mes.
  const calculations = useCalculations(transactions)

  /**
   * `useEffect` para inicializar los estados del dinero real cuando el modal se abre
   * o cuando se proporciona un informe existente (para edición).
   */
  useEffect(() => {
    if (isOpen) {
      if (existingReport) {
        // Si hay un informe existente, precarga los valores de dinero real.
        setPerson1RealMoney(existingReport.person1RealMoney)
        setPerson2RealMoney(existingReport.person2RealMoney)
      } else {
        // Si es un nuevo informe, reinicia los valores a cero.
        setPerson1RealMoney(0)
        setPerson2RealMoney(0)
      }
      setIsSubmitting(false) // Asegura que el estado de envío esté en falso al abrir.
    }
  }, [isOpen, existingReport]) // Dependencias: se ejecuta cuando `isOpen` o `existingReport` cambian.

  // Balances calculados para cada persona a partir de las transacciones del mes.
  const person1CalculatedBalance = calculations.person1Balance
  const person2CalculatedBalance = calculations.person2Balance

  // Ajustes calculados: diferencia entre el dinero real y el balance calculado.
  const person1Adjustment = person1RealMoney - person1CalculatedBalance
  const person2Adjustment = person2RealMoney - person2CalculatedBalance

  /**
   * @function createAdjustmentTransactions
   * @description Función auxiliar para crear las transacciones de ajuste basadas en los cálculos.
   *              Estas transacciones se añadirán al sistema para equilibrar los balances.
   * @returns {Omit<Transaction, "id" | "createdAt">[]} Un array de transacciones de ajuste (sin ID ni fecha de creación).
   */
  const createAdjustmentTransactions = (): Omit<Transaction, "id" | "createdAt">[] => {
    const adjustmentTransactionsArray: Omit<Transaction, "id" | "createdAt">[] = []
    // Calcula el último día del mes para la fecha de las transacciones de ajuste.
    const lastDayOfMonth = new Date(year, month, 0).getDate()
    const adjustmentDate = `${year}-${month.toString().padStart(2, "0")}-${lastDayOfMonth.toString().padStart(2, "0")}`

    // Si el ajuste de la Persona 1 es significativo (mayor o igual a 0.01), crea una transacción de ajuste.
    if (Math.abs(person1Adjustment) >= 0.01) {
      adjustmentTransactionsArray.push({
        type: person1Adjustment > 0 ? "income" : "expense", // Si el ajuste es positivo, es un ingreso; si es negativo, un gasto.
        category: person1Adjustment > 0 ? "income" : "variable", // Categoría según el tipo de ajuste.
        name: `Ajuste ${person1Name} - Cierre ${formatMonthYear(month, year)}`, // Nombre descriptivo.
        amount: Math.abs(person1Adjustment), // Cantidad absoluta del ajuste.
        owner: "person1", // Atribuido a la Persona 1.
        person1Percentage: 100, // 100% para Persona 1.
        person2Percentage: 0, // 0% para Persona 2.
        date: adjustmentDate, // Fecha de la transacción de ajuste.
      })
    }

    // Si el ajuste de la Persona 2 es significativo, crea una transacción de ajuste.
    if (Math.abs(person2Adjustment) >= 0.01) {
      adjustmentTransactionsArray.push({
        type: person2Adjustment > 0 ? "income" : "expense",
        category: person2Adjustment > 0 ? "income" : "variable",
        name: `Ajuste ${person2Name} - Cierre ${formatMonthYear(month, year)}`,
        amount: Math.abs(person2Adjustment),
        owner: "person2",
        person1Percentage: 0,
        person2Percentage: 100,
        date: adjustmentDate,
      })
    }
    return adjustmentTransactionsArray
  }

  /**
   * @function handleSubmitForm
   * @description Manejador del evento de envío del formulario.
   *              Recopila los datos del informe y las transacciones de ajuste,
   *              y llama a la función `onSave` proporcionada por el padre.
   * @param {React.FormEvent} e - El evento de formulario.
   * @returns {void}
   */
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault() // Previene el comportamiento por defecto del formulario (recarga de página).
    setIsSubmitting(true) // Establece el estado de envío a true para deshabilitar el botón.

    // Prepara los datos base del informe, excluyendo propiedades que se generarán o calcularán en el hook.
    const reportBaseData: Omit<MonthlyReport, "id" | "createdAt" | "transactions"> = {
      month,
      year,
      person1RealMoney,
      person2RealMoney,
      person1Adjustment,
      person2Adjustment,
      totalIncome: calculations.totalIncome,
      totalExpenses: calculations.totalExpenses,
      person1Income: calculations.person1Income,
      person2Income: calculations.person2Income,
      person1Expenses: calculations.person1Expenses,
      person2Expenses: calculations.person2Expenses,
    }

    // Genera las transacciones de ajuste.
    const adjustmentTransactionsToCreate = createAdjustmentTransactions()

    try {
      // Llama a la función `onSave` del componente padre, pasando los datos del informe
      // y las transacciones de ajuste.
      onSave(reportBaseData, adjustmentTransactionsToCreate)
    } catch (error) {
      console.error("Error in handleSubmitForm (MonthlyReportModal):", error)
      setIsSubmitting(false) // Si hay un error, permite reintentar.
    }
  }

  /**
   * `useMemo` para previsualizar las transacciones de ajuste.
   * Se recalcula solo cuando las dependencias relacionadas con los ajustes cambian.
   */
  const previewAdjustmentTransactions = useMemo(() => {
    return createAdjustmentTransactions()
  }, [
    person1RealMoney,
    person2RealMoney,
    person1CalculatedBalance,
    person2CalculatedBalance,
    month,
    year,
    person1Name,
    person2Name,
  ])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      // El título del modal cambia si se está actualizando un informe existente.
      title={
        existingReport
          ? `Actualizar informe de ${formatMonthYear(month, year)}`
          : `Cerrar mes de ${formatMonthYear(month, year)}`
      }
      size="lg" // Tamaño del modal.
    >
      <form onSubmit={handleSubmitForm} className="p-6 space-y-6">
        {/* Mensaje de advertencia si ya existe un informe para este mes */}
        {existingReport && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-600">Informe existente</h3>
                <p className="text-sm text-amber-600 mt-1">
                  Ya existe un informe para este mes. Al continuar, sobrescribirás los datos existentes y se crearán
                  nuevas transacciones de ajuste si es necesario.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Sección de resumen del mes (antes de ajustes) */}
        <div className="bg-muted rounded-2xl p-4">
          <h3 className="font-semibold text-foreground mb-4">Resumen del mes (antes de ajustes)</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Ingresos totales:</p>
              <p className="font-medium text-green-600">{formatCurrency(calculations.totalIncome)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Gastos totales:</p>
              <p className="font-medium text-red-600">{formatCurrency(calculations.totalExpenses)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Balance {person1Name}:</p>
              <p className={`font-medium ${person1CalculatedBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(person1CalculatedBalance)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Balance {person2Name}:</p>
              <p className={`font-medium ${person2CalculatedBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(person2CalculatedBalance)}
              </p>
            </div>
          </div>
        </div>

        {/* Sección para introducir el dinero real disponible */}
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground">Dinero real disponible al final del mes</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="person1Money">{person1Name} (€)</Label>
              <Input
                id="person1Money"
                type="number"
                step="0.01"
                value={person1RealMoney}
                onChange={(e) => setPerson1RealMoney(Number.parseFloat(e.target.value) || 0)}
                required
                disabled={isSubmitting} // Deshabilita el input mientras se envía el formulario.
              />
            </div>
            <div>
              <Label htmlFor="person2Money">{person2Name} (€)</Label>
              <Input
                id="person2Money"
                type="number"
                step="0.01"
                value={person2RealMoney}
                onChange={(e) => setPerson2RealMoney(Number.parseFloat(e.target.value) || 0)}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>

        {/* Sección de ajustes calculados y previsualización de transacciones de ajuste */}
        {/* Solo se muestra si hay ajustes significativos para alguna de las personas. */}
        {(Math.abs(person1Adjustment) >= 0.01 || Math.abs(person2Adjustment) >= 0.01) && (
          <div className="bg-secondary/10 rounded-2xl p-4">
            <h3 className="font-semibold text-foreground mb-4">Ajustes calculados</h3>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <p className="text-muted-foreground">Ajuste {person1Name}:</p>
                <p className={`font-medium ${person1Adjustment >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(person1Adjustment)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Ajuste {person2Name}:</p>
                <p className={`font-medium ${person2Adjustment >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(person2Adjustment)}
                </p>
              </div>
            </div>
            {/* Muestra la lista de transacciones de ajuste si hay alguna. */}
            {previewAdjustmentTransactions.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-medium text-foreground mb-3">
                  Transacciones de ajuste que se crearán ({previewAdjustmentTransactions.length}):
                </h4>
                <div className="space-y-2">
                  {previewAdjustmentTransactions.map((transaction, index) => (
                    <div key={index} className="flex items-center justify-between bg-card rounded-2xl p-3 border">
                      <div className="flex items-center gap-3">
                        {/* Icono de ajuste (Plus para ingreso, Minus para gasto) */}
                        <div
                          className={`p-1 rounded-full ${transaction.type === "income" ? "bg-green-100" : "bg-red-100"}`}
                        >
                          {transaction.type === "income" ? (
                            <Plus className="h-4 w-4 text-green-600" />
                          ) : (
                            <Minus className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{transaction.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {transaction.type === "income" ? "Ingreso" : "Gasto"} -{" "}
                            {transaction.owner === "person1" ? person1Name : person2Name}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`font-semibold ${transaction.type === "income" ? "text-green-600" : "text-red-600"}`}
                      >
                        {transaction.type === "income" ? "+" : "-"}
                        {formatCurrency(transaction.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {/* Botones de acción del formulario */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              // Muestra un spinner y texto de "Cargando..." mientras se envía.
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                {existingReport ? "Actualizando..." : "Generando..."}
              </div>
            ) : (
              // Muestra el texto y el icono normales cuando no se está enviando.
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                {existingReport ? "Actualizar Informe" : "Generar Informe"}
                {/* Muestra un contador de ajustes si se van a crear. */}
                {previewAdjustmentTransactions.length > 0 && (
                  <span className="bg-primary/20 px-2 py-1 rounded text-xs">
                    +{previewAdjustmentTransactions.length} ajuste{previewAdjustmentTransactions.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
