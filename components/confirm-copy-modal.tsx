"use client"

import { useEffect, useState } from "react"
import type { Transaction } from "@/types"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { AmountInput } from "@/components/ui/amount-input"
import { formatCurrency } from "@/lib/utils"

/** Importe con el que se copia cada transacción, por su id. */
export type CopyAmounts = Record<string, number>

/**
 * @function ConfirmCopyModal
 * @description Confirma la copia de los gastos fijos e ingresos del mes anterior. Con "Revisar
 *              importes" se puede cambiar el importe de cada uno antes de copiarlos (p. ej. una
 *              factura que este mes sube).
 */
export function ConfirmCopyModal({
  isOpen,
  onClose,
  onConfirm,
  monthName,
  year,
  transactions,
  expenseCount,
  incomeCount,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: (amounts: CopyAmounts) => void
  monthName: string
  year: number
  /** Las transacciones del mes anterior que se van a copiar. */
  transactions: Transaction[]
  expenseCount: number
  incomeCount: number
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [amounts, setAmounts] = useState<CopyAmounts>({})

  // Cada vez que se abre, se empieza por la confirmación y con los importes del mes anterior.
  useEffect(() => {
    if (!isOpen) return
    setIsEditing(false)
    setAmounts(Object.fromEntries(transactions.map((t) => [t.id, t.amount])))
  }, [isOpen, transactions])

  // Primero los ingresos y después los gastos, cada grupo por nombre.
  const sorted = [...transactions].sort((a, b) =>
    a.type !== b.type ? (a.type === "income" ? -1 : 1) : a.name.localeCompare(b.name, "es"),
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Revisar importes" : "Confirmar copia de gastos fijos e ingresos"}
      size={isEditing ? "lg" : "md"}
    >
      <div className="p-6 space-y-4">
        {isEditing ? (
          <>
            <p className="text-sm text-muted-foreground">
              Cambia el importe de lo que haga falta antes de copiarlo a {monthName} {year}.
            </p>
            <div className="divide-y divide-border rounded-2xl border">
              {sorted.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                    <p className={`text-xs ${t.type === "income" ? "text-green-600" : "text-red-600"}`}>
                      {t.type === "income" ? "Ingreso" : "Gasto fijo"} · antes {formatCurrency(t.amount)}
                    </p>
                  </div>
                  <AmountInput
                    aria-label={`Importe de ${t.name}`}
                    value={amounts[t.id] ?? t.amount}
                    onValueChange={(value) => setAmounts((prev) => ({ ...prev, [t.id]: value }))}
                    className="w-32 shrink-0 text-right"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Volver
              </Button>
              <Button variant="destructive" onClick={() => onConfirm(amounts)}>
                Copiar
              </Button>
            </div>
          </>
        ) : (
          <>
            <p>
              ¿Estás seguro de que deseas copiar {expenseCount} gastos fijos y {incomeCount} ingresos del mes anterior a{" "}
              {monthName} {year}?
            </p>
            <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer.</p>
            <div className="flex flex-wrap justify-end gap-2 pt-4">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button variant="secondary" onClick={() => setIsEditing(true)}>
                Revisar importes
              </Button>
              <Button variant="destructive" onClick={() => onConfirm(amounts)}>
                Copiar
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
