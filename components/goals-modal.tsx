/**
 * @file components/goals-modal.tsx
 * @description Metas de ahorro (3.3.0), desde el Total acumulado. Cada uno ve sus metas (sobre su
 *              cuenta) y las compartidas (sobre la compartida); las de la pareja no se muestran (D-12).
 *              El dinero sale de los meses terminados y cerrados; lo que no se asigna queda en
 *              «Sin asignar». Si el mes en curso va en negativo, se ve cuánto baja cada meta.
 *              Los cálculos están en `lib/goals.ts`.
 */

"use client"

import type React from "react"
import { useState } from "react"
import { AlertTriangle, Minus, Pencil, Plus, Target, Trash2 } from "lucide-react"
import type { GoalOwner } from "@/types"
import type { GoalPool, GoalView, GoalsSummary } from "@/lib/goals"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AmountInput } from "@/components/ui/amount-input"
import { cn, formatCurrency, getMonthName } from "@/lib/utils"

/** Pestaña de la ventana: una cuenta con su nombre. */
export interface GoalsTab {
  owner: GoalOwner
  label: string
}

interface GoalsModalProps {
  isOpen: boolean
  onClose: () => void
  summary: GoalsSummary
  /** Cuentas que puede ver quien mira (ver `goalTabsFor`). */
  tabs: GoalsTab[]
  onAddGoal: (name: string, owner: GoalOwner, target?: number) => void
  onUpdateGoal: (id: string, changes: { name: string; target?: number }) => void
  onDeleteGoal: (id: string) => void
  onMoveToGoal: (id: string, amount: number) => void
}

/** Qué se está haciendo con una meta: añadir o quitar dinero, editarla o confirmar el borrado. */
type GoalAction = { id: string; kind: "add" | "remove" | "edit" | "delete" } | null

export function GoalsModal({ isOpen, onClose, summary, tabs, onAddGoal, onUpdateGoal, onDeleteGoal, onMoveToGoal }: GoalsModalProps) {
  const [owner, setOwner] = useState<GoalOwner>(tabs[0]?.owner ?? "person1")
  const active = tabs.some((t) => t.owner === owner) ? owner : (tabs[0]?.owner ?? "person1")
  const pool = summary.pools[active]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Metas de ahorro" size="lg">
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

        <PoolView
          key={active}
          pool={pool}
          unclosedMonths={summary.unclosedMonths}
          onAddGoal={(name, target) => onAddGoal(name, active, target)}
          onUpdateGoal={onUpdateGoal}
          onDeleteGoal={onDeleteGoal}
          onMoveToGoal={onMoveToGoal}
        />
      </div>
    </Modal>
  )
}

function PoolView({
  pool,
  unclosedMonths,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  onMoveToGoal,
}: {
  pool: GoalPool
  unclosedMonths: GoalsSummary["unclosedMonths"]
  onAddGoal: (name: string, target?: number) => void
  onUpdateGoal: GoalsModalProps["onUpdateGoal"]
  onDeleteGoal: GoalsModalProps["onDeleteGoal"]
  onMoveToGoal: GoalsModalProps["onMoveToGoal"]
}) {
  const [action, setAction] = useState<GoalAction>(null)
  const [isCreating, setIsCreating] = useState(false)
  const monthToday = pool.month.today
  const totalReduction = pool.goals.reduce((sum, g) => sum + g.reduction, 0)
  const expectedMore = pool.goals.some((g) => g.expectedReduction > g.reduction)

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-muted p-3">
          <dt className="text-muted-foreground">Ahorrado en meses cerrados</dt>
          <dd className="text-lg font-semibold tabular-nums text-foreground">{formatCurrency(pool.available)}</dd>
        </div>
        <div className="rounded-xl bg-muted p-3">
          <dt className="text-muted-foreground">Sin asignar</dt>
          <dd className="text-lg font-semibold tabular-nums text-green-600">{formatCurrency(pool.unassigned)}</dd>
        </div>
      </dl>

      {unclosedMonths.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {unclosedMonths.length === 1 ? "El mes de " : "Los meses de "}
          {unclosedMonths.map((m) => `${getMonthName(m.month)} ${m.year}`).join(", ")}{" "}
          {unclosedMonths.length === 1 ? "ha terminado pero no está cerrado" : "han terminado pero no están cerrados"}: su dinero
          se podrá asignar cuando cierres su informe.
        </p>
      )}

      {totalReduction > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-700">
            Este mes va en {formatCurrency(monthToday)} con lo ya pagado: se ha gastado lo sin asignar y las metas bajan{" "}
            {formatCurrency(totalReduction)}, empezando por la última a la que añadiste dinero. Si el mes se recupera,
            vuelven a su cifra.
          </p>
        </div>
      )}
      {expectedMore && (
        <p className="text-sm text-muted-foreground">
          Si se cumple lo previsto ({formatCurrency(pool.month.expected)} este mes), las metas bajarían más: se ve en cada una.
        </p>
      )}

      <div className="space-y-3">
        {pool.goals.length === 0 && !isCreating && (
          <p className="text-sm text-muted-foreground">
            Aún no hay metas. Crea una y añádele dinero de lo sin asignar.
          </p>
        )}
        {pool.goals.map((view) => (
          <GoalRow
            key={view.goal.id}
            view={view}
            unassigned={pool.unassigned}
            action={action?.id === view.goal.id ? action.kind : null}
            onAction={(kind) => setAction(kind ? { id: view.goal.id, kind } : null)}
            onUpdateGoal={onUpdateGoal}
            onDeleteGoal={onDeleteGoal}
            onMoveToGoal={onMoveToGoal}
          />
        ))}
      </div>

      {isCreating ? (
        <GoalForm
          title="Meta nueva"
          submitLabel="Crear meta"
          onSubmit={(name, target) => {
            onAddGoal(name, target)
            setIsCreating(false)
          }}
          onCancel={() => setIsCreating(false)}
        />
      ) : (
        <Button type="button" variant="outline" className="w-full gap-2" onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4" /> Nueva meta
        </Button>
      )}
    </div>
  )
}

function GoalRow({
  view,
  unassigned,
  action,
  onAction,
  onUpdateGoal,
  onDeleteGoal,
  onMoveToGoal,
}: {
  view: GoalView
  unassigned: number
  action: "add" | "remove" | "edit" | "delete" | null
  onAction: (kind: "add" | "remove" | "edit" | "delete" | null) => void
  onUpdateGoal: GoalsModalProps["onUpdateGoal"]
  onDeleteGoal: GoalsModalProps["onDeleteGoal"]
  onMoveToGoal: GoalsModalProps["onMoveToGoal"]
}) {
  const { goal, current, reduction, expectedReduction } = view
  const progress = goal.target ? Math.min(100, Math.max(0, (current / goal.target) * 100)) : null

  return (
    <article className="rounded-2xl border p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-medium text-foreground flex items-center gap-2 break-words">
            <Target className="h-4 w-4 text-primary shrink-0" /> {goal.name}
          </h4>
          <p className="text-sm text-muted-foreground tabular-nums">
            <span className="font-semibold text-foreground">{formatCurrency(current)}</span>
            {goal.target ? ` de ${formatCurrency(goal.target)}` : ""}
            {reduction > 0 && <span className="text-amber-600"> · baja {formatCurrency(reduction)} por este mes</span>}
            {expectedReduction > reduction && (
              <span> · con lo previsto bajaría {formatCurrency(expectedReduction)}</span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label={`Editar ${goal.name}`} onClick={() => onAction(action === "edit" ? null : "edit")}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0 hover:text-destructive" aria-label={`Borrar ${goal.name}`} onClick={() => onAction(action === "delete" ? null : "delete")}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {progress !== null && (
        <div className="h-2 rounded-full bg-muted overflow-hidden" role="progressbar" aria-label={`Progreso de ${goal.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
          <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
      )}

      {action === null && (
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => onAction("add")} disabled={unassigned <= 0}>
            <Plus className="h-4 w-4" /> Añadir dinero
          </Button>
          <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => onAction("remove")} disabled={current <= 0}>
            <Minus className="h-4 w-4" /> Quitar dinero
          </Button>
        </div>
      )}

      {(action === "add" || action === "remove") && (
        <MoveForm
          kind={action}
          max={action === "add" ? unassigned : current}
          onSubmit={(amount) => {
            onMoveToGoal(goal.id, action === "add" ? amount : -amount)
            onAction(null)
          }}
          onCancel={() => onAction(null)}
        />
      )}

      {action === "edit" && (
        <GoalForm
          title="Editar meta"
          submitLabel="Guardar"
          initialName={goal.name}
          initialTarget={goal.target}
          onSubmit={(name, target) => {
            onUpdateGoal(goal.id, { name, target })
            onAction(null)
          }}
          onCancel={() => onAction(null)}
        />
      )}

      {action === "delete" && (
        <div className="rounded-xl border border-destructive/40 p-3 space-y-3">
          <p className="text-sm text-foreground">
            Se borrará la meta «{goal.name}». Su dinero ({formatCurrency(current)}) vuelve a «Sin asignar».
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => onAction(null)}>
              Cancelar
            </Button>
            <Button type="button" size="sm" variant="destructive" onClick={() => onDeleteGoal(goal.id)}>
              Borrar meta
            </Button>
          </div>
        </div>
      )}
    </article>
  )
}

/** Cuánto añadir a una meta (hasta lo sin asignar) o quitarle (hasta lo que tiene). */
function MoveForm({
  kind,
  max,
  onSubmit,
  onCancel,
}: {
  kind: "add" | "remove"
  max: number
  onSubmit: (amount: number) => void
  onCancel: () => void
}) {
  const [amount, setAmount] = useState(0)
  const tooMuch = amount > max
  const id = `goal-move-${kind}`

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (amount > 0 && !tooMuch) onSubmit(amount)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Label htmlFor={id}>{kind === "add" ? "Añadir de lo sin asignar" : "Devolver a «Sin asignar»"}</Label>
      <div className="flex gap-2">
        <AmountInput id={id} value={amount} onValueChange={setAmount} emptyWhenZero autoFocus />
        <Button type="button" variant="outline" size="sm" className="h-10 shrink-0" onClick={() => setAmount(max)}>
          Todo
        </Button>
      </div>
      <p className={cn("text-xs", tooMuch ? "text-destructive" : "text-muted-foreground")}>
        {kind === "add" ? "Sin asignar" : "En la meta"}: {formatCurrency(max)}
        {tooMuch ? " · no hay tanto" : ""}
      </p>
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={amount <= 0 || tooMuch}>
          {kind === "add" ? "Añadir" : "Quitar"}
        </Button>
      </div>
    </form>
  )
}

/** Nombre y objetivo opcional de una meta. */
function GoalForm({
  title,
  submitLabel,
  initialName = "",
  initialTarget,
  onSubmit,
  onCancel,
}: {
  title: string
  submitLabel: string
  initialName?: string
  initialTarget?: number
  onSubmit: (name: string, target?: number) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initialName)
  const [target, setTarget] = useState(initialTarget ?? 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) onSubmit(name, target > 0 ? target : undefined)
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border p-4 space-y-3">
      <h4 className="font-medium text-foreground">{title}</h4>
      <div>
        <Label htmlFor="goal-name">Nombre</Label>
        <Input id="goal-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Viaje, coche, fondo de emergencia..." maxLength={60} required autoFocus />
      </div>
      <div>
        <Label htmlFor="goal-target">Objetivo (opcional)</Label>
        <AmountInput id="goal-target" value={target} onValueChange={setTarget} emptyWhenZero />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={!name.trim()}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

/**
 * @function goalTabsFor
 * @description Cuentas que ve quien mira (D-12): con hogar en la nube, la suya y la compartida; en
 *              este navegador sin cuenta (sin saber quién mira), las de los dos y la compartida; en
 *              modo individual, solo la suya.
 */
export function goalTabsFor(options: {
  viewer: "person1" | "person2" | null
  singleMode: boolean
  usesShared: boolean
  person1Name: string
  person2Name: string
}): GoalsTab[] {
  const { viewer, singleMode, usesShared, person1Name, person2Name } = options
  if (singleMode) return [{ owner: "person1", label: "Mis metas" }]
  const shared: GoalsTab[] = usesShared ? [{ owner: "shared", label: "Compartida" }] : []
  if (viewer) return [{ owner: viewer, label: "Mis metas" }, ...shared]
  return [{ owner: "person1", label: person1Name }, { owner: "person2", label: person2Name }, ...shared]
}
