/**
 * @file components/budgets.tsx
 * @description Presupuestos por categoría (3.5.0): la tarjeta del lateral con los más ajustados del mes
 *              que se está viendo y la ventana con todos y con los límites para editarlos. Los cálculos
 *              están en `lib/budgets.ts`.
 */

"use client"

import { useEffect, useState } from "react"
import { ChevronRight, PiggyBank } from "lucide-react"
import type { AppConfig } from "@/types"
import { budgetStatuses, type BudgetLevel, type BudgetStatus } from "@/lib/budgets"
import { categoriesOf } from "@/lib/categories"
import { cn, formatCurrency, formatMonthYear } from "@/lib/utils"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { AmountInput } from "@/components/ui/amount-input"
import type { Transaction } from "@/types"

/** Color de la barra según el nivel: bien, cerca del límite o pasado. */
const barColor: Record<BudgetLevel, string> = {
  ok: "bg-green-600",
  warning: "bg-amber-500",
  over: "bg-red-600",
}

/** Lo que queda (o lo que se ha pasado), en palabras. */
const leftText = (s: BudgetStatus) =>
  s.left >= 0 ? `Quedan ${formatCurrency(s.left)}` : `Te has pasado ${formatCurrency(-s.left)}`

/** Una línea de presupuesto: categoría, gastado de límite y barra. */
function BudgetLine({ status, detailed = false }: { status: BudgetStatus; detailed?: boolean }) {
  const pct = Math.min(100, Math.round(status.ratio * 100))
  return (
    <span className="block space-y-1">
      <span className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium text-foreground truncate">{status.category.name}</span>
        <span className="tabular-nums text-muted-foreground whitespace-nowrap">
          {formatCurrency(status.spent)} de {formatCurrency(status.limit)}
        </span>
      </span>
      <span
        className="block h-2 rounded-full bg-muted overflow-hidden"
        role="progressbar"
        aria-label={`Presupuesto de ${status.category.name}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(status.ratio * 100)}
        aria-valuetext={`${formatCurrency(status.spent)} de ${formatCurrency(status.limit)}`}
      >
        <span className={cn("block h-full rounded-full", barColor[status.level])} style={{ width: `${pct}%` }} />
      </span>
      <span
        className={cn(
          "block text-xs",
          status.level === "over" ? "text-red-600" : status.level === "warning" ? "text-amber-600" : "text-muted-foreground",
        )}
      >
        {leftText(status)}
        {detailed && status.paid !== status.spent ? ` · pagado ${formatCurrency(status.paid)}` : ""}
      </span>
    </span>
  )
}

/** Cuántos se enseñan en la tarjeta del lateral (los más ajustados). */
const CARD_LIMIT = 4

/**
 * @function BudgetsCard
 * @description Tarjeta del lateral: los presupuestos más ajustados del mes que se está viendo. Toda
 *              la tarjeta es un botón que abre la ventana con todos.
 */
export function BudgetsCard({ statuses, month, year, onOpen }: { statuses: BudgetStatus[]; month: number; year: number; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      data-tour="budgets"
      className="w-full text-left bg-card rounded-2xl shadow-lg border p-6 space-y-4 hover:bg-muted/40 transition-colors"
    >
      <span className="flex items-center justify-between">
        <span className="text-lg font-semibold text-foreground flex items-center gap-2">
          <PiggyBank className="h-5 w-5" />
          Presupuestos
        </span>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </span>
      {statuses.length === 0 ? (
        <span className="block text-sm text-muted-foreground">
          Pon un límite al mes a las categorías que quieras vigilar (supermercado, ocio...) y verás cuánto llevas.
        </span>
      ) : (
        <span className="flex flex-col gap-3">
          {statuses.slice(0, CARD_LIMIT).map((s) => (
            <BudgetLine key={s.category.id} status={s} />
          ))}
        </span>
      )}
      <span className="block text-xs text-muted-foreground">
        {formatMonthYear(month, year)} · {statuses.length === 0 ? "pulsa para crearlos" : "pulsa para ver todos"}
      </span>
    </button>
  )
}

/**
 * @function BudgetsModal
 * @description Todos los presupuestos del mes y, en «Editar límites», un importe por categoría de gasto
 *              (vacío = sin presupuesto).
 */
export function BudgetsModal({
  isOpen,
  onClose,
  config,
  monthTransactions,
  month,
  year,
  onSave,
}: {
  isOpen: boolean
  onClose: () => void
  config: AppConfig
  monthTransactions: Transaction[]
  month: number
  year: number
  onSave: (budgets: Record<string, number>) => void
}) {
  const statuses = budgetStatuses(monthTransactions, config)
  const expenseCategories = categoriesOf(config).filter((c) => c.kind === "expense")
  const [isEditing, setIsEditing] = useState(false)
  const [limits, setLimits] = useState<Record<string, number>>({})

  // Al abrir, sin editar y con los límites actuales.
  useEffect(() => {
    if (!isOpen) return
    setIsEditing(statuses.length === 0)
    setLimits({ ...(config.budgets ?? {}) })
  }, [isOpen])

  const save = () => {
    // Solo los límites positivos de categorías que existen.
    const clean = Object.fromEntries(
      expenseCategories.filter((c) => (limits[c.id] ?? 0) > 0).map((c) => [c.id, limits[c.id]]),
    )
    onSave(clean)
    setIsEditing(false)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Presupuestos" size="lg">
      <div className="p-6 space-y-5">
        <p className="text-sm text-muted-foreground">
          Un límite al mes por categoría para todo el hogar: cuentan todos los gastos de la categoría en{" "}
          {formatMonthYear(month, year).toLowerCase()}, también los pendientes de pagar.
        </p>

        {isEditing ? (
          <div className="space-y-3">
            {expenseCategories.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3">
                <label htmlFor={`budget-${c.id}`} className="text-sm text-foreground">
                  {c.name}
                </label>
                <div className="w-36">
                  <AmountInput
                    id={`budget-${c.id}`}
                    value={limits[c.id] ?? 0}
                    onValueChange={(value) => setLimits((prev) => ({ ...prev, [c.id]: value }))}
                    emptyWhenZero
                    placeholder="Sin límite"
                  />
                </div>
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => (statuses.length === 0 ? onClose() : setIsEditing(false))}>
                Cancelar
              </Button>
              <Button type="button" onClick={save}>
                Guardar límites
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {statuses.map((s) => (
              <BudgetLine key={s.category.id} status={s} detailed />
            ))}
            <Button type="button" variant="outline" className="w-full" onClick={() => setIsEditing(true)}>
              Editar límites
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
