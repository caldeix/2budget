/**
 * @file components/pending-at-close-modal.tsx
 * @description Pendientes al cerrar (3.14.0): antes de cerrar un mes terminado, qué pasa con cada gasto
 *              o aportación sin pagar (ver `lib/closing-pending.ts`). Hasta decidirlos todos no se pasa
 *              al dinero real; si algo se va a borrar, se pide confirmación.
 */

"use client"

import { useEffect, useState } from "react"
import type { Transaction } from "@/types"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { cn, formatCurrency, getMonthName } from "@/lib/utils"
import { HIDDEN_AMOUNT } from "@/lib/privacy"
import { dropActionFor, type PendingDecision } from "@/lib/closing-pending"

interface PendingAtCloseModalProps {
  isOpen: boolean
  month: number
  year: number
  pending: Transaction[]
  /** Volver sin cerrar el mes. */
  onCancel: () => void
  /** Aplicar las decisiones y seguir con el cierre. */
  onConfirm: (decisions: Record<string, PendingDecision>) => void
  isAmountHidden?: (t: Transaction) => boolean
}

const kindLabel = (t: Transaction) =>
  t.type === "contribution" ? "Aportación" : t.category === "fixed" ? "Gasto fijo" : "Gasto variable"

export function PendingAtCloseModal({
  isOpen,
  month,
  year,
  pending,
  onCancel,
  onConfirm,
  isAmountHidden = () => false,
}: PendingAtCloseModalProps) {
  const [decisions, setDecisions] = useState<Record<string, PendingDecision>>({})
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setDecisions({})
      setIsConfirmingDelete(false)
    }
  }, [isOpen])

  const choose = (id: string, decision: PendingDecision) => {
    setDecisions((current) => ({ ...current, [id]: decision }))
    setIsConfirmingDelete(false)
  }
  const markAllPaid = () => {
    setDecisions(Object.fromEntries(pending.map((t) => [t.id, "paid" as const])))
    setIsConfirmingDelete(false)
  }

  const monthName = getMonthName(month).toLowerCase()
  const nextMonthName = getMonthName(month === 12 ? 1 : month + 1).toLowerCase()
  const isComplete = pending.every((t) => decisions[t.id])
  const toDelete = pending.filter((t) => decisions[t.id] === "drop" && dropActionFor(t) === "delete")

  const handleContinue = () => {
    if (!isComplete) return
    if (toDelete.length > 0 && !isConfirmingDelete) {
      setIsConfirmingDelete(true)
      return
    }
    onConfirm(decisions)
  }

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={`Pendientes de ${monthName} ${year}`} size="lg">
      <div className="p-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          Antes de cerrar {monthName}, di qué pasa con lo que sigue sin pagar. Si no, el cierre lo contaría como
          gastado y el ajuste saldría descuadrado.
        </p>

        <div className="max-h-[50vh] overflow-y-auto divide-y divide-border rounded-lg border">
          {pending.map((t) => {
            const decision = decisions[t.id]
            const dropLabel = dropActionFor(t) === "zero" ? "Dejar a 0 €" : "Borrar"
            const options: { value: PendingDecision; label: string }[] = [
              { value: "paid", label: t.type === "contribution" ? "Ya enviada" : "Ya pagado" },
              { value: "move", label: `Pasar a ${nextMonthName}` },
              { value: "drop", label: dropLabel },
            ]
            return (
              <div key={t.id} className="px-4 py-3 space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground truncate">{t.name}</span>
                    <span className="block text-xs text-muted-foreground">{kindLabel(t)}</span>
                  </span>
                  <span
                    className={cn(
                      "text-sm font-semibold shrink-0",
                      t.type === "contribution" ? "text-primary" : "text-red-600",
                    )}
                  >
                    {isAmountHidden(t) ? HIDDEN_AMOUNT : formatCurrency(t.amount)}
                  </span>
                </div>
                <div role="radiogroup" aria-label={`Qué pasa con ${t.name}`} className="grid grid-cols-3 gap-2">
                  {options.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={decision === option.value}
                      onClick={() => choose(t.id, option.value)}
                      className={cn(
                        "rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
                        decision === option.value
                          ? option.value === "drop"
                            ? "border-red-600 bg-red-600 text-white"
                            : "border-primary bg-primary text-primary-foreground"
                          : "border-border text-foreground hover:bg-muted",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <ul className="text-xs text-muted-foreground space-y-1">
          <li>
            <strong>Pasar a {nextMonthName}</strong>: llega tarde. Pasa al día 1 de {nextMonthName}, aún pendiente.
          </li>
          <li>
            <strong>Dejar a 0 €</strong> (gastos fijos): este mes no se paga, pero sigue en la lista para los siguientes.
          </li>
          <li>
            <strong>Borrar</strong> (gastos variables y aportaciones): no se pagará nunca.
          </li>
        </ul>

        {isConfirmingDelete && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Se {toDelete.length === 1 ? "borrará" : "borrarán"} {toDelete.map((t) => `«${t.name}»`).join(", ")}. No se
            puede deshacer. Pulsa otra vez para seguir.
          </p>
        )}

        <div className="flex flex-col sm:flex-row justify-between gap-3 pt-2">
          <Button variant="outline" onClick={markAllPaid}>
            Todo pagado
          </Button>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="ghost" onClick={onCancel}>
              Ahora no
            </Button>
            <Button onClick={handleContinue} disabled={!isComplete} variant={isConfirmingDelete ? "destructive" : "default"}>
              {isConfirmingDelete ? "Sí, borrar y seguir" : "Seguir con el cierre"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
