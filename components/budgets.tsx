/**
 * @file components/budgets.tsx
 * @description Presupuestos por categoría (3.5.0): la tarjeta del lateral con los más ajustados del mes
 *              que se está viendo y la ventana con todos y con los límites para editarlos. Desde la 3.7.0,
 *              por cuenta: los tuyos y los compartidos (ver `budgetTabsFor`). Los cálculos están en
 *              `lib/budgets.ts`.
 */

"use client"

import { useEffect, useState } from "react"
import { ChevronRight, PiggyBank } from "lucide-react"
import type { AppConfig } from "@/types"
import { budgetsOf, budgetStatuses, type BudgetLevel, type BudgetOwner, type BudgetStatus } from "@/lib/budgets"
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
function BudgetLine({ status, detailed = false, tag }: { status: BudgetStatus; detailed?: boolean; tag?: string }) {
  const pct = Math.min(100, Math.round(status.ratio * 100))
  return (
    <span className="block space-y-1">
      <span className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium text-foreground truncate">
          {status.category.name}
          {tag && <span className="font-normal text-muted-foreground"> · {tag}</span>}
        </span>
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
/** Un presupuesto de la tarjeta, con la cuenta a la que pertenece (en pareja se indica). */
export interface BudgetEntry {
  owner: BudgetOwner
  label: string
  status: BudgetStatus
}

export function BudgetsCard({
  entries,
  showOwner,
  month,
  year,
  onOpen,
}: {
  entries: BudgetEntry[]
  /** En pareja, cada línea dice de qué cuenta es. */
  showOwner: boolean
  month: number
  year: number
  onOpen: () => void
}) {
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
      {entries.length === 0 ? (
        <span className="block text-sm text-muted-foreground">
          Pon un límite al mes a las categorías que quieras vigilar (supermercado, ocio...) y verás cuánto llevas.
        </span>
      ) : (
        <span className="flex flex-col gap-3">
          {entries.slice(0, CARD_LIMIT).map((e) => (
            <BudgetLine key={`${e.owner}-${e.status.category.id}`} status={e.status} tag={showOwner ? e.label : undefined} />
          ))}
        </span>
      )}
      <span className="block text-xs text-muted-foreground">
        {formatMonthYear(month, year)} · {entries.length === 0 ? "pulsa para crearlos" : "pulsa para ver todos"}
      </span>
    </button>
  )
}

/**
 * @function BudgetsModal
 * @description Todos los presupuestos del mes de una cuenta (pestañas: los tuyos y los compartidos) y,
 *              en «Editar límites», un importe por categoría de gasto (vacío = sin presupuesto).
 */
export function BudgetsModal({
  isOpen,
  onClose,
  config,
  monthTransactions,
  month,
  year,
  tabs,
  onSave,
}: {
  isOpen: boolean
  onClose: () => void
  config: AppConfig
  monthTransactions: Transaction[]
  month: number
  year: number
  tabs: { owner: BudgetOwner; label: string }[]
  onSave: (owner: BudgetOwner, budgets: Record<string, number>) => void
}) {
  const [owner, setOwner] = useState<BudgetOwner>(tabs[0]?.owner ?? "person1")
  const active = tabs.some((t) => t.owner === owner) ? owner : (tabs[0]?.owner ?? "person1")
  const statuses = budgetStatuses(monthTransactions, config, active)
  const expenseCategories = categoriesOf(config).filter((c) => c.kind === "expense")
  const [isEditing, setIsEditing] = useState(false)
  const [limits, setLimits] = useState<Record<string, number>>({})

  // Al abrir o cambiar de cuenta, sin editar (salvo que no haya ninguno) y con los límites actuales.
  useEffect(() => {
    if (!isOpen) return
    setIsEditing(statuses.length === 0)
    setLimits({ ...budgetsOf(config, active) })
  }, [isOpen, active])

  const save = () => {
    // Solo los límites positivos de categorías que existen.
    const clean = Object.fromEntries(
      expenseCategories.filter((c) => (limits[c.id] ?? 0) > 0).map((c) => [c.id, limits[c.id]]),
    )
    onSave(active, clean)
    setIsEditing(false)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Presupuestos" size="lg">
      <div className="p-6 space-y-5">
        {tabs.length > 1 && (
          <div role="tablist" aria-label="Cuenta" className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.owner}
                type="button"
                role="tab"
                aria-selected={tab.owner === active}
                onClick={() => setOwner(tab.owner)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm",
                  tab.owner === active ? "border-foreground bg-foreground text-background" : "hover:bg-muted",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          {config.singleMode
            ? "Un límite al mes por categoría: cuentan todos los gastos de la categoría"
            : active === "shared"
              ? "Un límite al mes por categoría para los gastos compartidos (los «Ambos», enteros)"
              : "Un límite al mes por categoría para los gastos individuales (los 100 % de esta persona; su parte de los compartidos cuenta en los compartidos)"}{" "}
          en {formatMonthYear(month, year).toLowerCase()}, también los pendientes de pagar.
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
