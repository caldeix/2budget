/**
 * @file components/report-detail-modal.tsx
 * @description Este archivo define el componente `ReportDetailModal`, un modal
 *              que muestra un resumen detallado de un informe mensual específico.
 *              Incluye gráficos de pastel para la distribución de gastos e ingresos,
 *              y un desglose de las finanzas por persona.
 *              Es un Client Component (`"use client"`) debido al uso de `PieChart`.
 */

"use client"

import { useState } from "react"
import type { MonthlyReport } from "@/types"
import { Button } from "@/components/ui/button" // Componente de botón.
import { Trash2 } from "lucide-react" // Icono de borrar.
import { Modal } from "@/components/ui/modal" // Componente base del modal.
import { PieChart } from "@/components/ui/chart" // Componente de gráfico de pastel.
import { formatCurrency, formatMonthYear } from "@/lib/utils" // Utilidades de formato.
import { subtractMoney } from "@/lib/money" // Resta monetaria exacta.
import { shouldShowPerson2 } from "@/lib/single-mode" // Visibilidad de la Persona 2 en modo individual.

/**
 * @interface ReportDetailModalProps
 * @description Define las propiedades que acepta el componente `ReportDetailModal`.
 * @property {boolean} isOpen - Controla la visibilidad del modal.
 * @property {() => void} onClose - Función para cerrar el modal.
 * @property {MonthlyReport} report - El objeto `MonthlyReport` que se va a mostrar.
 * @property {string} person1Name - Nombre de la Persona 1.
 * @property {string} person2Name - Nombre de la Persona 2.
 * @property {boolean} [singleMode] - Modo individual: oculta la Persona 2 si el informe no tiene cifras suyas.
 * @property {() => void} [onDelete] - Borra el informe y sus ajustes. Solo se pasa para el último informe.
 */
interface ReportDetailModalProps {
  isOpen: boolean
  onClose: () => void
  report: MonthlyReport
  person1Name: string
  person2Name: string
  singleMode?: boolean
  onDelete?: () => void
}

/**
 * @function ReportDetailModal
 * @description Componente modal que muestra los detalles de un informe mensual.
 *              Presenta un resumen general, gráficos de distribución y detalles por persona.
 * @param {ReportDetailModalProps} props - Propiedades del componente.
 * @returns {JSX.Element} El componente modal de detalle de informe.
 */
export function ReportDetailModal({
  isOpen,
  onClose,
  report,
  person1Name,
  person2Name,
  singleMode,
  onDelete,
}: ReportDetailModalProps) {
  // Borrar pide una segunda confirmación dentro del propio modal.
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  // Un informe cerrado en pareja conserva su desglose aunque luego se active el modo individual.
  const showPerson2 = shouldShowPerson2(
    singleMode,
    report.person2Income,
    report.person2Expenses,
    report.person2RealMoney,
    report.person2Adjustment,
  )

  /**
   * Datos para el gráfico de pastel de gastos.
   * Filtra las transacciones del informe por tipo 'expense' y categoría ('fixed' o 'variable'),
   * y suma sus montos.
   */
  const expenseChartData = [
    {
      label: "fijo", // Etiqueta para gastos fijos.
      value: report.transactions
        .filter((t) => t.type === "expense" && t.category === "fixed")
        .reduce((sum, t) => sum + t.amount, 0),
      color: "hsl(var(--red-600))", // Color rojo para gastos fijos.
    },
    {
      label: "variable", // Etiqueta para gastos variables.
      value: report.transactions
        .filter((t) => t.type === "expense" && t.category === "variable")
        .reduce((sum, t) => sum + t.amount, 0),
      color: "hsl(var(--orange-600))", // Color naranja para gastos variables.
    },
  ]

  /**
   * Datos para el gráfico de pastel de ingresos.
   * Utiliza los ingresos calculados para cada persona del objeto `report`.
   */
  const incomeChartData = [
    {
      label: person1Name, // Etiqueta para la Persona 1.
      value: report.person1Income, // Ingresos de la Persona 1.
      color: "hsl(var(--green-600))", // Color verde para Persona 1.
    },
    {
      label: person2Name, // Etiqueta para la Persona 2.
      value: report.person2Income, // Ingresos de la Persona 2.
      color: "hsl(var(--primary))", // Color primario para Persona 2.
    },
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Informe de ${formatMonthYear(report.month, report.year)}`} // Título dinámico del modal.
      size="xl" // Tamaño extra grande para el modal de detalle.
      centerTitle
    >
      <div className="p-6 space-y-8">
        {/* Sección de Resumen General */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tarjeta de Ingresos Totales */}
          <div className="bg-green-50 rounded-2xl p-4">
            <h3 className="font-semibold text-green-600 mb-2">Ingresos Totales</h3>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(report.totalIncome)}</p>
          </div>
          {/* Tarjeta de Gastos Totales */}
          <div className="bg-red-50 rounded-2xl p-4">
            <h3 className="font-semibold text-red-600 mb-2">Gastos Totales</h3>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(report.totalExpenses)}</p>
          </div>
          {/* Tarjeta de Balance Total */}
          <div className="bg-primary/10 rounded-2xl p-4">
            <h3 className="font-semibold text-primary mb-2">Balance</h3>
            <p
              className={`text-2xl font-bold ${subtractMoney(report.totalIncome, report.totalExpenses) >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {formatCurrency(subtractMoney(report.totalIncome, report.totalExpenses))}
            </p>
          </div>
        </div>

        {/* Sección de Gráficos */}
        <div className={`grid grid-cols-1 gap-8 ${showPerson2 ? "lg:grid-cols-2" : ""}`}>
          {/* Gráfico de Distribución de Gastos */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4 text-center">Distribución de Gastos</h3>
            <PieChart data={expenseChartData} size={250} />
          </div>
          {/* Gráfico de Distribución de Ingresos (por persona: sin Persona 2 no aporta nada) */}
          {showPerson2 && (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4 text-center">Distribución de Ingresos</h3>
              <PieChart data={incomeChartData} size={250} />
            </div>
          )}
        </div>

        {/* Sección de Detalles por Persona */}
        <div className={`grid grid-cols-1 gap-6 ${showPerson2 ? "md:grid-cols-2" : ""}`}>
          {/* Detalles de Persona 1 */}
          <div className="bg-muted rounded-2xl p-4">
            <h3 className="font-semibold text-foreground mb-4">{person1Name}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ingresos:</span>
                <span className="font-medium text-green-600">{formatCurrency(report.person1Income)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gastos:</span>
                <span className="font-medium text-red-600">{formatCurrency(report.person1Expenses)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">Balance calculado:</span>
                <span
                  className={`font-medium ${subtractMoney(report.person1Income, report.person1Expenses) >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {formatCurrency(subtractMoney(report.person1Income, report.person1Expenses))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dinero real:</span>
                <span className="font-medium text-foreground">{formatCurrency(report.person1RealMoney)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ajuste:</span>
                <span className={`font-medium ${report.person1Adjustment >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(report.person1Adjustment)}
                </span>
              </div>
            </div>
          </div>

          {/* Detalles de Persona 2 */}
          {showPerson2 && (
            <div className="bg-muted rounded-2xl p-4">
              <h3 className="font-semibold text-foreground mb-4">{person2Name}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ingresos:</span>
                  <span className="font-medium text-green-600">{formatCurrency(report.person2Income)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gastos:</span>
                  <span className="font-medium text-red-600">{formatCurrency(report.person2Expenses)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground">Balance calculado:</span>
                  <span
                    className={`font-medium ${subtractMoney(report.person2Income, report.person2Expenses) >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {formatCurrency(subtractMoney(report.person2Income, report.person2Expenses))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dinero real:</span>
                  <span className="font-medium text-foreground">{formatCurrency(report.person2RealMoney)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ajuste:</span>
                  <span className={`font-medium ${report.person2Adjustment >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(report.person2Adjustment)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sección de Estadísticas Adicionales */}
        <div className="bg-muted rounded-2xl p-4">
          <h3 className="font-semibold text-foreground mb-4">Estadísticas del mes</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total transacciones:</p>
              <p className="font-medium text-foreground">{report.transactions.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Gastos fijos:</p>
              <p className="font-medium text-foreground">
                {report.transactions.filter((t) => t.category === "fixed").length}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Gastos variables:</p>
              <p className="font-medium text-foreground">
                {report.transactions.filter((t) => t.category === "variable").length}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Ingresos:</p>
              <p className="font-medium text-foreground">
                {report.transactions.filter((t) => t.type === "income").length}
              </p>
            </div>
          </div>
        </div>

        {/* Borrar el informe (solo el último): por si se cerró el mes sin querer. */}
        {onDelete && (
          <div className="border-t pt-6">
            {isConfirmingDelete ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                <p className="text-sm text-foreground">
                  Se borrará el informe de {formatMonthYear(report.month, report.year)} y sus transacciones de ajuste.
                  El mes volverá a quedar abierto, como antes de cerrarlo.
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsConfirmingDelete(false)}>
                    Cancelar
                  </Button>
                  <Button variant="destructive" onClick={onDelete}>
                    Borrar informe
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="flex items-center gap-2 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                  Borrar informe
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
