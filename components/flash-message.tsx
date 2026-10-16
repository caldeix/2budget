/**
 * @file components/flash-message.tsx
 * @description Aviso breve abajo de la pantalla (3.1.0), en lugar de los `alert()` del navegador, que
 *              bloquean la app y en la app instalada se ven como una ventana del sistema.
 */

"use client"

import { useEffect } from "react"
import { CheckCircle2, AlertTriangle, X } from "lucide-react"

export interface Flash {
  text: string
  tone: "success" | "warning" | "error"
}

// Los avisos de "warning" piden hacer algo después: se quedan hasta que se cierran.
const AUTO_CLOSE_MS = 6000

export function FlashMessage({ flash, onClose }: { flash: Flash | null; onClose: () => void }) {
  useEffect(() => {
    if (!flash || flash.tone === "warning") return
    const timer = window.setTimeout(onClose, AUTO_CLOSE_MS)
    return () => window.clearTimeout(timer)
  }, [flash, onClose])

  if (!flash) return null
  const isError = flash.tone === "error"
  const Icon = flash.tone === "success" ? CheckCircle2 : AlertTriangle
  const toneClass = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    error: "border-red-200 bg-red-50 text-red-700",
  }[flash.tone]
  return (
    <div className="fixed inset-x-0 bottom-4 z-[70] flex justify-center px-4 pointer-events-none">
      <div
        role={isError ? "alert" : "status"}
        className={`pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl border p-4 shadow-lg ${toneClass}`}
      >
        <Icon className="h-5 w-5 shrink-0 mt-0.5" />
        <p className="text-sm flex-1">{flash.text}</p>
        <button type="button" onClick={onClose} aria-label="Cerrar el aviso" className="shrink-0 opacity-70 hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
