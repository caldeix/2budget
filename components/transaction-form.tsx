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

import { useState, useEffect, useMemo } from "react"
import type { Transaction, TransactionFormData } from "@/types"
import { Modal } from "@/components/ui/modal" // Componente base del modal.
import { Button } from "@/components/ui/button" // Componente de botón.
import { Input } from "@/components/ui/input" // Componente de input.
import { Label } from "@/components/ui/label" // Componente de etiqueta para inputs.
import { Slider } from "@/components/ui/slider" // Componente de deslizador (slider) de Shadcn UI.
import { AmountInput } from "@/components/ui/amount-input" // Input de importe que impide un tercer decimal.
import { DatePicker } from "@/components/ui/date-picker" // Calendario propio de la app.
import { ownerForShare } from "@/lib/storage" // El propietario sale del reparto.
import { normalizeName, UNCATEGORIZED_LABEL, type Category } from "@/lib/categories" // Categorías.
import { getTodayDate, formatDate, cn } from "@/lib/utils" // Fecha de hoy en local (no UTC), formato y unión de clases.

/**
 * Nombre ya usado en alguna transacción, con su tipo (las sugerencias se filtran por tipo) y la
 * categoría de la última vez (se rellena sola al elegirlo).
 */
export interface NameSuggestion {
  name: string
  type: "income" | "expense"
  categoryId?: string
}

/** Máximo de sugerencias visibles a la vez. */
const MAX_SUGGESTIONS = 6

/** Texto comparable: sin mayúsculas ni tildes. */
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()

/**
 * @interface TransactionFormProps
 * @description Define las propiedades que acepta el componente `TransactionForm`.
 * @property {boolean} isOpen - Controla la visibilidad del modal.
 * @property {() => void} onClose - Función para cerrar el modal.
 * @property {(data: TransactionFormData) => void} onSubmit - Función de callback que se ejecuta al enviar el formulario.
 * @property {Transaction} [transaction] - Objeto de transacción si se está editando una existente.
 * @property {string} person1Name - Nombre de la Persona 1.
 * @property {string} person2Name - Nombre de la Persona 2.
 * @property {boolean} [singleMode] - Modo individual: oculta el propietario y el reparto.
 * @property {NameSuggestion[]} [nameSuggestions] - Nombres ya usados, para sugerirlos al escribir.
 * @property {Category[]} categories - Categorías disponibles (ver `lib/categories.ts`).
 * @property {string} [minDate] - Primera fecha admitida (YYYY-MM-DD): no se añaden transacciones a meses
 *           ya pasados (ver `app/page.tsx`). Al editar, la fecha original de la transacción siempre vale.
 */
interface TransactionFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: TransactionFormData) => void
  transaction?: Transaction
  person1Name: string
  person2Name: string
  singleMode?: boolean
  nameSuggestions?: NameSuggestion[]
  categories: Category[]
  minDate?: string
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
  singleMode = false,
  nameSuggestions = [],
  categories,
  minDate,
}: TransactionFormProps) {
  // Valores por defecto de una transacción nueva: en modo individual todo es de la Persona 1.
  const defaultOwner = singleMode ? "person1" : "both"
  const defaultPerson1Percentage = singleMode ? 100 : 50

  // El reparto lo decide solo el deslizador: 100% para uno es "solo suyo"; cualquier otro valor,
  // compartido. En modo individual se oculta (todo es de la Persona 1), salvo al editar una
  // transacción antigua que no es solo suya: así se puede ver y reasignar.
  const showShareSlider = !singleMode || (transaction !== undefined && transaction.owner !== "person1")

  // Posición del deslizador para una transacción existente: los individuales van al 100% o al 0%.
  const sharePercentageOf = (t: Transaction) =>
    t.owner === "person1" ? 100 : t.owner === "person2" ? 0 : (t.person1Percentage ?? 50)

  // Estado del formulario, inicializado con valores por defecto.
  const [formData, setFormData] = useState<TransactionFormData & { nonComputable: boolean }>({
    type: transaction?.type || "expense",
    category: transaction?.category || "variable",
    name: transaction?.name || "",
    amount: transaction?.amount || 0,
    owner: transaction?.owner || defaultOwner,
    person1Percentage: transaction ? sharePercentageOf(transaction) : defaultPerson1Percentage,
    person2Percentage: transaction ? 100 - sharePercentageOf(transaction) : 100 - defaultPerson1Percentage,
    date: transaction?.date || getTodayDate(),
    nonComputable: transaction?.nonComputable || false,
    categoryId: transaction?.categoryId,
  })
  // Si el usuario ha elegido la categoría a mano, no se le pisa al autocompletar el nombre.
  const [categoryTouched, setCategoryTouched] = useState(false)

  // Fecha mínima efectiva: al editar, la fecha que ya tenía la transacción no se rechaza.
  const effectiveMinDate = minDate && transaction && transaction.date < minDate ? transaction.date : minDate
  const isDateTooEarly = effectiveMinDate !== undefined && formData.date < effectiveMinDate

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
        person1Percentage: sharePercentageOf(transaction),
        person2Percentage: 100 - sharePercentageOf(transaction),
        date: transaction.date,
        nonComputable: transaction.nonComputable || false,
        categoryId: transaction.categoryId,
      })
      setCategoryTouched(true)
    } else {
      // Si no hay transacción (es una nueva), reinicia el formulario a sus valores por defecto.
      setFormData({
        type: "expense",
        category: "variable",
        name: "",
        amount: 0,
        owner: defaultOwner,
        person1Percentage: defaultPerson1Percentage,
        person2Percentage: 100 - defaultPerson1Percentage,
        date: getTodayDate(),
        nonComputable: false,
        categoryId: undefined,
      })
      setCategoryTouched(false)
    }
  }, [transaction, isOpen, defaultOwner, defaultPerson1Percentage]) // Se ejecuta al abrir, al cambiar la transacción o el modo.

  // Sugerencias de nombre: las del mismo tipo que contienen lo escrito (sin contar el nombre exacto).
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const suggestions = useMemo(() => {
    const query = normalize(formData.name)
    if (!query) return []
    return nameSuggestions
      .filter((s) => s.type === formData.type)
      .filter((s) => normalize(s.name).includes(query) && normalize(s.name) !== query)
      .slice(0, MAX_SUGGESTIONS)
  }, [nameSuggestions, formData.name, formData.type])
  const isSuggesting = showSuggestions && suggestions.length > 0

  const pickSuggestion = (s: NameSuggestion) => {
    // Con el nombre viene la categoría de la última vez (si no se ha elegido otra a mano).
    setFormData((prev) => ({ ...prev, name: s.name, categoryId: categoryTouched ? prev.categoryId : s.categoryId }))
    setShowSuggestions(false)
    setHighlighted(-1)
  }

  /** Al escribir un nombre que ya existe tal cual, también se rellena su categoría. */
  const applyNameTyped = (name: string) => {
    setFormData((prev) => {
      if (categoryTouched) return { ...prev, name }
      const match = nameSuggestions.find((s) => s.type === prev.type && normalizeName(s.name) === normalizeName(name))
      return { ...prev, name, categoryId: match?.categoryId ?? prev.categoryId }
    })
  }

  // Categorías del tipo actual; si la elegida ya no vale (cambio de tipo o borrada), "Sin categoría".
  const typeCategories = categories.filter((c) => c.kind === formData.type)
  const categoryValue = typeCategories.some((c) => c.id === formData.categoryId) ? formData.categoryId : ""

  /** Flechas para moverse por las sugerencias, Enter para elegir y Escape para cerrarlas. */
  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSuggesting) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlighted((i) => (i + 1) % suggestions.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlighted((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
    } else if (e.key === "Enter" && highlighted >= 0) {
      e.preventDefault()
      pickSuggestion(suggestions[highlighted])
    } else if (e.key === "Escape") {
      // Solo cierra las sugerencias, no el modal.
      e.stopPropagation()
      setShowSuggestions(false)
    }
  }

  /**
   * @function handleSubmit
   * @description Manejador del evento de envío del formulario.
   *              Valida los datos y llama a la función `onSubmit` del padre.
   * @param {React.FormEvent} e - El evento de formulario.
   * @returns {void}
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault() // Previene el comportamiento por defecto del formulario.
    // Validación básica: el nombre no puede estar vacío y el importe no puede ser negativo.
    // Se admite 0 € para mantener un gasto habitual que un mes no se cobra.
    if (!formData.name || formData.amount < 0 || isDateTooEarly) return

    // El propietario sale del deslizador: 100% para una persona es individual de esa persona.
    const owner = ownerForShare("both", formData.person1Percentage)
    onSubmit({
      ...formData,
      categoryId: categoryValue || undefined,
      owner,
      person1Percentage: owner === "person1" ? 100 : owner === "person2" ? 0 : formData.person1Percentage,
      person2Percentage: owner === "person1" ? 0 : owner === "person2" ? 100 : formData.person2Percentage,
    }) // Llama a la función de envío del padre con los datos del formulario.
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
        {/* Tipo (ingreso, gasto fijo o variable: `type` + `category` en un solo selector) y Categoría */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="type">Tipo</Label>
            <select
              id="type"
              value={formData.type === "income" ? "income" : formData.category}
              onChange={(e) => {
                const value = e.target.value as "income" | "fixed" | "variable"
                setFormData((prev) => ({
                  ...prev,
                  type: value === "income" ? "income" : "expense",
                  category: value,
                }))
              }}
              className="w-full mt-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-input text-foreground"
            >
              <option value="variable">Gasto variable</option>
              <option value="fixed">Gasto fijo</option>
              <option value="income">Ingreso</option>
            </select>
          </div>

          <div>
            <Label htmlFor="categoryId">Categoría</Label>
            <select
              id="categoryId"
              value={categoryValue ?? ""}
              onChange={(e) => {
                setCategoryTouched(true)
                setFormData((prev) => ({ ...prev, categoryId: e.target.value || undefined }))
              }}
              className="w-full mt-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-input text-foreground"
            >
              <option value="">{UNCATEGORIZED_LABEL}</option>
              {typeCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Checkbox para gastos no computables (a todo el ancho, debajo de Tipo y Categoría) */}
          {formData.type === "expense" && (
            <div className="col-span-2 flex items-center space-x-2 mt-2">
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
        <div className="relative">
          <Label htmlFor="name">Nombre</Label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => {
              applyNameTyped(e.target.value)
              setShowSuggestions(true)
              setHighlighted(-1)
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setShowSuggestions(false)}
            onKeyDown={handleNameKeyDown}
            placeholder="Ej: Supermercado, Salario, etc."
            autoComplete="off"
            role="combobox"
            aria-expanded={isSuggesting}
            aria-controls="name-suggestions"
            required
          />
          {/* Nombres ya usados que coinciden con lo escrito: se pulsa uno en vez de escribirlo entero. */}
          {isSuggesting && (
            <ul
              id="name-suggestions"
              role="listbox"
              className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto rounded-md border border-border bg-card shadow-lg py-1"
            >
              {suggestions.map((s, i) => (
                <li
                  key={s.name}
                  role="option"
                  aria-selected={i === highlighted}
                  // `mousedown` (no `click`): se elige antes de que el input pierda el foco.
                  onMouseDown={(e) => {
                    e.preventDefault()
                    pickSuggestion(s)
                  }}
                  className={cn(
                    "flex items-center justify-between gap-2 px-3 py-2 text-sm cursor-pointer text-foreground hover:bg-muted",
                    i === highlighted && "bg-muted",
                  )}
                >
                  <span>{s.name}</span>
                  {s.categoryId && (
                    <span className="text-xs text-muted-foreground">
                      {categories.find((c) => c.id === s.categoryId)?.name}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Campos de Importe y Fecha */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="amount">Importe (€)</Label>
            <AmountInput
              id="amount"
              value={formData.amount}
              onValueChange={(amount) => setFormData((prev) => ({ ...prev, amount }))}
              placeholder="0,00"
            />
          </div>

          <div>
            <Label htmlFor="date">Fecha</Label>
            <DatePicker
              id="date"
              value={formData.date}
              min={effectiveMinDate}
              onChange={(date) => setFormData((prev) => ({ ...prev, date }))}
            />
            {isDateTooEarly && (
              <p className="mt-1 text-xs text-destructive">
                Los meses anteriores ya están cerrados: la fecha tiene que ser del {formatDate(effectiveMinDate)} en
                adelante.
              </p>
            )}
          </div>
        </div>

        {/* Reparto entre los dos (oculto en modo individual). Sustituye al antiguo selector de
            propietario: 100% para uno equivale a "solo suyo". */}
        {showShareSlider && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Reparto</Label>
              <span className="text-xs text-muted-foreground">
                {formData.person1Percentage >= 100
                  ? `Solo de ${person1Name}`
                  : formData.person1Percentage <= 0
                    ? `Solo de ${person2Name}`
                    : "Compartido"}
              </span>
            </div>
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
          <Button type="submit" disabled={!formData.name || formData.amount < 0 || isDateTooEarly}>
            {transaction ? "Actualizar" : "Crear"} {/* Texto del botón cambia según si es edición o creación. */}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
