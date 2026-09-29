"use client"

import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"

export function ConfirmCopyModal({
  isOpen,
  onClose,
  onConfirm,
  monthName,
  year,
  expenseCount,
  incomeCount,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  monthName: string
  year: number
  expenseCount: number
  incomeCount: number
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmar copia de gastos fijos e ingresos">
      <div className="space-y-4">
        <p>
          ¿Estás seguro de que deseas copiar {expenseCount} gastos fijos y {incomeCount} ingresos del mes anterior a{" "}
          {monthName} {year}?
        </p>
        <p className="text-sm text-muted-foreground">
          Esta acción no se puede deshacer.
        </p>
        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Copiar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
