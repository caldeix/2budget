/**
 * @file components/vault-unlock.tsx
 * @description Pantalla para desbloquear el hogar cifrado con la contraseña maestra. Aparece
 *              una vez en cada dispositivo (después, la clave queda guardada en él) y tras
 *              cerrar sesión. Si se ha olvidado, se puede elegir otra con el código de recuperación.
 *              Es un Client Component (`"use client"`) debido al uso de estados y eventos.
 */

"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { CloudSession } from "@/hooks/use-cloud-session"
import type { Vault } from "@/hooks/use-vault"
import { getErrorMessage, signOut } from "@/lib/cloud/auth"
import { leaveHousehold } from "@/lib/cloud/repository"
import { clearVaultCache } from "@/lib/cloud/vault-cache"
import { MasterPasswordFields, validateNewMasterPassword } from "@/components/master-password-fields"
import { KeyRound, LogOut } from "lucide-react"

interface VaultUnlockProps {
  session: CloudSession
  vault: Vault
  /** Recibe el código de recuperación nuevo tras usar el anterior, para mostrarlo. */
  onRecoveryCode: (code: string) => void
}

export function VaultUnlock({ session, vault, onRecoveryCode }: VaultUnlockProps) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [showForgotten, setShowForgotten] = useState(false)
  const [isConfirmingLeave, setIsConfirmingLeave] = useState(false)
  const [recoveryCode, setRecoveryCode] = useState("")
  const [newMaster, setNewMaster] = useState("")
  const [newMasterRepeat, setNewMasterRepeat] = useState("")

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault()
    const invalid = validateNewMasterPassword(newMaster, newMasterRepeat)
    if (invalid) {
      setError(invalid)
      return
    }
    setError(null)
    setIsBusy(true)
    try {
      onRecoveryCode(await vault.recover(recoveryCode, newMaster))
    } catch (err) {
      setError(getErrorMessage(err))
      setIsBusy(false)
    }
  }

  const handleLeave = async () => {
    const { services, user, householdId } = session
    if (!services || !user || !householdId) return
    setError(null)
    setIsBusy(true)
    try {
      await leaveHousehold(services.db, householdId, user.uid)
      await clearVaultCache()
    } catch (err) {
      setError(getErrorMessage(err))
      setIsBusy(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsBusy(true)
    try {
      await vault.unlock(password)
    } catch (err) {
      setError(getErrorMessage(err))
      setIsBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-card rounded-2xl shadow-lg border p-6 space-y-5">
        <div className="text-center space-y-2">
          <KeyRound className="h-10 w-10 text-primary mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Desbloquea tus datos</h1>
          <p className="text-sm text-muted-foreground">
            Tus datos están cifrados. Escribe tu contraseña maestra para leerlos en este dispositivo; solo se pide una
            vez en cada uno.
          </p>
          {session.user?.email && <p className="text-xs text-muted-foreground">{session.user.email}</p>}
        </div>

        {/* Desbloquear con la contraseña maestra */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="unlock-master">Contraseña maestra</Label>
            <Input
              id="unlock-master"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && !showForgotten && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={isBusy}>
            {isBusy ? "Desbloqueando..." : "Desbloquear"}
          </Button>
        </form>

        <div className="text-center space-y-2 text-sm">
          <button type="button" className="text-primary hover:underline" onClick={() => setShowForgotten((v) => !v)}>
            ¿Has olvidado tu contraseña maestra?
          </button>
          {showForgotten && (
            <div className="space-y-4 text-left">
              <p className="text-xs text-muted-foreground">
                Nadie puede recuperarla, ni siquiera el administrador: es lo que mantiene tus datos privados. Con tu{" "}
                <strong className="text-foreground">código de recuperación</strong> puedes elegir una nueva.
              </p>

              {/* Opción 1: código de recuperación (formulario propio) */}
              <form onSubmit={handleRecover} className="rounded-xl border p-3 space-y-3">
                <div>
                  <Label htmlFor="recovery-code">Código de recuperación</Label>
                  <Input
                    id="recovery-code"
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                    placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                    autoComplete="off"
                    className="font-mono tracking-wider uppercase"
                    required
                  />
                </div>
                <MasterPasswordFields
                  idPrefix="recover"
                  label="Contraseña maestra nueva"
                  password={newMaster}
                  repeat={newMasterRepeat}
                  onPasswordChange={setNewMaster}
                  onRepeatChange={setNewMasterRepeat}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" size="sm" className="w-full" disabled={isBusy}>
                  {isBusy ? "Recuperando..." : "Recuperar con el código"}
                </Button>
              </form>

              {/* Opción 2: sin código, salir del hogar */}
              <p className="text-xs text-muted-foreground">
                ¿Tampoco tienes el código? Si compartes el hogar y tu pareja sigue en él, sal del hogar y pídele una
                invitación nueva: al unirte elegirás otra contraseña maestra.
              </p>
              {isConfirmingLeave ? (
                <div className="rounded-xl border border-destructive/40 p-3 space-y-2">
                  <p className="text-xs text-foreground">
                    Si eres el único miembro, al salir se borra el hogar con todos sus datos y no se podrán recuperar.
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => setIsConfirmingLeave(false)} disabled={isBusy}>
                      Cancelar
                    </Button>
                    <Button type="button" size="sm" variant="destructive" onClick={() => void handleLeave()} disabled={isBusy}>
                      Salir del hogar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button type="button" size="sm" variant="outline" className="w-full" onClick={() => setIsConfirmingLeave(true)}>
                  Salir del hogar
                </Button>
              )}
            </div>
          )}
          {session.services && (
            <button
              type="button"
              className="flex items-center gap-1 mx-auto text-muted-foreground hover:text-foreground"
              onClick={() => session.services && void signOut(session.services)}
            >
              <LogOut className="h-3 w-3" /> Cerrar sesión
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
