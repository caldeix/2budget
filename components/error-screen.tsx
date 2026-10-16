/**
 * @file components/error-screen.tsx
 * @description Pantalla de error propia (3.1.0) y registro de errores sueltos.
 *              - `ErrorScreen`: la usan `app/error.tsx` y `app/global-error.tsx` cuando la app se cae
 *                al pintar. Guarda el error y deja exportar los datos antes de recargar.
 *              - `ErrorRecorder`: guarda también los errores que no tumban la app (eventos y
 *                promesas sin capturar), para verlos en Configuración.
 */

"use client"

import { useEffect } from "react"
import { AlertTriangle, Download, RefreshCw } from "lucide-react"
import { getDataSnapshot, recordError } from "@/lib/error-log"
import { downloadAppData, hasAppData, loadData } from "@/lib/storage"

/** Datos que se pueden exportar: los que tenía la app abiertos o, si no, los de este navegador. */
function exportableData() {
  const snapshot = getDataSnapshot()
  if (snapshot && hasAppData(snapshot)) return snapshot
  const local = loadData()
  return hasAppData(local) ? local : null
}

/**
 * @function ErrorScreen
 * @description Sin componentes de la app (pueden ser los que fallan): solo HTML y clases.
 */
export function ErrorScreen({ error }: { error: Error }) {
  useEffect(() => {
    recordError(error)
  }, [error])

  const data = exportableData()

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md space-y-4 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
        <h1 className="text-2xl font-bold text-foreground">Algo ha fallado</h1>
        <p className="text-muted-foreground">
          2Budget ha tenido un error y no puede seguir. Tus datos guardados no se han tocado. Si quieres, exporta una
          copia antes de recargar.
        </p>
        <p className="text-xs text-muted-foreground break-words">{error.message}</p>
        <div className="flex flex-wrap justify-center gap-3">
          {data && (
            <button
              type="button"
              onClick={() => downloadAppData(data)}
              className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              <Download className="h-4 w-4" /> Exportar datos
            </button>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" /> Recargar
          </button>
        </div>
        <p className="text-xs text-muted-foreground">El error queda anotado en Configuración → Último error.</p>
      </div>
    </div>
  )
}

/**
 * @function ErrorRecorder
 * @description Se monta una vez en el layout y anota los errores sin capturar.
 */
export function ErrorRecorder() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => recordError(event.error ?? event.message)
    const onRejection = (event: PromiseRejectionEvent) => recordError(event.reason)
    window.addEventListener("error", onError)
    window.addEventListener("unhandledrejection", onRejection)
    return () => {
      window.removeEventListener("error", onError)
      window.removeEventListener("unhandledrejection", onRejection)
    }
  }, [])
  return null
}
