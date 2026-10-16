"use client"

/**
 * @file app/error.tsx
 * @description Pantalla de error de la página (3.1.0): sustituye a la genérica de Next.
 */

import { ErrorScreen } from "@/components/error-screen"

export default function Error({ error }: { error: Error & { digest?: string } }) {
  return <ErrorScreen error={error} />
}
