/**
 * @file components/categories-editor.tsx
 * @description Lista editable de categorías para Configuración: renombrar en la propia fila,
 *              quitar y añadir (de gasto o de ingreso). Trabaja sobre una copia: el padre guarda.
 *              Salen en orden alfabético; al renombrar no se reordena mientras se escribe.
 */

"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { newCategoryId, sortCategories, type Category } from "@/lib/categories"

interface CategoriesEditorProps {
  categories: Category[]
  onChange: (categories: Category[]) => void
}

export function CategoriesEditor({ categories, onChange }: CategoriesEditorProps) {
  const [newName, setNewName] = useState("")
  const [newKind, setNewKind] = useState<Category["kind"]>("expense")

  const rename = (id: string, name: string) => onChange(categories.map((c) => (c.id === id ? { ...c, name } : c)))
  const remove = (id: string) => onChange(categories.filter((c) => c.id !== id))
  const add = () => {
    const name = newName.trim()
    if (!name) return
    onChange(sortCategories([...categories, { id: newCategoryId(name, categories), name, kind: newKind }]))
    setNewName("")
  }

  const group = (kind: Category["kind"], title: string) => {
    const list = categories.filter((c) => c.kind === kind)
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
        {list.length === 0 && <p className="text-sm text-muted-foreground">Ninguna.</p>}
        {list.map((c) => (
          <div key={c.id} className="flex items-center gap-2">
            <Input
              value={c.name}
              onChange={(e) => rename(c.id, e.target.value)}
              aria-label={`Nombre de la categoría ${c.name}`}
              className="h-9"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(c.id)}
              title="Quitar categoría"
              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Quitar {c.name}</span>
            </Button>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {group("expense", "Gastos")}
      {group("income", "Ingresos")}

      {/* Añadir */}
      <div className="flex items-center gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              add()
            }
          }}
          placeholder="Nueva categoría"
          aria-label="Nueva categoría"
          className="h-9"
        />
        <select
          value={newKind}
          onChange={(e) => setNewKind(e.target.value as Category["kind"])}
          aria-label="Tipo de la nueva categoría"
          // 16 px en el móvil: con letra más pequeña, Safari hace zoom al tocarlo.
          className="h-9 px-2 border border-input rounded-md bg-input text-foreground text-base sm:text-sm"
        >
          <option value="expense">Gasto</option>
          <option value="income">Ingreso</option>
        </select>
        <Button type="button" variant="outline" size="icon" onClick={add} disabled={!newName.trim()} className="h-9 w-9 shrink-0">
          <Plus className="h-4 w-4" />
          <span className="sr-only">Añadir categoría</span>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Al quitar una categoría, sus transacciones pasan a «Sin categoría». Los cambios se aplican al guardar.
      </p>
    </div>
  )
}
