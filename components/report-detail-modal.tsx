/**
 * @file components/report-detail-modal.tsx
 * @description Este archivo define el componente `ReportDetailModal`, un modal
 *              que muestra un resumen detallado de un informe mensual específico.
 *              Incluye gráficos de pastel para la distribución de gastos e ingresos,
 *              y un desglose de las finanzas por persona.
 *              Es un Client Component (`"use client"`) debido al uso de `PieChart`.
 */

"use client"

import type { MonthlyReport } from "@/types"
import { Modal } from "@/components/ui/modal" // Componente base del modal.
import { PieChart } from "@/components/ui/chart" // Componente de gráfico de pastel.
import { formatCurrency, formatMonthYear } from "@/lib/utils" // Utilidades de formato.

/**
 * @interface ReportDetailModalProps
 * @description Define las propiedades que acepta el componente `ReportDetailModal`.
 * @property {boolean} isOpen - Controla la visibilidad del modal.
 * @property {() => void} onClose - Función para cerrar el modal.
 * @property {MonthlyReport} report - El objeto `MonthlyReport` que se va a mostrar.
 * @property {string} person1Name - Nombre de la Persona 1.
 * @property {string} person2Name - Nombre de la Persona 2.
 */
interface ReportDetailModalProps {
  isOpen: boolean
  onClose: () => void
  report: MonthlyReport
  person1Name: string
  person2Name: string
}

/**
 * @function ReportDetailModal
 * @description Componente modal que muestra los detalles de un informe mensual.
 *              Presenta un resumen general, gráficos de distribución y detalles por persona.
 * @param {ReportDetailModalProps} props - Propiedades del componente.
 * @returns {JSX.Element} El componente modal de detalle de informe.
 */
export function ReportDetailModal({ isOpen, onClose, report, person1Name, person2Name }: ReportDetailModalProps) {
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
              className={`text-2xl font-bold ${(report.totalIncome - report.totalExpenses) >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {formatCurrency(report.totalIncome - report.totalExpenses)}
            </p>
          </div>
        </div>

        {/* Sección de Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Gráfico de Distribución de Gastos */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Distribución de Gastos</h3>
            <PieChart data={expenseChartData} size={250} />
          </div>
          {/* Gráfico de Distribución de Ingresos */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Distribución de Ingresos</h3>
            <PieChart data={incomeChartData} size={250} />
          </div>
        </div>

        {/* Sección de Detalles por Persona */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  className={`font-medium ${(report.person1Income - report.person1Expenses) >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {formatCurrency(report.person1Income - report.person1Expenses)}
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
                  className={`font-medium ${(report.person2Income - report.person2Expenses) >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {formatCurrency(report.person2Income - report.person2Expenses)}
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
      </div>
    </Modal>
  )
}
