/**
 * @file components/reports-list-modal.tsx
 * @description Lista de informes mensuales: el botón de cada informe (también usado en la tarjeta
 *              "Informes" de la página, que solo muestra los últimos) y el modal con todos los
 *              informes, filtrables por año.
 */

"use client"

import { useMemo, useState } from "react"
import type { MonthlyReport } from "@/types"
import { Modal } from "@/components/ui/modal"
import { formatCurrency, formatMonthYear } from "@/lib/utils"
import { subtractMoney } from "@/lib/money"

/**
 * @function sortReportsDesc
 * @description Informes del más reciente al más antiguo (por mes del informe, no por fecha de creación).
 */
export function sortReportsDesc(reports: MonthlyReport[]): MonthlyReport[] {
  return [...reports].sort((a, b) => (a.year !== b.year ? b.year - a.year : b.month - a.month))
}

/**
 * @function ReportButton
 * @description Botón de un informe: mes y balance. Al pulsarlo se abre su detalle.
 */
export function ReportButton({ report, onClick }: { report: MonthlyReport; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors border border-border"
    >
      <div className="font-medium text-foreground">{formatMonthYear(report.month, report.year)}</div>
      <div className="text-sm text-muted-foreground mt-1">
        Balance: {formatCurrency(subtractMoney(report.totalIncome, report.totalExpenses))}
      </div>
    </button>
  )
}

/**
 * @function ReportsListModal
 * @description Modal con todos los informes, con un filtro por año (por defecto, el más reciente).
 */
export function ReportsListModal({
  isOpen,
  onClose,
  reports,
  onViewReport,
}: {
  isOpen: boolean
  onClose: () => void
  reports: MonthlyReport[]
  onViewReport: (report: MonthlyReport) => void
}) {
  const sorted = useMemo(() => sortReportsDesc(reports), [reports])
  const years = useMemo(() => [...new Set(sorted.map((r) => r.year))], [sorted])
  // `null`: todos los años.
  const [year, setYear] = useState<number | null>(null)
  const selectedYear = year !== null && years.includes(year) ? year : null
  const visible = selectedYear === null ? sorted : sorted.filter((r) => r.year === selectedYear)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Todos los informes">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="reports-year" className="text-sm text-muted-foreground">
            Año
          </label>
          <select
            id="reports-year"
            value={selectedYear ?? "all"}
            onChange={(e) => setYear(e.target.value === "all" ? null : Number(e.target.value))}
            className="px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-input text-foreground"
          >
            <option value="all">Todos</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {visible.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">No hay informes</p>
        ) : (
          <div className="space-y-2">
            {visible.map((report) => (
              <ReportButton key={report.id} report={report} onClick={() => onViewReport(report)} />
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
