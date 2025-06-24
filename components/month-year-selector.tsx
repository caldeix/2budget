/**
 * @file components/month-year-selector.tsx
 * @description Este archivo define el componente `MonthYearSelector`, que proporciona
 *              dos selectores (dropdowns) para elegir un mes y un año.
 *              Es un Client Component (`"use client"`) debido al uso de `useMemo`
 *              y la interacción con los componentes `Select` de Shadcn UI.
 */

"use client"

import { useMemo } from "react"
import { Label } from "@/components/ui/label" // Componente de etiqueta.
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select" // Componentes de selección de Shadcn UI.

/**
 * @interface MonthYearSelectorProps
 * @description Define las propiedades que acepta el componente `MonthYearSelector`.
 * @property {number} selectedMonth - El mes actualmente seleccionado (1-12).
 * @property {number} selectedYear - El año actualmente seleccionado.
 * @property {(month: number) => void} onMonthChange - Función de callback para cuando el mes cambia.
 * @property {(year: number) => void} onYearChange - Función de callback para cuando el año cambia.
 * @property {number} [minYear] - El año mínimo que se puede seleccionar.
 * @property {number} [maxYear] - El año máximo que se puede seleccionar.
 */
interface MonthYearSelectorProps {
  selectedMonth: number
  selectedYear: number
  onMonthChange: (month: number) => void
  onYearChange: (year: number) => void
  minYear?: number
  maxYear?: number
}

/**
 * @function MonthYearSelector
 * @description Componente React que permite seleccionar un mes y un año mediante dropdowns.
 *              Genera dinámicamente las opciones de años y meses.
 * @param {MonthYearSelectorProps} props - Propiedades del componente.
 * @returns {JSX.Element} Los selectores de mes y año.
 */
export function MonthYearSelector({
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  minYear,
  maxYear,
}: MonthYearSelectorProps) {
  const currentYear = new Date().getFullYear() // Obtiene el año actual del sistema.
  // Define el rango de años seleccionables. Por defecto, 2 años atrás y 1 año adelante.
  const startYear = minYear || currentYear - 2
  const endYear = maxYear || currentYear + 1

  /**
   * `useMemo` para generar la lista de años.
   * Se recalcula solo si `startYear` o `endYear` cambian.
   */
  const years = useMemo(() => {
    const yearsArray: number[] = []
    // Itera desde el año final hasta el inicial para tener los años más recientes primero.
    for (let year = endYear; year >= startYear; year--) {
      yearsArray.push(year)
    }
    return yearsArray
  }, [startYear, endYear]) // Dependencias: se ejecuta si `startYear` o `endYear` cambian.

  /**
   * `useMemo` para generar la lista de meses.
   * Se recalcula solo si `currentYear` cambia (aunque en este caso, `currentYear` es constante).
   */
  const months = useMemo(() => {
    // Crea un array de 1 a 12 para los números de mes.
    return Array.from({ length: 12 }, (_, i) => i + 1).map((monthNum) => ({
      value: monthNum,
      // Formatea el número del mes a su nombre largo en español y lo convierte a mayúsculas.
      label: new Intl.DateTimeFormat("es-ES", { month: "long" })
        .format(new Date(currentYear, monthNum - 1))
        .toUpperCase(),
    }))
  }, [currentYear]) // Dependencia: se ejecuta si `currentYear` cambia.

  return (
    <div className="flex items-center gap-4">
      {/* Selector de Mes */}
      <div className="grid gap-1.5">
        {/* `sr-only` oculta la etiqueta visualmente pero la mantiene para lectores de pantalla. */}
        <Label htmlFor="month-select" className="sr-only">
          Mes
        </Label>
        {/* Componente Select de Shadcn UI para el mes. */}
        <Select value={selectedMonth.toString()} onValueChange={(value) => onMonthChange(Number.parseInt(value))}>
          <SelectTrigger id="month-select" className="w-[140px] bg-input text-foreground border-border">
            <SelectValue placeholder="Seleccionar mes" /> {/* Texto que se muestra antes de seleccionar. */}
          </SelectTrigger>
          <SelectContent className="bg-card text-foreground border-border">
            {/* Mapea la lista de meses a `SelectItem`s. */}
            {months.map((month) => (
              <SelectItem key={month.value} value={month.value.toString()}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Selector de Año */}
      <div className="grid gap-1.5">
        <Label htmlFor="year-select" className="sr-only">
          Año
        </Label>
        {/* Componente Select de Shadcn UI para el año. */}
        <Select value={selectedYear.toString()} onValueChange={(value) => onYearChange(Number.parseInt(value))}>
          <SelectTrigger id="year-select" className="w-[100px] bg-input text-foreground border-border">
            <SelectValue placeholder="Seleccionar año" />
          </SelectTrigger>
          <SelectContent className="bg-card text-foreground border-border">
            {/* Mapea la lista de años a `SelectItem`s. */}
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
