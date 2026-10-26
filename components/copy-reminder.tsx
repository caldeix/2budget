/**
 * @file components/copy-reminder.tsx
 * @description Aviso de copia pendiente (3.15.0). Si la pareja ya preparó el mes copiando lo suyo y lo
 *              compartido, lo que oculto a mi pareja no se copió: se avisa de lo mío que falta, con un
 *              botón para copiarlo revisando los importes. «Ahora no» lo oculta hasta la próxima vez que
 *              se abra la app.
 */

"use client"

import { useEffect, useState } from "react"
import { Copy, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getMonthName, getPreviousMonthYear } from "@/lib/utils"

interface CopyReminderProps {
  /** Mes que se está viendo (el que falta por completar). */
  month: number
  year: number
  /** Cuántas transacciones mías del mes anterior faltan. */
  count: number
  onCopy: () => void
}

const dismissKey = (month: number, year: number) => `2budget:copy-reminder-dismissed:${year}-${month}`

export function CopyReminder({ month, year, count, onCopy }: CopyReminderProps) {
  // Oculto hasta comprobar si ya se dijo «Ahora no» en esta sesión (sin destello al cargar).
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(dismissKey(month, year)) === "1")
    } catch {
      setDismissed(false)
    }
  }, [month, year])

  if (dismissed) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      sessionStorage.setItem(dismissKey(month, year), "1")
    } catch {
      // Se vuelve a enseñar al recargar: no es grave.
    }
  }

  const previous = getPreviousMonthYear(month, year)
  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4">
        <Copy className="h-5 w-5 text-amber-600 shrink-0" />
        <p className="text-sm text-amber-700 flex-1 min-w-[12rem]">
          <strong>{getMonthName(month)}</strong> ya está preparado, pero faltan{" "}
          {count === 1 ? "1 transacción tuya" : `${count} transacciones tuyas`} de {getMonthName(previous.month).toLowerCase()}{" "}
          (gastos fijos, ingresos o aportaciones). Cópialas y revisa sus importes.
        </p>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" onClick={onCopy}>
            Copiar las mías
          </Button>
          <button type="button" onClick={dismiss} className="text-amber-700 hover:text-amber-900 p-2" aria-label="Ahora no">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
