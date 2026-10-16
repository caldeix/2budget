/**
 * @file lib/error-log.ts
 * @description Errores en producción (3.1.0). Antes solo iban a la consola, que nadie ve en el móvil:
 *              - Se guarda el último error en este navegador para verlo en Configuración.
 *              - Se guarda en memoria la última copia buena de los datos, para que la pantalla de
 *                error pueda exportarlos aunque la app se haya caído al pintar.
 */

import type { AppData } from "@/types"
import { APP_VERSION } from "@/lib/app-version"

const LAST_ERROR_KEY = "2budget:last-error"

/** Último error guardado. */
export interface LoggedError {
  message: string
  /** Primeras líneas de la traza, para saber dónde pasó. */
  stack?: string
  /** Fecha ISO. */
  at: string
  version: string
}

/** Guarda `error` como último error (sustituye al anterior). Nunca lanza. */
export function recordError(error: unknown): void {
  const err = error instanceof Error ? error : new Error(String(error))
  const entry: LoggedError = {
    message: err.message || err.name || "Error desconocido",
    stack: err.stack?.split("\n").slice(0, 6).join("\n"),
    at: new Date().toISOString(),
    version: APP_VERSION,
  }
  try {
    localStorage.setItem(LAST_ERROR_KEY, JSON.stringify(entry))
  } catch {
    // Sin almacenamiento no se puede guardar: queda la consola.
  }
}

/** Último error guardado, o `null`. */
export function readLastError(): LoggedError | null {
  try {
    const raw = localStorage.getItem(LAST_ERROR_KEY)
    return raw ? (JSON.parse(raw) as LoggedError) : null
  } catch {
    return null
  }
}

export function clearLastError(): void {
  try {
    localStorage.removeItem(LAST_ERROR_KEY)
  } catch {
    // Nada que hacer.
  }
}

// Última copia de los datos reales (no los del tour), la misma que se exportaría desde Configuración.
let dataSnapshot: AppData | null = null

export function setDataSnapshot(data: AppData | null): void {
  dataSnapshot = data
}

export function getDataSnapshot(): AppData | null {
  return dataSnapshot
}
