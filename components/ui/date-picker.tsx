/**
 * @file components/ui/date-picker.tsx
 * @description Selector de fecha con el calendario propio de la app (en vez del del navegador,
 *              distinto en cada móvil y que deja escribir a mano). Se abre en un popover al pulsar
 *              el campo; los días anteriores a `min` salen en gris y no se pueden elegir.
 */

"use client"

import { useState } from "react"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn, parseLocalDate, toLocalDateString } from "@/lib/utils"

/** Fecha corta (12/10/2026): la larga no cabe en el campo en pantallas estrechas. */
const shortDate = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })

interface DatePickerProps {
  id?: string
  /** Fecha en formato `YYYY-MM-DD`. */
  value: string
  onChange: (value: string) => void
  /** Primera fecha que se puede elegir (`YYYY-MM-DD`); las anteriores quedan bloqueadas. */
  min?: string
  className?: string
}

export function DatePicker({ id, value, onChange, min, className }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const selected = value ? parseLocalDate(value) : undefined
  const minDate = min ? parseLocalDate(min) : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn("w-full justify-start font-normal bg-input", !selected && "text-muted-foreground", className)}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {selected ? shortDate.format(selected) : "Elige una fecha"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={es}
          selected={selected}
          defaultMonth={selected ?? minDate}
          // No se puede ir a meses anteriores al mínimo ni elegir días antes de él.
          fromMonth={minDate}
          disabled={minDate ? { before: minDate } : undefined}
          onSelect={(day) => {
            if (!day) return
            onChange(toLocalDateString(day))
            setOpen(false)
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
