/**
 * @file components/emulator-banner.tsx
 * @description Franja del emulador (3.18.0): arriba del todo mientras se prueba la app con datos
 *              inventados, para que quede claro que no son reales ni se guardan, con el botón para salir
 *              a crear la cuenta.
 */

"use client"

import { FlaskConical } from "lucide-react"
import { Button } from "@/components/ui/button"

export function EmulatorBanner({ onCreateAccount }: { onCreateAccount: () => void }) {
  return (
    <div role="status" className="sticky top-0 z-40 border-b border-amber-200 bg-amber-50">
      {/* En el móvil, una sola línea y el texto corto: la franja no debe comerse la pantalla. */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 sm:py-2 flex items-center justify-between sm:justify-center gap-3 sm:gap-4">
        <p className="flex items-center gap-2 text-xs sm:text-sm text-amber-800 min-w-0">
          <FlaskConical className="h-4 w-4 shrink-0" />
          <span className="sm:hidden">
            <strong>Emulador:</strong> datos de mentira, no se guarda nada.
          </span>
          <span className="hidden sm:inline">
            <strong>Estás en el emulador:</strong> los datos son de mentira y no se guarda nada.
          </span>
        </p>
        <Button type="button" size="sm" className="shrink-0" onClick={onCreateAccount}>
          Crear mi cuenta
        </Button>
      </div>
    </div>
  )
}
