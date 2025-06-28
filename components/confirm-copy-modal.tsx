"use client"

import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"

export function ConfirmCopyModal({
  isOpen,
  onClose,
  onConfirm,
  monthName,
  year,
  count,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  monthName: string
  year: number
  count: number
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmar copia de gastos fijos">
      <div className="space-y-4">
        <p>
          ¿Estás seguro de que deseas copiar los {count} gastos fijos del mes anterior a {monthName} {year}?
        </p>
        <p className="text-sm text-muted-foreground">
          Esta acción no se puede deshacer.
        </p>
        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Copiar gastos
          </Button>
        </div>
      </div>
    </Modal>
  )
}
