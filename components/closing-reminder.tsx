/**
 * @file components/closing-reminder.tsx
 * @description Recordatorio de cierre de mes (3.4.1). Un mes terminado sin informe no cuenta para las
 *              metas de ahorro (ver `lib/goals.ts`): se avisa del más reciente, con un botón para
 *              cerrarlo. «Ahora no» lo oculta hasta la próxima vez que se abra la app.
 */

"use client"

import { useEffect, useState } from "react"
import { CalendarCheck, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getMonthName } from "@/lib/utils"

interface ClosingReminderProps {
  month: number
  year: number
  /** Otros meses terminados sin cerrar, más antiguos. */
  olderCount: number
  onCloseMonth: () => void
}

const dismissKey = (month: number, year: number) => `2budget:closing-reminder-dismissed:${year}-${month}`

export function ClosingReminder({ month, year, olderCount, onCloseMonth }: ClosingReminderProps) {
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

  const name = `${getMonthName(month)} ${year}`
  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4">
        <CalendarCheck className="h-5 w-5 text-amber-600 shrink-0" />
        <p className="text-sm text-amber-700 flex-1 min-w-[12rem]">
          <strong>{name}</strong> ha terminado y está sin cerrar
          {olderCount > 0 ? ` (y ${olderCount === 1 ? "otro mes anterior" : `${olderCount} meses anteriores`})` : ""}. Ciérralo
          con el dinero real de cada cuenta para que cuadre y su ahorro cuente en las metas.
        </p>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" onClick={onCloseMonth}>
            Cerrar {getMonthName(month).toLowerCase()}
          </Button>
          <button type="button" onClick={dismiss} className="text-amber-700 hover:text-amber-900 p-2" aria-label="Ahora no">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
