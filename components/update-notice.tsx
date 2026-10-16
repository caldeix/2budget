/**
 * @file components/update-notice.tsx
 * @description Avisos de versión (3.1.0, ver `lib/app-version.ts`):
 *              - `UpdateNotice`: al volver a la app (y al abrirla), comprueba si hay una versión
 *                publicada más nueva que la abierta y ofrece recargar. Solo en la build publicada.
 *              - `UpdateRequired`: pantalla que bloquea la app cuando los datos del hogar necesitan
 *                una versión más nueva que esta.
 */

"use client"

import { useCallback, useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { APP_VERSION, isOlderVersion } from "@/lib/app-version"

// Misma base que la app (ver `next.config.mjs`).
const BASE = process.env.NODE_ENV === "production" ? "/2budget/" : "/"

/** Versión publicada ahora mismo (la de la portada), o `null` si no se puede saber (sin conexión). */
async function fetchPublishedVersion(): Promise<string | null> {
  try {
    const response = await fetch(BASE, { cache: "no-store" })
    if (!response.ok) return null
    const html = await response.text()
    return html.match(/<meta name="app-version" content="([\d.]+)"/)?.[1] ?? null
  } catch {
    return null
  }
}

/** Recarga la página pidiendo la versión nueva (el service worker sirve la red primero). */
const reloadApp = () => window.location.reload()

/**
 * @function UpdateNotice
 * @description Barra fija abajo con "Hay una versión nueva" y un botón para actualizar.
 */
export function UpdateNotice() {
  const [newVersion, setNewVersion] = useState<string | null>(null)

  const check = useCallback(async () => {
    const published = await fetchPublishedVersion()
    if (published && isOlderVersion(APP_VERSION, published)) setNewVersion(published)
  }, [])

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    check()
    // Una app instalada vuelve de segundo plano sin recargarse: se comprueba cada vez que se ve.
    const onVisible = () => {
      if (document.visibilityState === "visible") check()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [check])

  if (!newVersion) return null
  return (
    <div
      data-keep-modal
      role="status"
      className="fixed inset-x-0 bottom-0 z-[60] flex flex-wrap items-center justify-center gap-3 border-t bg-card px-4 py-3 text-sm text-foreground shadow-lg"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <span>
        Hay una versión nueva de 2Budget (v{newVersion}). Tienes la v{APP_VERSION}.
      </span>
      <Button size="sm" onClick={reloadApp} className="gap-2">
        <RefreshCw className="h-4 w-4" /> Actualizar
      </Button>
    </div>
  )
}

/**
 * @function UpdateRequired
 * @description Pantalla completa que bloquea la app: los datos del hogar necesitan una versión
 *              más nueva y, con esta, se verían o guardarían mal.
 */
export function UpdateRequired({ minVersion }: { minVersion: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-bold text-foreground">Actualiza 2Budget</h1>
        <p className="text-muted-foreground">
          Los datos de tu hogar necesitan la versión {minVersion} o posterior, y esta es la {APP_VERSION}. Con esta
          versión las cifras podrían verse o guardarse mal, así que no se puede seguir hasta actualizar.
        </p>
        <p className="text-sm text-muted-foreground">
          Si la app está instalada y no se actualiza, ciérrala del todo y vuelve a abrirla.
        </p>
        <Button onClick={reloadApp} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Actualizar ahora
        </Button>
      </div>
    </div>
  )
}
