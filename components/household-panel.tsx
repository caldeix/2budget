/**
 * @file components/household-panel.tsx
 * @description Gestión del hogar compartido en la nube:
 *              - `HouseholdSetup`: tras crear la cuenta, crear un hogar (subiendo los datos de
 *                este dispositivo) o unirse al de la pareja con un código de invitación.
 *              - `HouseholdManager`: miembros, generar invitación y salir del hogar.
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
import { createHousehold, createInvite, joinHousehold, leaveHousehold, type HouseholdInfo } from "@/lib/cloud/repository"
import { getErrorMessage } from "@/lib/cloud/auth"
import { AlertTriangle, Copy, Download, Home, LogOut, UserPlus, Users } from "lucide-react"

interface HouseholdSetupProps {
  services: FirebaseServices
  user: User
}

/**
 * @function HouseholdSetup
 * @description Primer paso tras crear la cuenta: crear un hogar o unirse a uno.
 */
export function HouseholdSetup({ services, user }: HouseholdSetupProps) {
  // Datos que hay en este navegador (modo local), para ofrecer subirlos.
  const [localData] = useState(() => loadData())
  const hasLocalData = hasAppData(localData)
  const [uploadLocal, setUploadLocal] = useState(true)
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busyAction, setBusyAction] = useState<"create" | "join" | null>(null)

  const handleCreate = async () => {
    setError(null)
    setBusyAction("create")
    try {
      const initial = hasLocalData && uploadLocal ? localData : { ...emptyAppData, config: localData.config }
      await createHousehold(services.db, user.uid, user.email ?? "", initial)
      // Solo cuando la subida ha terminado bien se vacía la copia local.
      if (hasLocalData && uploadLocal) clearAllData()
    } catch (err) {
      setError(getErrorMessage(err))
      setBusyAction(null)
    }
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusyAction("join")
    try {
      await joinHousehold(services.db, code, user.uid, user.email ?? "")
    } catch (err) {
      setError(getErrorMessage(err))
      setBusyAction(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Tu hogar</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Los datos se guardan en un hogar. Créalo tú e invita a tu pareja, o únete al suyo con el código que te pase.
        </p>
      </div>

      {/* Crear hogar */}
      <div className="rounded-2xl border p-4 space-y-3">
        <h4 className="font-medium text-foreground flex items-center gap-2">
          <Home className="h-4 w-4" /> Crear un hogar
        </h4>
        {hasLocalData && (
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
        <Button onClick={handleCreate} className="w-full" disabled={busyAction !== null}>
          {busyAction === "create" ? "Creando y subiendo datos..." : "Crear hogar"}
        </Button>
      </div>

      {/* Unirse a un hogar */}
      <form onSubmit={handleJoin} className="rounded-2xl border p-4 space-y-3">
        <h4 className="font-medium text-foreground flex items-center gap-2">
          <UserPlus className="h-4 w-4" /> Unirme con un código
        </h4>
        {hasLocalData && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="space-y-2">
              <p className="text-xs text-amber-600">
                Los datos de este dispositivo no se mezclan con los del hogar: se quedan aquí, fuera de la cuenta.
                Exporta una copia si quieres conservarlos.
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
            placeholder="Ej: K7M2QX9P"
            maxLength={8}
            autoComplete="off"
            className="font-mono tracking-widest uppercase"
            required
          />
        </div>
        <Button type="submit" variant="outline" className="w-full" disabled={busyAction !== null || code.trim().length < 8}>
          {busyAction === "join" ? "Uniéndome..." : "Unirme al hogar"}
        </Button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}
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
}

/**
 * @function HouseholdManager
 * @description Hogar ya creado: miembros, invitación para la pareja y salir del hogar.
 */
export function HouseholdManager({ services, user, householdId, info, person1Name, person2Name }: HouseholdManagerProps) {
  const [invite, setInvite] = useState<{ code: string; expiresAt: Date } | null>(null)
  const [copied, setCopied] = useState(false)
  const [isConfirmingLeave, setIsConfirmingLeave] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  const members = info?.members ?? []
  const isAlone = members.length <= 1

  const handleInvite = async () => {
    setError(null)
    setIsBusy(true)
    try {
      setInvite(await createInvite(services.db, householdId, user.uid))
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
      await navigator.clipboard.writeText(invite.code)
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
    } catch (err) {
      setError(getErrorMessage(err))
      setIsBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <Users className="h-5 w-5" /> Tu hogar
      </h3>

      {/* Miembros */}
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

      {/* Invitación (solo mientras falta el segundo miembro) */}
      {isAlone && (
        <div className="rounded-2xl border p-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Invita a tu pareja: genera un código y pásaselo. Lo usa una sola vez, en las próximas 48 horas.
          </p>
          {invite ? (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2">
              <span className="font-mono text-lg tracking-widest text-foreground">{invite.code}</span>
              <Button type="button" size="sm" variant="ghost" onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-1" /> {copied ? "Copiado" : "Copiar"}
              </Button>
            </div>
          ) : null}
          <Button type="button" variant="outline" className="w-full" onClick={handleInvite} disabled={isBusy}>
            <UserPlus className="h-4 w-4 mr-2" /> {invite ? "Generar otro código" : "Generar código de invitación"}
          </Button>
        </div>
      )}

      {/* Salir del hogar */}
      {isConfirmingLeave ? (
        <div className="rounded-2xl border border-destructive/40 p-4 space-y-3">
          <p className="text-sm text-foreground">
            {isAlone
              ? "Eres el único miembro: al salir se borra el hogar con todos sus datos. Exporta una copia antes si la quieres conservar."
              : "Saldrás del hogar y dejarás de ver sus datos. Tu pareja los conserva."}
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsConfirmingLeave(false)} disabled={isBusy}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={handleLeave} disabled={isBusy}>
              {isBusy ? "Saliendo..." : "Salir del hogar"}
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
          <LogOut className="h-4 w-4 mr-2" /> Salir del hogar
        </Button>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
