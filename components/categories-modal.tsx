/**
 * @file components/categories-modal.tsx
 * @description Ventana de las categorías (3.8.0): antes estaban dentro de Configuración; ahora tienen su
 *              propio botón en los botones flotantes. El editor es el mismo (`CategoriesEditor`).
 */

"use client"

import { useEffect, useState } from "react"
import type { AppConfig } from "@/types"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { CategoriesEditor } from "@/components/categories-editor"
import { categoriesOf, type Category } from "@/lib/categories"

interface CategoriesModalProps {
  isOpen: boolean
  onClose: () => void
  config: AppConfig
  onSave: (categories: Category[]) => void
}

export function CategoriesModal({ isOpen, onClose, config, onSave }: CategoriesModalProps) {
  // Copia editable: los cambios se aplican al guardar.
  const [categories, setCategories] = useState<Category[]>(categoriesOf(config))

  useEffect(() => {
    if (isOpen) setCategories(categoriesOf(config))
  }, [isOpen, config])

  const handleSave = () => {
    onSave(categories)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Categorías" size="md">
      <div className="p-6 space-y-5">
        <p className="text-sm text-muted-foreground">
          Las categorías de los gastos y de los ingresos, para las transacciones, los gráficos, los presupuestos y el
          resumen anual.
        </p>
        <CategoriesEditor categories={categories} onChange={setCategories} />
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave}>
            Guardar categorías
          </Button>
        </div>
      </div>
    </Modal>
  )
}
