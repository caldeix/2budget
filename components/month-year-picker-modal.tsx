/**
 * @file components/month-year-picker-modal.tsx
 * @description Este archivo define el componente `MonthYearPickerModal`, un modal
 *              que permite al usuario seleccionar un mes y un año específicos
 *              utilizando los selectores de mes y año.
 *              Es un Client Component (`"use client"`) debido al uso de estados y eventos.
 */

"use client"

import { useState } from "react"
import { Modal } from "@/components/ui/modal" // Componente base del modal.
import { MonthYearSelector } from "@/components/month-year-selector" // Componente selector de mes/año.
import { Button } from "@/components/ui/button" // Componente de botón.

/**
 * @interface MonthYearPickerModalProps
 * @description Define las propiedades que acepta el componente `MonthYearPickerModal`.
 * @property {boolean} isOpen - Controla la visibilidad del modal.
 * @property {() => void} onClose - Función para cerrar el modal.
 * @property {number} selectedMonth - El mes actualmente seleccionado (1-12).
 * @property {number} selectedYear - El año actualmente seleccionado.
 * @property {(month: number) => void} onMonthChange - Función de callback para cuando el mes cambia.
 * @property {(year: number) => void} onYearChange - Función de callback para cuando el año cambia.
 */
interface MonthYearPickerModalProps {
  isOpen: boolean
  onClose: () => void
  selectedMonth: number
  selectedYear: number
  onMonthChange: (month: number) => void
  onYearChange: (year: number) => void
}

/**
 * @function MonthYearPickerModal
 * @description Componente modal que permite al usuario seleccionar un mes y un año.
 *              Utiliza estados temporales para la selección dentro del modal,
 *              aplicando los cambios solo al hacer clic en "Aplicar".
 * @param {MonthYearPickerModalProps} props - Propiedades del componente.
 * @returns {JSX.Element} El componente modal.
 */
export function MonthYearPickerModal({
  isOpen,
  onClose,
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
}: MonthYearPickerModalProps) {
  // Estado temporal para el mes seleccionado dentro del modal.
  const [tempMonth, setTempMonth] = useState(selectedMonth)
  // Estado temporal para el año seleccionado dentro del modal.
  const [tempYear, setTempYear] = useState(selectedYear)

  /**
   * @function handleApply
   * @description Manejador para el botón "Aplicar".
   *              Llama a las funciones `onMonthChange` y `onYearChange` del padre
   *              con los valores temporales seleccionados y luego cierra el modal.
   * @returns {void}
   */
  const handleApply = () => {
    onMonthChange(tempMonth) // Actualiza el mes en el componente padre.
    onYearChange(tempYear) // Actualiza el año en el componente padre.
    onClose() // Cierra el modal.
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Seleccionar Mes y Año" size="sm">
      <div className="p-6 space-y-6">
        {/* Componente MonthYearSelector para la selección real de mes y año.
            Sus cambios internos actualizan `tempMonth` y `tempYear`. */}
        <MonthYearSelector
          selectedMonth={tempMonth}
          selectedYear={tempYear}
          onMonthChange={setTempMonth}
          onYearChange={setTempYear}
        />
        {/* Botones de acción del modal */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleApply}>
            Aplicar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
