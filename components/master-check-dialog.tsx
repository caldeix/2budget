/**
 * @file components/master-check-dialog.tsx
 * @description Comprobación mensual de la contraseña maestra: la pide para que no se olvide
 *              (en el día a día no se escribe, porque la clave queda guardada en el dispositivo).
 *              Se puede posponer un día, y si se ha olvidado, elegir otra con el código de recuperación.
 *              Es un Client Component (`"use client"`) debido al uso de estados y eventos.
 */

"use client"

import type React from "react"
import { useState } from "react"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MasterPasswordFields, validateNewMasterPassword } from "@/components/master-password-fields"
import type { CloudSession } from "@/hooks/use-cloud-session"
import type { Vault } from "@/hooks/use-vault"
import { getErrorMessage } from "@/lib/cloud/auth"
import { snoozeMasterCheck, verifyMasterPassword } from "@/lib/cloud/repository"
import { snoozeUntil } from "@/lib/cloud/master-check"
import { KeyRound } from "lucide-react"

interface MasterCheckDialogProps {
  isOpen: boolean
  session: CloudSession
  vault: Vault
  /** Recibe el código de recuperación nuevo si se usa el anterior. */
  onRecoveryCode: (code: string) => void
}

export function MasterCheckDialog({ isOpen, session, vault, onRecoveryCode }: MasterCheckDialogProps) {
  const [mode, setMode] = useState<"check" | "recover">("check")
  const [password, setPassword] = useState("")
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [recoveryCode, setRecoveryCode] = useState("")
  const [newMaster, setNewMaster] = useState("")
  const [newMasterRepeat, setNewMasterRepeat] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  const { services, user, householdId } = session
  if (!isOpen || !services || !user || !householdId) return null

  const run = async (action: () => Promise<void>) => {
    setError(null)
    setIsBusy(true)
    try {
      await action()
      // Al registrarse la comprobación, el perfil cambia y la ventana se cierra sola.
      setPassword("")
      setFailedAttempts(0)
      setMode("check")
    } catch (err) {
      setError(getErrorMessage(err))
      if (mode === "check") setFailedAttempts((n) => n + 1)
    } finally {
      setIsBusy(false)
    }
  }

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault()
    void run(() => verifyMasterPassword(services.db, householdId, user.uid, password))
  }

  const handleSnooze = () => {
    void run(() => snoozeMasterCheck(services.db, user.uid, snoozeUntil(new Date())))
  }

  const handleRecover = (e: React.FormEvent) => {
    e.preventDefault()
    const invalid = validateNewMasterPassword(newMaster, newMasterRepeat)
    if (invalid) {
      setError(invalid)
      return
    }
    void run(async () => {
      onRecoveryCode(await vault.recover(recoveryCode, newMaster))
      setRecoveryCode("")
      setNewMaster("")
      setNewMasterRepeat("")
    })
  }

  return (
    <Modal isOpen onClose={() => undefined} title="Comprobación mensual" size="sm" dismissible={false}>
      <div className="p-6 space-y-5">
        <div className="flex items-start gap-3">
          <KeyRound className="h-6 w-6 text-primary shrink-0" />
          <p className="text-sm text-muted-foreground">
            {mode === "check"
              ? "Una vez al mes te pedimos tu contraseña maestra para que no la olvides: sin ella ni tu código de recuperación, tus datos no se podrían recuperar."
              : "Escribe tu código de recuperación y elige una contraseña maestra nueva. Tus datos no cambian."}
          </p>
        </div>

        {mode === "check" ? (
          <form onSubmit={handleCheck} className="space-y-4">
            <div>
              <Label htmlFor="check-master">Contraseña maestra</Label>
              <Input
                id="check-master"
                type="password"
                autoComplete="current-password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {failedAttempts >= 2 && (
              <p className="text-xs text-amber-600">
                ¿No la recuerdas? Usa tu código de recuperación para elegir una nueva antes de que sea tarde.
              </p>
            )}
            <Button type="submit" className="w-full" disabled={isBusy}>
              {isBusy ? "Comprobando..." : "Comprobar"}
            </Button>
            <div className="flex flex-col items-center gap-2 text-sm">
              <button type="button" className="text-primary hover:underline" onClick={() => setMode("recover")}>
                ¿La has olvidado? Usar el código de recuperación
              </button>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={handleSnooze}
                disabled={isBusy}
              >
                Recordármelo mañana
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRecover} className="space-y-4">
            <div>
              <Label htmlFor="check-recovery-code">Código de recuperación</Label>
              <Input
                id="check-recovery-code"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                autoComplete="off"
                className="font-mono tracking-wider uppercase"
                required
              />
            </div>
            <MasterPasswordFields
              idPrefix="check-recover"
              label="Contraseña maestra nueva"
              password={newMaster}
              repeat={newMasterRepeat}
              onPasswordChange={setNewMaster}
              onRepeatChange={setNewMasterRepeat}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setMode("check")
                  setError(null)
                }}
                disabled={isBusy}
              >
                Volver
              </Button>
              <Button type="submit" disabled={isBusy}>
                {isBusy ? "Recuperando..." : "Elegir contraseña nueva"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}
