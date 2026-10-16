/**
 * @file components/sign-out-button.tsx
 * @description Cerrar sesión (3.1.0). Si en este navegador quedan datos del modo local (sin cifrar,
 *              p. ej. al unirse a un hogar sin subirlos), antes se pregunta si borrarlos o conservarlos.
 */

"use client"

import { useState, type ReactNode } from "react"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { signOut } from "@/lib/cloud/auth"
import type { FirebaseServices } from "@/lib/cloud/firebase"
import { downloadAppData, hasAppData, loadData } from "@/lib/storage"

interface SignOutButtonProps {
  services: FirebaseServices
  /** Pinta el botón; `start` cierra la sesión (o pregunta antes). */
  children: (start: () => void, isBusy: boolean) => ReactNode
  /** Para enseñar un error de `signOut` donde esté el botón. */
  onError?: (error: unknown) => void
}

export function SignOutButton({ services, children, onError }: SignOutButtonProps) {
  const [askLocal, setAskLocal] = useState(false)
  const [isBusy, setIsBusy] = useState(false)

  const finish = async (clearLocalData: boolean) => {
    setIsBusy(true)
    try {
      await signOut(services, { clearLocalData })
    } catch (error) {
      onError?.(error)
      setIsBusy(false)
    }
  }

  const start = () => {
    if (hasAppData(loadData())) setAskLocal(true)
    else void finish(false)
  }

  return (
    <>
      {children(start, isBusy)}
      <Modal isOpen={askLocal} onClose={() => setAskLocal(false)} title="Datos en este dispositivo" size="sm">
        <div className="p-6 space-y-4">
          <p className="text-sm text-foreground">
            En este navegador quedan datos del modo local, sin cifrar. Al cerrar sesión puedes borrarlos o
            conservarlos (se verán al abrir la app sin cuenta).
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => downloadAppData(loadData())}>
            Exportar una copia antes
          </Button>
          <div className="flex flex-wrap justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => void finish(false)} disabled={isBusy}>
              Conservarlos y cerrar sesión
            </Button>
            <Button type="button" variant="destructive" onClick={() => void finish(true)} disabled={isBusy}>
              Borrarlos y cerrar sesión
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
