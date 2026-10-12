/**
 * @file components/category-spread-modal.tsx
 * @description Al poner una categoría a una transacción cuyo nombre ya se usó antes sin categoría,
 *              pregunta si aplicarla también a esas transacciones anteriores (p. ej. "Alquiler" de
 *              los meses ya pasados). Así el gráfico por categoría de los informes antiguos también
 *              queda completo.
 */

"use client"

import { Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"

interface CategorySpreadModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  /** Nombre de la transacción (tal como se escribió). */
  name: string
  categoryName: string
  /** Cuántas transacciones anteriores con ese nombre no tienen categoría. */
  count: number
}

export function CategorySpreadModal({ isOpen, onClose, onConfirm, name, categoryName, count }: CategorySpreadModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Aplicar la categoría a las anteriores" size="sm">
      <div className="p-6 space-y-6 text-center">
        <Tag className="h-12 w-12 text-primary mx-auto" />
        <p className="text-foreground">
          Hay {count} {count === 1 ? "transacción anterior" : "transacciones anteriores"} llamada
          {count === 1 ? "" : "s"} <span className="font-bold">{name}</span> sin categoría. ¿Les ponemos también{" "}
          <span className="font-bold">{categoryName}</span>?
        </p>
        <p className="text-sm text-muted-foreground">
          Solo se tocan las que no tienen categoría; los importes y el resto de datos no cambian. También se actualizan
          en los informes ya cerrados.
        </p>
        <div className="flex justify-center gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            No, solo esta
          </Button>
          <Button type="button" onClick={onConfirm}>
            Sí, aplicar a {count}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
