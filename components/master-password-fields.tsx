/**
 * @file components/master-password-fields.tsx
 * @description Campos para elegir una contraseña maestra (contraseña + repetición) con el aviso
 *              de que, sin ella, los datos cifrados no se pueden recuperar.
 *              Es un Client Component (`"use client"`) porque recibe manejadores de eventos.
 */

"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MIN_MASTER_PASSWORD_LENGTH } from "@/lib/cloud/crypto"
import { KeyRound } from "lucide-react"

/**
 * @function validateNewMasterPassword
 * @description Comprueba una contraseña maestra nueva.
 * @returns {string | null} El mensaje de error, o `null` si es válida.
 */
export function validateNewMasterPassword(password: string, repeat: string): string | null {
  if (password.length < MIN_MASTER_PASSWORD_LENGTH) {
    return `La contraseña maestra debe tener al menos ${MIN_MASTER_PASSWORD_LENGTH} caracteres.`
  }
  if (password !== repeat) return "Las contraseñas maestras no coinciden."
  return null
}

interface MasterPasswordFieldsProps {
  idPrefix: string
  password: string
  repeat: string
  onPasswordChange: (value: string) => void
  onRepeatChange: (value: string) => void
  /** Etiqueta del primer campo (p. ej. "Contraseña maestra nueva"). */
  label?: string
}

export function MasterPasswordFields({
  idPrefix,
  password,
  repeat,
  onPasswordChange,
  onRepeatChange,
  label = "Contraseña maestra",
}: MasterPasswordFieldsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-xl bg-muted p-3">
        <KeyRound className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          Cifra tus datos en este dispositivo antes de subirlos: ni siquiera el administrador de la app puede leerlos.
          Es distinta de la contraseña de tu cuenta. <strong className="text-foreground">No se puede recuperar</strong>:
          si la olvidas, perderás el acceso a tus datos en la nube. Guárdala en un lugar seguro.
        </p>
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-master`}>{label}</Label>
        <Input
          id={`${idPrefix}-master`}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          minLength={MIN_MASTER_PASSWORD_LENGTH}
          required
        />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-master-repeat`}>Repite la contraseña maestra</Label>
        <Input
          id={`${idPrefix}-master-repeat`}
          type="password"
          autoComplete="new-password"
          value={repeat}
          onChange={(e) => onRepeatChange(e.target.value)}
          minLength={MIN_MASTER_PASSWORD_LENGTH}
          required
        />
      </div>
    </div>
  )
}
