/**
 * @file components/household-panel.tsx
 * @description Gestión del hogar compartido en la nube:
 *              - `HouseholdSetup`: tras crear la cuenta, crear un hogar (subiendo los datos de
 *                este dispositivo) o unirse al de la pareja con un código de invitación.
 *              - `HouseholdManager`: miembros, generar invitación y salir del hogar.
 *              En modo individual el hogar se presenta como "tu espacio en la nube", sin la
 *              parte de pareja (unirse e invitar).
 *              Es un Client Component (`"use client"`) debido al uso de estados y eventos.
 */

"use client"

import type React from "react"
import { useState } from "react"
import type { User } from "firebase/auth"
import type { FirebaseServices } from "@/lib/cloud/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { clearAllData, downloadAppData, emptyAppData, hasAppData, loadData } from "@/lib/storage"
import {
  createHousehold,
  createInvite,
  joinHousehold,
  leaveHousehold,
  unlockExtractableDek,
  type HouseholdInfo,
} from "@/lib/cloud/repository"
import { formatCode } from "@/lib/cloud/crypto"
import { clearVaultCache } from "@/lib/cloud/vault-cache"
import { getErrorMessage } from "@/lib/cloud/auth"
import { MasterPasswordFields, validateNewMasterPassword } from "@/components/master-password-fields"
import { AlertTriangle, Copy, Download, Home, LogOut, UserPlus, Users } from "lucide-react"

interface HouseholdSetupProps {
  services: FirebaseServices
  user: User
  singleMode?: boolean
  /** Recibe el código de recuperación generado, para mostrarlo una sola vez. */
  onRecoveryCode: (code: string) => void
}

/**
 * @function HouseholdSetup
 * @description Primer paso tras verificar la cuenta: crear un hogar o unirse a uno. En los dos
 *              casos se elige la contraseña maestra con la que se cifran los datos.
 */
export function HouseholdSetup({ services, user, singleMode, onRecoveryCode }: HouseholdSetupProps) {
  // Datos que hay en este navegador (modo local), para ofrecer subirlos.
  const [localData] = useState(() => loadData())
  const hasLocalData = hasAppData(localData)
  const [choice, setChoice] = useState<"create" | "join" | null>(singleMode ? "create" : null)
  const [uploadLocal, setUploadLocal] = useState(true)
  const [code, setCode] = useState("")
  const [masterPassword, setMasterPassword] = useState("")
  const [masterRepeat, setMasterRepeat] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  const choose = (next: "create" | "join" | null) => {
    setChoice(next)
    setError(null)
    setMasterPassword("")
    setMasterRepeat("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const invalid = validateNewMasterPassword(masterPassword, masterRepeat)
    if (invalid) {
      setError(invalid)
      return
    }
    setError(null)
    setIsBusy(true)
    try {
      if (choice === "create") {
        const initial = hasLocalData && uploadLocal ? localData : { ...emptyAppData, config: localData.config }
        const { recoveryCode } = await createHousehold(services.db, user.uid, user.email ?? "", initial, masterPassword)
        // Solo cuando la subida ha terminado bien se vacía la copia local.
        if (hasLocalData && uploadLocal) clearAllData()
        onRecoveryCode(recoveryCode)
      } else {
        const { recoveryCode } = await joinHousehold(services.db, code, user.uid, user.email ?? "", masterPassword)
        onRecoveryCode(recoveryCode)
      }
    } catch (err) {
      setError(getErrorMessage(err))
      setIsBusy(false)
    }
  }

  const spaceName = singleMode ? "tu espacio" : "el hogar"

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">{singleMode ? "Tu espacio en la nube" : "Tu hogar"}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {singleMode
            ? "Crea tu espacio en la nube para tener tus datos a salvo y usarlos desde cualquier dispositivo."
            : "Los datos se guardan en un hogar. Créalo tú e invita a tu pareja, o únete al suyo con el código que te pase."}
        </p>
      </div>

      {/* Elección: crear o unirse (en modo individual, directamente crear) */}
      {choice === null && (
        <div className="grid grid-cols-1 gap-3">
          <Button type="button" onClick={() => choose("create")} className="flex items-center gap-2">
            <Home className="h-4 w-4" /> Crear un hogar
          </Button>
          <Button type="button" variant="outline" onClick={() => choose("join")} className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" /> Unirme con un código
          </Button>
        </div>
      )}

      {choice !== null && (
        <form onSubmit={handleSubmit} className="rounded-2xl border p-4 space-y-4">
          <h4 className="font-medium text-foreground flex items-center gap-2">
            {choice === "create" ? <Home className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {choice === "create" ? (singleMode ? "Crear mi espacio" : "Crear un hogar") : "Unirme con un código"}
          </h4>

          {choice === "create" && hasLocalData && (
            <label className="flex items-start gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={uploadLocal}
                onChange={(e) => setUploadLocal(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span>
                Subir los datos de este dispositivo ({localData.transactions.length} transacciones y{" "}
                {localData.reports.length} informes)
              </span>
            </label>
          )}

          {choice === "join" && (
            <>
              {hasLocalData && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="space-y-2">
                    <p className="text-xs text-amber-600">
                      Los datos de este dispositivo no se mezclan con los del hogar: se quedan aquí, fuera de la
                      cuenta. Exporta una copia si quieres conservarlos.
                    </p>
                    <Button type="button" size="sm" variant="outline" onClick={() => downloadAppData(localData)}>
                      <Download className="h-3 w-3 mr-1" /> Exportar copia
                    </Button>
                  </div>
                </div>
              )}
              <div>
                <Label htmlFor="invite-code">Código de invitación</Label>
                <Input
                  id="invite-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
                  autoComplete="off"
                  className="font-mono tracking-wider uppercase"
                  required
                />
              </div>
            </>
          )}

          <MasterPasswordFields
            idPrefix={`setup-${choice}`}
            password={masterPassword}
            repeat={masterRepeat}
            onPasswordChange={setMasterPassword}
            onRepeatChange={setMasterRepeat}
          />

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            {!singleMode && (
              <Button type="button" variant="outline" onClick={() => choose(null)} disabled={isBusy}>
                Volver
              </Button>
            )}
            <Button type="submit" disabled={isBusy}>
              {isBusy
                ? choice === "create"
                  ? "Cifrando y subiendo datos..."
                  : "Uniéndome..."
                : choice === "create"
                  ? `Crear ${spaceName}`
                  : "Unirme al hogar"}
            </Button>
          </div>
        </form>
      )}

      {singleMode && (
        <p className="text-xs text-muted-foreground">
          ¿Quieres compartirlo con tu pareja? Desactiva el modo individual en Configuración y podréis usar un hogar
          compartido.
        </p>
      )}
    </div>
  )
}

interface HouseholdManagerProps {
  services: FirebaseServices
  user: User
  householdId: string
  info: HouseholdInfo | null
  person1Name: string
  person2Name: string
  singleMode?: boolean
}

/**
 * @function HouseholdManager
 * @description Hogar ya creado: miembros, invitación para la pareja y salir del hogar.
 */
export function HouseholdManager({
  services,
  user,
  householdId,
  info,
  person1Name,
  person2Name,
  singleMode,
}: HouseholdManagerProps) {
  const [invite, setInvite] = useState<{ code: string; expiresAt: Date } | null>(null)
  const [inviteMasterPassword, setInviteMasterPassword] = useState("")
  const [copied, setCopied] = useState(false)
  const [isConfirmingLeave, setIsConfirmingLeave] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  const members = info?.members ?? []
  const isAlone = members.length <= 1
  // En modo individual, con un solo miembro, el hogar es "tu espacio" y no se invita a nadie.
  const isPersonalSpace = Boolean(singleMode) && isAlone

  // La invitación lleva una copia de la clave del hogar: para sacarla hace falta la contraseña maestra.
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsBusy(true)
    try {
      const dek = await unlockExtractableDek(services.db, householdId, user.uid, inviteMasterPassword)
      setInvite(await createInvite(services.db, householdId, user.uid, dek))
      setInviteMasterPassword("")
      setCopied(false)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsBusy(false)
    }
  }

  const handleCopy = async () => {
    if (!invite) return
    try {
      await navigator.clipboard.writeText(formatCode(invite.code))
      setCopied(true)
    } catch {
      // Sin permiso de portapapeles: el código sigue visible para copiarlo a mano.
    }
  }

  const handleLeave = async () => {
    setError(null)
    setIsBusy(true)
    try {
      await leaveHousehold(services.db, householdId, user.uid)
      // La clave de este hogar ya no sirve en este dispositivo.
      await clearVaultCache()
    } catch (err) {
      setError(getErrorMessage(err))
      setIsBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <Users className="h-5 w-5" /> {isPersonalSpace ? "Tu espacio en la nube" : "Tu hogar"}
      </h3>
      {isPersonalSpace && (
        <p className="text-sm text-muted-foreground">Tus datos se guardan en la nube y se sincronizan entre tus dispositivos.</p>
      )}

      {/* Miembros */}
      {!isPersonalSpace && (
        <ul className="space-y-2">
          {members.map((uid) => (
            <li key={uid} className="flex items-center justify-between rounded-xl bg-muted px-3 py-2 text-sm">
              <span className="text-foreground truncate">
                {info?.memberEmails[uid] ?? "Miembro"}
                {uid === user.uid && <span className="text-muted-foreground"> (tú)</span>}
              </span>
              <span className="text-xs text-muted-foreground shrink-0 ml-2">
                {info?.roles[uid] === "person2" ? person2Name : person1Name}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Invitación (solo mientras falta el segundo miembro, y no en modo individual) */}
      {isAlone && !isPersonalSpace && (
        <form onSubmit={handleInvite} className="rounded-2xl border p-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Invita a tu pareja: genera un código y pásaselo por un canal privado. Lo usa una sola vez, en las próximas
            48 horas, y con él elegirá su propia contraseña maestra.
          </p>
          {invite && (
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2">
                <span className="font-mono text-sm sm:text-base tracking-wider text-foreground break-all">
                  {formatCode(invite.code)}
                </span>
                <Button type="button" size="sm" variant="ghost" onClick={handleCopy} className="shrink-0">
                  <Copy className="h-4 w-4 mr-1" /> {copied ? "Copiado" : "Copiar"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Caduca el {invite.expiresAt.toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}.
              </p>
            </div>
          )}
          <div>
            <Label htmlFor="invite-master">Tu contraseña maestra</Label>
            <Input
              id="invite-master"
              type="password"
              autoComplete="current-password"
              value={inviteMasterPassword}
              onChange={(e) => setInviteMasterPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" variant="outline" className="w-full" disabled={isBusy}>
            <UserPlus className="h-4 w-4 mr-2" /> {invite ? "Generar otro código" : "Generar código de invitación"}
          </Button>
        </form>
      )}

      {/* Salir del hogar */}
      {isConfirmingLeave ? (
        <div className="rounded-2xl border border-destructive/40 p-4 space-y-3">
          <p className="text-sm text-foreground">
            {isPersonalSpace
              ? "Se borrará tu espacio en la nube con todos sus datos. Exporta una copia antes si la quieres conservar."
              : isAlone
                ? "Eres el único miembro: al salir se borra el hogar con todos sus datos. Exporta una copia antes si la quieres conservar."
                : "Saldrás del hogar y dejarás de ver sus datos. Tu pareja los conserva."}
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsConfirmingLeave(false)} disabled={isBusy}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={handleLeave} disabled={isBusy}>
              {isBusy ? "Saliendo..." : isPersonalSpace ? "Borrar mi espacio" : "Salir del hogar"}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full text-destructive hover:bg-destructive/10"
          onClick={() => setIsConfirmingLeave(true)}
        >
          <LogOut className="h-4 w-4 mr-2" /> {isPersonalSpace ? "Borrar mi espacio en la nube" : "Salir del hogar"}
        </Button>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
