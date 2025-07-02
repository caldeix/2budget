/**
 * @file components/transaction-form.tsx
 * @description Este archivo define el componente `TransactionForm`, un modal
 *              que permite al usuario añadir nuevas transacciones o editar las existentes.
 *              Incluye campos para el tipo, categoría, nombre, importe, propietario y
 *              un deslizador para la distribución de porcentajes si la transacción es compartida.
 *              Es un Client Component (`"use client"`) debido al uso de estados y eventos.
 */

"use client"

import type React from "react"

import { useState, useEffect } from "react"
import type { Transaction, TransactionFormData } from "@/types"
import { Modal } from "@/components/ui/modal" // Componente base del modal.
import { Button } from "@/components/ui/button" // Componente de botón.
import { Input } from "@/components/ui/input" // Componente de input.
import { Label } from "@/components/ui/label" // Componente de etiqueta para inputs.
import { Slider } from "@/components/ui/slider" // Componente de deslizador (slider) de Shadcn UI.

/**
 * @interface TransactionFormProps
 * @description Define las propiedades que acepta el componente `TransactionForm`.
 * @property {boolean} isOpen - Controla la visibilidad del modal.
 * @property {() => void} onClose - Función para cerrar el modal.
 * @property {(data: TransactionFormData) => void} onSubmit - Función de callback que se ejecuta al enviar el formulario.
 * @property {Transaction} [transaction] - Objeto de transacción si se está editando una existente.
 * @property {string} person1Name - Nombre de la Persona 1.
 * @property {string} person2Name - Nombre de la Persona 2.
 */
interface TransactionFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: TransactionFormData) => void
  transaction?: Transaction
  person1Name: string
  person2Name: string
}

/**
 * @function TransactionForm
 * @description Componente modal para añadir o editar transacciones.
 *              Gestiona el estado del formulario y la lógica de distribución de porcentajes.
 * @param {TransactionFormProps} props - Propiedades del componente.
 * @returns {JSX.Element} El componente modal del formulario de transacción.
 */
export function TransactionForm({
  isOpen,
  onClose,
  onSubmit,
  transaction,
  person1Name,
  person2Name,
}: TransactionFormProps) {
  // Estado del formulario, inicializado con valores por defecto.
  const [formData, setFormData] = useState<TransactionFormData & { nonComputable: boolean }>({
    type: transaction?.type || "expense",
    category: transaction?.category || "variable",
    name: transaction?.name || "",
    amount: transaction?.amount || 0,
    owner: transaction?.owner || "both",
    person1Percentage: transaction?.person1Percentage || 50,
    person2Percentage: transaction?.person2Percentage || 50,
    date: transaction?.date || new Date().toISOString().split("T")[0],
    nonComputable: transaction?.nonComputable || false,
  })

  /**
   * `useEffect` para inicializar el formulario cuando se abre el modal
   * o cuando se proporciona una transacción para editar.
   */
  useEffect(() => {
    if (transaction) {
      // Si hay una transacción para editar, precarga sus datos en el formulario.
      setFormData({
        type: transaction.type,
        category: transaction.category,
        name: transaction.name,
        amount: transaction.amount,
        owner: transaction.owner,
        person1Percentage: transaction.person1Percentage || 50, // Usa 50% si no está definido.
        person2Percentage: transaction.person2Percentage || 50, // Usa 50% si no está definido.
        date: transaction.date,
        nonComputable: transaction.nonComputable || false,
      })
    } else {
      // Si no hay transacción (es una nueva), reinicia el formulario a sus valores por defecto.
      setFormData({
        type: "expense",
        category: "variable",
        name: "",
        amount: 0,
        owner: "both",
        person1Percentage: 50,
        person2Percentage: 50,
        date: new Date().toISOString().split("T")[0],
        nonComputable: false,
      })
    }
  }, [transaction, isOpen]) // Dependencias: se ejecuta cuando `transaction` o `isOpen` cambian.

  /**
   * @function handleSubmit
   * @description Manejador del evento de envío del formulario.
   *              Valida los datos y llama a la función `onSubmit` del padre.
   * @param {React.FormEvent} e - El evento de formulario.
   * @returns {void}
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault() // Previene el comportamiento por defecto del formulario.
    // Validación básica: el nombre no puede estar vacío y el importe debe ser mayor que 0.
    if (!formData.name || formData.amount <= 0) return

    onSubmit(formData) // Llama a la función de envío del padre con los datos del formulario.
    onClose() // Cierra el modal.
  }

  /**
   * @function handlePerson1PercentageChange
   * @description Manejador para el cambio del deslizador de porcentaje de Persona 1.
   *              Actualiza el porcentaje de Persona 1 y calcula automáticamente el de Persona 2.
   * @param {number[]} value - El valor del deslizador (un array con un solo número).
   * @returns {void}
   */
  const handlePerson1PercentageChange = (value: number[]) => {
    const p1 = value[0] // Obtiene el valor del porcentaje de Persona 1.
    setFormData((prev) => ({
      ...prev,
      person1Percentage: p1, // Actualiza el porcentaje de Persona 1.
      person2Percentage: 100 - p1, // Calcula el porcentaje de Persona 2.
    }))
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={transaction ? "Editar Transacción" : "Nueva Transacción"} size="md">
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Campos de Tipo y Categoría */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="type">Tipo</Label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  type: e.target.value as "income" | "expense",
                  // Si el tipo es ingreso, la categoría es 'income'; de lo contrario, 'variable'.
                  category: e.target.value === "income" ? "income" : "variable",
                }))
              }
              className="w-full mt-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-input text-foreground"
            >
              <option value="expense">Gasto</option>
              <option value="income">Ingreso</option>
            </select>
          </div>

          {/* El selector de Categoría solo se muestra si el tipo es "expense" */}
          {formData.type === "expense" && (
            <div>
              <Label htmlFor="category">Categoría</Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    category: e.target.value as "fixed" | "variable",
                  }))
                }
                className="w-full mt-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-input text-foreground"
              >
                <option value="variable">variable</option>
                <option value="fixed">fijo</option>
              </select>
            </div>
          )}

          {/* Checkbox para gastos no computables */}
          {formData.type === "expense" && (
            <div className="flex items-center space-x-2 mt-4">
              <input
                type="checkbox"
                id="nonComputable"
                checked={formData.nonComputable}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    nonComputable: e.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="nonComputable" className="text-sm font-medium leading-none">
                Gasto no computable (no afecta al balance global)
              </Label>
            </div>
          )}
        </div>

        {/* Campo de Nombre */}
        <div>
          <Label htmlFor="name">Nombre</Label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Ej: Supermercado, Salario, etc."
            required
          />
        </div>

        {/* Campos de Importe y Fecha */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="amount">Importe (€)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01" // Permite valores decimales.
              min="0" // El importe no puede ser negativo.
              value={formData.amount}
              onChange={(e) => setFormData((prev) => ({ ...prev, amount: Number.parseFloat(e.target.value) || 0 }))}
              required
            />
          </div>

          <div>
            <Label htmlFor="date">Fecha</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
              required
            />
          </div>
        </div>

        {/* Campo de Propietario */}
        <div>
          <Label htmlFor="owner">Propietario</Label>
          <select
            id="owner"
            value={formData.owner}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, owner: e.target.value as "person1" | "person2" | "both" }))
            }
            className="w-full mt-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-input text-foreground"
          >
            <option value="person1">{person1Name}</option>
            <option value="person2">{person2Name}</option>
            <option value="both">Ambos</option>
          </select>
        </div>

        {/* Deslizador de Porcentajes (solo visible si el propietario es "Ambos") */}
        {formData.owner === "both" && (
          <div className="space-y-4">
            <Label>Distribución de porcentajes</Label>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-foreground w-20 text-right">
                {person1Name}: {formData.person1Percentage}%
              </span>
              <Slider
                value={[formData.person1Percentage]} // El Slider de Shadcn espera un array.
                onValueChange={handlePerson1PercentageChange} // Manejador de cambio.
                max={100} // Valor máximo del deslizador.
                step={1} // Incremento/decremento del deslizador.
                className="flex-1"
              />
              <span className="text-sm font-medium text-foreground w-20 text-left">
                {person2Name}: {formData.person2Percentage}%
              </span>
            </div>
          </div>
        )}

        {/* Botones de acción del formulario */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!formData.name || formData.amount <= 0}>
            {transaction ? "Actualizar" : "Crear"} {/* Texto del botón cambia según si es edición o creación. */}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
