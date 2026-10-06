/**
 * @file components/account-modal.tsx
 * @description Modal de la cuenta en la nube. Según el estado de la sesión muestra:
 *              - sin sesión: el formulario de acceso (`AuthForm`);
 *              - con sesión y el email sin verificar: aviso para verificarlo (`VerifyEmailPanel`);
 *              - con sesión y sin hogar: crear o unirse a un hogar (`HouseholdSetup`);
 *              - con hogar: miembros e invitación (`HouseholdManager`), cambiar el email,
 *                cerrar sesión y eliminar la cuenta.
 *              Es un Client Component (`"use client"`) debido al uso de estados y eventos.
 */

"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthForm } from "@/components/auth-form"
import { HouseholdManager, HouseholdSetup } from "@/components/household-panel"
import type { CloudSession } from "@/hooks/use-cloud-session"
import type { HouseholdInfo } from "@/lib/cloud/repository"
import {
  deleteAccount,
  getErrorMessage,
  requestEmailChange,
  resendVerificationEmail,
  signOut,
} from "@/lib/cloud/auth"
import { LogOut, Mail, MailCheck, Trash2 } from "lucide-react"

/**
 * @interface AccountModalProps
 * @property {CloudSession} session - Estado de la sesión en la nube.
 * @property {HouseholdInfo | null} householdInfo - Miembros del hogar actual.
 * @property {string} person1Name - Nombre de la Persona 1 (rol de quien crea el hogar).
 * @property {string} person2Name - Nombre de la Persona 2 (rol de quien se une).
 * @property {boolean} [singleMode] - Modo individual: el hogar se presenta como "tu espacio en la nube".
 */
interface AccountModalProps {
  isOpen: boolean
  onClose: () => void
  session: CloudSession
  householdInfo: HouseholdInfo | null
  person1Name: string
  person2Name: string
  singleMode?: boolean
}

export function AccountModal({
  isOpen,
  onClose,
  session,
  householdInfo,
  person1Name,
  person2Name,
  singleMode,
}: AccountModalProps) {
  const { services, user, profile, householdId } = session
  if (!services) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cuenta" size="md">
      <div className="p-6 space-y-8">
        {!user ? (
          <AuthForm auth={services.auth} />
        ) : !session.emailVerified ? (
          <VerifyEmailPanel session={session} />
        ) : (
          <>
            {householdId ? (
              <HouseholdManager
                services={services}
                user={user}
                householdId={householdId}
                info={householdInfo}
                person1Name={person1Name}
                person2Name={person2Name}
                singleMode={singleMode}
              />
            ) : (
              <HouseholdSetup services={services} user={user} singleMode={singleMode} />
            )}
            <AccountSettings session={session} pendingEmail={profile?.pendingEmail ?? null} />
          </>
        )}
      </div>
    </Modal>
  )
}

/**
 * @function VerifyEmailPanel
 * @description Cuenta creada pero sin verificar: hasta pulsar el enlace del email no se puede
 *              crear ni unirse a un hogar. Se vuelve a comprobar al volver a la pestaña.
 */
function VerifyEmailPanel({ session }: { session: CloudSession }) {
  const { services, user, refreshUser } = session
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  // Al volver a la app tras pulsar el enlace (en otra pestaña o en el móvil), se comprueba sola.
  useEffect(() => {
    const onFocus = () => {
      refreshUser().catch(() => undefined)
    }
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [refreshUser])

  if (!services || !user) return null

  const run = async (action: () => Promise<void>) => {
    setError(null)
    setInfo(null)
    setIsBusy(true)
    try {
      await action()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsBusy(false)
    }
  }

  const handleResend = () =>
    run(async () => {
      await resendVerificationEmail(user)
      setInfo("Te hemos enviado otro email. Revisa también la carpeta de spam.")
    })

  const handleCheck = () =>
    run(async () => {
      const verified = await refreshUser()
      if (!verified) setInfo("Todavía no consta como verificado. Pulsa el enlace del email y vuelve a probar.")
    })

  return (
    <div className="space-y-4 text-center">
      <MailCheck className="h-12 w-12 text-primary mx-auto" />
      <h3 className="text-lg font-semibold text-foreground">Revisa tu correo</h3>
      <p className="text-sm text-muted-foreground">
        Te hemos enviado un enlace a <strong className="text-foreground">{user.email}</strong> para verificar tu
        cuenta. Púlsalo y vuelve aquí para crear tu hogar o unirte al de tu pareja.
      </p>

      {info && <p className="text-sm text-green-600">{info}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-1 gap-3">
        <Button type="button" onClick={() => void handleCheck()} disabled={isBusy}>
          Ya lo he verificado
        </Button>
        <Button type="button" variant="outline" onClick={() => void handleResend()} disabled={isBusy}>
          Reenviar email
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="flex items-center gap-2"
          onClick={() => void run(() => signOut(services))}
          disabled={isBusy}
        >
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </Button>
      </div>
    </div>
  )
}

/**
 * @function AccountSettings
 * @description Datos de la cuenta: email (y cambio de email), cerrar sesión y eliminarla.
 */
function AccountSettings({ session, pendingEmail }: { session: CloudSession; pendingEmail: string | null }) {
  const { services, user, householdId } = session
  const [panel, setPanel] = useState<"none" | "email" | "delete">("none")
  const [newEmail, setNewEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  if (!services || !user) return null

  const openPanel = (next: "none" | "email" | "delete") => {
    setPanel(next)
    setPassword("")
    setNewEmail("")
    setError(null)
    setInfo(null)
  }

  const run = async (action: () => Promise<void>) => {
    setError(null)
    setInfo(null)
    setIsBusy(true)
    try {
      await action()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsBusy(false)
    }
  }

  const handleEmailChange = (e: React.FormEvent) => {
    e.preventDefault()
    void run(async () => {
      await requestEmailChange(services, user, password, newEmail)
      setPanel("none")
      setPassword("")
      setInfo(`Te hemos enviado un enlace a ${newEmail.trim()}. El cambio se aplica cuando lo pulses.`)
    })
  }

  const handleDelete = (e: React.FormEvent) => {
    e.preventDefault()
    void run(() => deleteAccount(services, user, password, householdId))
  }

  return (
    <div className="space-y-4 border-t pt-6">
      <h3 className="text-lg font-semibold text-foreground">Tu cuenta</h3>
      <div className="rounded-xl bg-muted px-3 py-2 text-sm">
        <p className="text-foreground">{user.email}</p>
        {pendingEmail && pendingEmail !== user.email && (
          <p className="text-xs text-amber-600 mt-1">
            Cambio pendiente de confirmar en {pendingEmail}. Hasta entonces se entra con el email actual.
          </p>
        )}
      </div>

      {info && <p className="text-sm text-green-600">{info}</p>}

      {panel === "email" && (
        <form onSubmit={handleEmailChange} className="rounded-2xl border p-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Te enviaremos un enlace al email nuevo. Hasta que lo pulses seguirás entrando con el actual, y al
            antiguo le llegará un aviso con un enlace para deshacer el cambio.
          </p>
          <div>
            <Label htmlFor="new-email">Email nuevo</Label>
            <Input id="new-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="email-password">Contraseña actual</Label>
            <Input
              id="email-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => openPanel("none")} disabled={isBusy}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={isBusy}>
              {isBusy ? "Enviando..." : "Enviar enlace"}
            </Button>
          </div>
        </form>
      )}

      {panel === "delete" && (
        <form onSubmit={handleDelete} className="rounded-2xl border border-destructive/40 p-4 space-y-3">
          <p className="text-sm text-foreground">
            Se borrará tu cuenta y saldrás del hogar. Si eres el único miembro, también se borran todos los datos del
            hogar. Esta acción no se puede deshacer.
          </p>
          <div>
            <Label htmlFor="delete-password">Contraseña actual</Label>
            <Input
              id="delete-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => openPanel("none")} disabled={isBusy}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" size="sm" disabled={isBusy}>
              {isBusy ? "Eliminando..." : "Eliminar mi cuenta"}
            </Button>
          </div>
        </form>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {panel === "none" && (
        <div className="grid grid-cols-1 gap-3">
          <Button type="button" variant="outline" className="flex items-center gap-2" onClick={() => openPanel("email")}>
            <Mail className="h-4 w-4" /> Cambiar email
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => void run(() => signOut(services))}
            disabled={isBusy}
          >
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex items-center gap-2 text-destructive hover:bg-destructive/10"
            onClick={() => openPanel("delete")}
          >
            <Trash2 className="h-4 w-4" /> Eliminar cuenta
          </Button>
        </div>
      )}
    </div>
  )
}
