"use client"

/**
 * @file app/global-error.tsx
 * @description Pantalla de error cuando falla el propio layout (3.1.0). Sustituye al layout, así que
 *              lleva su `<html>` y sus estilos.
 */

import "./globals.css"
import { ErrorScreen } from "@/components/error-screen"

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="es">
      <body>
        <ErrorScreen error={error} />
      </body>
    </html>
  )
}
