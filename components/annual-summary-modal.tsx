/**
 * @file components/annual-summary-modal.tsx
 * @description Resumen anual (3.6.0): totales, por persona, por categoría y por mes de un año, con
 *              descarga para Excel (CSV) e impresión o PDF. Los cálculos están en `lib/annual-summary.ts`.
 */

"use client"

import { useMemo, useState } from "react"
import { Download, Printer } from "lucide-react"
import type { AppConfig, Transaction } from "@/types"
import { annualSummary, annualSummaryCsv, annualSummaryHtml, summaryYears, type CategoryRow } from "@/lib/annual-summary"
import { formatCurrency, getMonthName } from "@/lib/utils"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"

interface AnnualSummaryModalProps {
  isOpen: boolean
  onClose: () => void
  transactions: Transaction[]
  config: AppConfig
  currentYear: number
}

/** Descarga un texto como fichero. */
function downloadText(content: string, fileName: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const pct = (value: number) => `${value.toFixed(1).replace(".", ",")} %`

function CategoryTable({ title, rows }: { title: string; rows: CategoryRow[] }) {
  if (rows.length === 0) return null
  return (
    <section className="space-y-2">
      <h3 className="font-semibold text-foreground">{title}</h3>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} className="border-b last:border-b-0">
                <td className="px-3 py-2 text-foreground">{row.name}</td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">{formatCurrency(row.amount)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground w-20">{pct(row.share)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function AnnualSummaryModal({ isOpen, onClose, transactions, config, currentYear }: AnnualSummaryModalProps) {
  const years = useMemo(() => summaryYears(transactions), [transactions])
  const [chosen, setChosen] = useState<number | null>(null)
  const year = chosen !== null && years.includes(chosen) ? chosen : years.includes(currentYear) ? currentYear : (years[0] ?? currentYear)
  const summary = useMemo(() => annualSummary(transactions, config, year), [transactions, config, year])
  const [notice, setNotice] = useState<string | null>(null)

  const handleCsv = () => downloadText(annualSummaryCsv(summary), `2budget-resumen-${year}.csv`, "text/csv;charset=utf-8")

  // Imprimir (o «Guardar como PDF» en el diálogo de impresión) en una ventana aparte con el resumen
  // solo. Si el navegador no deja abrirla (p. ej. en la app instalada del iPhone), se descarga el
  // resumen como página para abrirlo e imprimirlo desde ahí.
  const handlePrint = () => {
    const html = annualSummaryHtml(summary)
    const win = window.open("", "_blank")
    if (!win) {
      downloadText(html, `2budget-resumen-${year}.html`, "text/html;charset=utf-8")
      setNotice("No se ha podido abrir la ventana de impresión: se ha descargado el resumen como página para imprimirlo desde ahí.")
      return
    }
    win.document.write(html)
    win.document.close()
    win.focus()
    win.print()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Resumen anual" size="lg">
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="summary-year" className="text-sm text-muted-foreground">
              Año
            </label>
            <select
              id="summary-year"
              value={year}
              onChange={(e) => setChosen(Number(e.target.value))}
              className="px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-input text-foreground"
            >
              {(years.length ? years : [currentYear]).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={handleCsv}>
              <Download className="h-4 w-4" /> Excel (CSV)
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={handlePrint}>
              <Printer className="h-4 w-4" /> Imprimir o PDF
            </Button>
          </div>
        </div>
        {notice && <p className="text-sm text-muted-foreground">{notice}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center justify-between sm:block sm:text-center rounded-2xl bg-green-50 px-4 py-3">
            <p className="text-xs text-green-600">Ingresos</p>
            <p className="font-semibold text-green-600 tabular-nums">{formatCurrency(summary.income)}</p>
          </div>
          <div className="flex items-center justify-between sm:block sm:text-center rounded-2xl bg-red-50 px-4 py-3">
            <p className="text-xs text-red-600">Gastos</p>
            <p className="font-semibold text-red-600 tabular-nums">{formatCurrency(summary.expenses)}</p>
          </div>
          <div className="flex items-center justify-between sm:block sm:text-center rounded-2xl bg-primary/10 px-4 py-3">
            <p className="text-xs text-primary">Ahorro</p>
            <p className={`font-semibold tabular-nums ${summary.savings >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(summary.savings)}
            </p>
          </div>
        </div>
        {summary.nonComputable > 0 && (
          <p className="text-sm text-muted-foreground">
            De los gastos, {formatCurrency(summary.nonComputable)} son no computables.
          </p>
        )}

        {summary.people.length > 1 && (
          <section className="space-y-2">
            <h3 className="font-semibold text-foreground">Por persona</h3>
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm min-w-[28rem]">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium"></th>
                    <th className="px-3 py-2 text-right font-medium">Ingresos</th>
                    <th className="px-3 py-2 text-right font-medium">Gastos</th>
                    <th className="px-3 py-2 text-right font-medium">Balance</th>
                    <th className="px-3 py-2 text-right font-medium">A la compartida</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.people.map((p) => (
                    <tr key={p.name} className="border-b last:border-b-0 tabular-nums">
                      <td className="px-3 py-2 text-foreground">{p.name}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(p.income)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(p.expenses)}</td>
                      <td className={`px-3 py-2 text-right ${p.balance >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(p.balance)}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">{formatCurrency(p.contributed)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Ingresos y gastos de cada uno con su parte de lo compartido, como en el resumen del mes.
            </p>
          </section>
        )}

        <CategoryTable title="Gastos por categoría" rows={summary.expensesByCategory} />
        <CategoryTable title="Ingresos por categoría" rows={summary.incomeByCategory} />

        {summary.months.length > 0 && (
          <section className="space-y-2">
            <h3 className="font-semibold text-foreground">Por mes</h3>
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm min-w-[24rem]">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Mes</th>
                    <th className="px-3 py-2 text-right font-medium">Ingresos</th>
                    <th className="px-3 py-2 text-right font-medium">Gastos</th>
                    <th className="px-3 py-2 text-right font-medium">Ahorro</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.months.map((m) => (
                    <tr key={m.month} className="border-b last:border-b-0 tabular-nums">
                      <td className="px-3 py-2 text-foreground">{getMonthName(m.month)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(m.income)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(m.expenses)}</td>
                      <td className={`px-3 py-2 text-right ${m.savings >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(m.savings)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </Modal>
  )
}
