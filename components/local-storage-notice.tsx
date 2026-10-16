/**
 * @file components/local-storage-notice.tsx
 * @description Protección de los datos en modo local (3.1.0). Sin hogar en la nube, todo vive en el
 *              almacenamiento de este navegador:
 *              - Se pide almacenamiento persistente (`navigator.storage.persist()`), para que el
 *                navegador no lo borre cuando le falte espacio.
 *              - En iPhone y iPad, Safari borra los datos de una web NO instalada tras 7 días sin
 *                abrirla: se avisa una vez (se puede cerrar) de que conviene instalarla, exportar una
 *                copia o pasar los datos a la nube.
 */

"use client"

import { useEffect, useState } from "react"
import { Smartphone, X } from "lucide-react"

const DISMISSED_KEY = "2budget:ios-local-notice-dismissed"

/** iPhone o iPad (los iPad recientes se presentan como Mac con pantalla táctil). */
function isAppleMobile(): boolean {
  const ua = navigator.userAgent
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1)
}

/** La web está abierta como app instalada (pantalla de inicio). */
function isInstalled(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  )
}

/**
 * @function LocalStorageNotice
 * @description Se monta solo en modo local. Pide persistencia y, en iOS sin instalar, avisa.
 */
export function LocalStorageNotice() {
  const [showIosNotice, setShowIosNotice] = useState(false)

  useEffect(() => {
    navigator.storage?.persist?.().catch(() => {})
    let dismissed = false
    try {
      dismissed = localStorage.getItem(DISMISSED_KEY) === "1"
    } catch {
      // Sin almacenamiento no se puede recordar: se enseña igual.
    }
    setShowIosNotice(!dismissed && isAppleMobile() && !isInstalled())
  }, [])

  if (!showIosNotice) return null

  const dismiss = () => {
    setShowIosNotice(false)
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
          Tus datos están solo en este navegador. En iPhone y iPad, Safari los borra si la web no está instalada y
          pasan 7 días sin abrirla. Instálala (Compartir → Añadir a pantalla de inicio), exporta una copia desde
          Configuración o pasa tus datos a la nube.
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
