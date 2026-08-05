/**
 * @file components/paid-reconciliation-modal.tsx
 * @description Modal de "cierre de mes". Al detectar que ha empezado un mes de calendario nuevo,
 *              obliga al usuario a reconciliar los gastos del mes anterior: marcar cuáles pagó o
 *              usar "Marcar todas como pagadas". Es un modal forzado (no se cierra con Escape ni
 *              clic en el fondo); solo se resuelve con uno de sus dos botones.
 */

"use client"

import { useState, useEffect } from "react"
import type { Transaction } from "@/types"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"

/**
 * @function PaidReconciliationModal
 * @param {boolean} isOpen - Si el modal está abierto.
 * @param {string} monthName - Nombre del mes que se cierra (ej. "Julio").
 * @param {number} year - Año del mes que se cierra.
 * @param {Transaction[]} expenses - Gastos del mes que se cierra (todos, computables y no computables).
 * @param {() => void} onMarkAll - Marca todos los gastos como pagados.
 * @param {(paidIds: string[]) => void} onSave - Aplica el marcado individual (los IDs indicados quedan pagados).
 */
export function PaidReconciliationModal({
  isOpen,
  monthName,
  year,
  expenses,
  onMarkAll,
  onSave,
}: {
  isOpen: boolean
  monthName: string
  year: number
  expenses: Transaction[]
  onMarkAll: () => void
  onSave: (paidIds: string[]) => void
}) {
  // Estado local: IDs marcados como pagados. Se inicializa desde el estado actual de cada gasto.
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (isOpen) {
      setCheckedIds(new Set(expenses.filter((e) => e.paid).map((e) => e.id)))
    }
  }, [isOpen, expenses])

  const toggle = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      title={`Cierre de ${monthName} ${year}`}
      size="lg"
      dismissible={false}
    >
      <div className="p-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          Ha empezado un mes nuevo. Marca los gastos que pagaste en {monthName} {year}, o pulsa
          «Marcar todas como pagadas». Los gastos del nuevo mes empiezan sin pagar.
        </p>

        <div className="max-h-[45vh] overflow-y-auto divide-y divide-border rounded-lg border">
          {expenses.map((expense) => (
            <label
              key={expense.id}
              className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50"
            >
              <div className="flex items-center gap-3 min-w-0">
                <input
                  type="checkbox"
                  checked={checkedIds.has(expense.id)}
                  onChange={() => toggle(expense.id)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary shrink-0"
                />
                <span className="text-sm font-medium text-foreground truncate">
                  {expense.name}
                  {expense.nonComputable && (
                    <span className="ml-2 text-xs text-muted-foreground">(no computable)</span>
                  )}
                </span>
              </div>
              <span className="text-sm font-semibold text-red-600 shrink-0">
                {formatCurrency(expense.amount)}
              </span>
            </label>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onMarkAll}>
            Marcar todas como pagadas
          </Button>
          <Button onClick={() => onSave(Array.from(checkedIds))}>Guardar</Button>
        </div>
      </div>
    </Modal>
  )
}
