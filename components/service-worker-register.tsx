/**
 * @file components/service-worker-register.tsx
 * @description Registra el service worker (`public/sw.js`) para que la app instalada se pueda abrir
 *              sin conexión. Solo en la build publicada: en desarrollo, una caché de por medio
 *              estorbaría al recargar los cambios.
 */

"use client"

import { useEffect } from "react"
import { APP_VERSION } from "@/lib/app-version"

// Misma base que la app (ver `next.config.mjs`).
const BASE = process.env.NODE_ENV === "production" ? "/2budget/" : "/"

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return
    // La versión en la URL hace que cada versión publicada instale un service worker nuevo con
    // su propia caché (y borre la anterior).
    navigator.serviceWorker
      .register(`${BASE}sw.js?v=${APP_VERSION}`, { scope: BASE })
      .catch((error) => console.error("Error registering service worker:", error))
  }, [])

  return null
}
