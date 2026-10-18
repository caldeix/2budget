/**
 * @file components/evolution-modal.tsx
 * @description Modal con la evolución completa: los doce meses de un año (ingresos, gastos y
 *              ahorro), con selector de año y los totales del año. En pareja (3.4.0), además, selector
 *              de cuenta: la tuya o la compartida (ver `monthlyEvolution`).
 */

"use client"

import { useState } from "react"
import { Modal } from "@/components/ui/modal"
import { EvolutionChart } from "@/components/evolution-chart"
import { yearPoints, yearsOf, type EvolutionView, type MonthPoint } from "@/lib/evolution"
import { formatCurrency } from "@/lib/utils"
import { sumMoney, subtractMoney } from "@/lib/money"

interface EvolutionModalProps {
  isOpen: boolean
  onClose: () => void
  /** Todos los meses con transacciones (ver `monthlyEvolution`). */
  points: MonthPoint[]
  currentYear: number
  /** Vistas que puede elegir quien mira (3.4.0): en pareja, su cuenta y la compartida. Con una sola, sin selector. */
  views: { value: EvolutionView; label: string }[]
  view: EvolutionView
  onViewChange: (view: EvolutionView) => void
}

export function EvolutionModal({ isOpen, onClose, points, currentYear, views, view, onViewChange }: EvolutionModalProps) {
  const years = yearsOf(points)
  const [chosen, setChosen] = useState<number | null>(null)
  // Por defecto, el año en curso (o el más reciente con datos).
  const year = chosen !== null && years.includes(chosen) ? chosen : years.includes(currentYear) ? currentYear : (years[0] ?? currentYear)
  const ofYear = yearPoints(points, year)
  const income = sumMoney(ofYear.map((p) => p.income))
  const expenses = sumMoney(ofYear.map((p) => p.expenses))
  const savings = subtractMoney(income, expenses)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Evolución" size="lg" centerTitle>
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {views.length > 1 && (
            <div className="flex items-center gap-2">
              <label htmlFor="evolution-view" className="text-sm text-muted-foreground">
                Cuenta
              </label>
              <select
                id="evolution-view"
                value={view}
                onChange={(e) => onViewChange(e.target.value as EvolutionView)}
                className="px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-input text-foreground"
              >
                {views.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <label htmlFor="evolution-year" className="text-sm text-muted-foreground">
              Año
            </label>
            <select
              id="evolution-year"
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
        </div>

        {/* Totales del año (en móvil, uno por línea: tres columnas no caben con importes largos) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center justify-between sm:block sm:text-center rounded-2xl bg-green-50 px-4 py-3">
            <p className="text-xs text-green-600">Ingresos</p>
            <p className="font-semibold text-green-600 tabular-nums">{formatCurrency(income)}</p>
          </div>
          <div className="flex items-center justify-between sm:block sm:text-center rounded-2xl bg-red-50 px-4 py-3">
            <p className="text-xs text-red-600">Gastos</p>
            <p className="font-semibold text-red-600 tabular-nums">{formatCurrency(expenses)}</p>
          </div>
          <div className="flex items-center justify-between sm:block sm:text-center rounded-2xl bg-primary/10 px-4 py-3">
            <p className="text-xs text-primary">Ahorro</p>
            <p className={`font-semibold tabular-nums ${savings >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(savings)}
            </p>
          </div>
        </div>

        <EvolutionChart points={ofYear} />
      </div>
    </Modal>
  )
}
