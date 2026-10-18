/**
 * @file components/ios-install-notice.tsx
 * @description Cómo instalar la app en iPhone y iPad (3.2.0). Android y Chrome ofrecen solos
 *              «Instalar app», pero Safari no muestra nunca ese aviso: hay que añadirla a mano a la
 *              pantalla de inicio. Se enseña una vez (se puede cerrar) a quien usa la nube en Safari
 *              sin instalar; en modo local ya lo dice `LocalStorageNotice`.
 */

"use client"

import { useEffect, useState } from "react"
import { Smartphone, X } from "lucide-react"
import { isAppleMobile, isInstalled } from "@/lib/device"

const DISMISSED_KEY = "2budget:ios-install-notice-dismissed"

export function IosInstallNotice() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    let dismissed = false
    try {
      dismissed = localStorage.getItem(DISMISSED_KEY) === "1"
    } catch {
      // Sin almacenamiento no se puede recordar: se enseña igual.
    }
    setShow(!dismissed && isAppleMobile() && !isInstalled())
  }, [])

  if (!show) return null

  const dismiss = () => {
    setShow(false)
    try {
      localStorage.setItem(DISMISSED_KEY, "1")
    } catch {
      // Se vuelve a enseñar la próxima vez: no es grave.
    }
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
      <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4">
        <Smartphone className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-700 flex-1">
          Para tener 2Budget como una app en el iPhone: en Safari, pulsa Compartir (el cuadrado con la flecha hacia
          arriba) y luego «Añadir a pantalla de inicio». En iPhone no aparece ningún aviso de instalar.
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="text-amber-700 hover:text-amber-900 shrink-0"
          aria-label="Cerrar el aviso"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
