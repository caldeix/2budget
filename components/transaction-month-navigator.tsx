/**
 * @file components/transaction-month-navigator.tsx
 * @description Este archivo define el componente `TransactionMonthNavigator`,
 *              que permite al usuario navegar entre meses (anterior/siguiente)
 *              y abrir un modal para seleccionar un mes y año específicos.
 *              También incluye lógica para la navegación táctil (swipe) en dispositivos móviles.
 *              Es un Client Component (`"use client"`) debido al uso de estados y eventos.
 */

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button" // Componente de botón.
import { ChevronLeft, ChevronRight } from "lucide-react" // Iconos de flecha.
import { formatMonthYear, getPreviousMonthYear, getNextMonthYear } from "@/lib/utils" // Utilidades de fecha.
import { MonthYearPickerModal } from "@/components/month-year-picker-modal" // Modal para seleccionar mes/año.

/**
 * @interface TransactionMonthNavigatorProps
 * @description Define las propiedades que acepta el componente `TransactionMonthNavigator`.
 * @property {number} selectedMonth - El mes actualmente seleccionado (1-12).
 * @property {number} selectedYear - El año actualmente seleccionado.
 * @property {(month: number) => void} onMonthChange - Función de callback para cuando el mes cambia.
 * @property {(year: number) => void} onYearChange - Función de callback para cuando el año cambia.
 */
interface TransactionMonthNavigatorProps {
  selectedMonth: number
  selectedYear: number
  onMonthChange: (month: number) => void
  onYearChange: (year: number) => void
}

/**
 * @function TransactionMonthNavigator
 * @description Componente para navegar entre meses y seleccionar un mes/año específico.
 *              Proporciona botones de flecha y un botón central que abre un modal de selección.
 *              Soporta navegación por swipe en dispositivos táctiles.
 * @param {TransactionMonthNavigatorProps} props - Propiedades del componente.
 * @returns {JSX.Element} El navegador de mes/año y el modal asociado.
 */
export function TransactionMonthNavigator({
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
}: TransactionMonthNavigatorProps) {
  // Estado para controlar la visibilidad del modal de selección de mes/año.
  const [isPickerModalOpen, setIsPickerModalOpen] = useState(false)

  /**
   * @function handlePreviousMonth
   * @description Manejador para el botón de "Mes anterior".
   *              Calcula el mes y año anteriores y actualiza los estados del padre.
   * @returns {void}
   */
  const handlePreviousMonth = () => {
    const { month, year } = getPreviousMonthYear(selectedMonth, selectedYear)
    onMonthChange(month)
    onYearChange(year)
  }

  /**
   * @function handleNextMonth
   * @description Manejador para el botón de "Mes siguiente".
   *              Calcula el mes y año siguientes y actualiza los estados del padre.
   * @returns {void}
   */
  const handleNextMonth = () => {
    const { month, year } = getNextMonthYear(selectedMonth, selectedYear)
    onMonthChange(month)
    onYearChange(year)
  }

  return (
    <>
      {/* Contenedor principal del navegador de mes. */}
      <div className="flex items-center justify-between mb-4">
        {/* Botón de flecha izquierda (visible solo en pantallas grandes). */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePreviousMonth}
          className="hidden sm:flex h-8 w-8" // Oculto en móvil, visible en `sm` y superior.
          aria-label="Mes anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        {/* Botón central que muestra el mes y año actuales y abre el modal al hacer clic. */}
        <button
          onClick={() => setIsPickerModalOpen(true)}
          className="flex-1 text-center text-lg font-semibold text-foreground hover:text-primary transition-colors sm:flex-none sm:px-4 sm:py-2 rounded-md"
          aria-haspopup="dialog" // Indica que abre un diálogo.
          aria-expanded={isPickerModalOpen} // Indica si el diálogo está expandido.
        >
          {formatMonthYear(selectedMonth, selectedYear)} {/* Muestra el mes y año formateados. */}
        </button>

        {/* Botón de flecha derecha (visible solo en pantallas grandes). */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextMonth}
          className="hidden sm:flex h-8 w-8" // Oculto en móvil, visible en `sm` y superior.
          aria-label="Mes siguiente"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Modal de selección de mes y año.
          Se renderiza condicionalmente cuando `isPickerModalOpen` es `true`. */}
      <MonthYearPickerModal
        isOpen={isPickerModalOpen}
        onClose={() => setIsPickerModalOpen(false)}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onMonthChange={onMonthChange}
        onYearChange={onYearChange}
      />
    </>
  )
}
