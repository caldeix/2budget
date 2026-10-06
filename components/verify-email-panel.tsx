/**
 * @file components/verify-email-panel.tsx
 * @description Cuenta creada pero sin verificar: aviso para pulsar el enlace del email, con
 *              opciones para reenviarlo, comprobarlo y cerrar sesión. Se usa a pantalla completa
 *              (la app exige el email verificado) y dentro de la ventana de Cuenta.
 *              Es un Client Component (`"use client"`) debido al uso de estados y eventos.
 */

"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import type { CloudSession } from "@/hooks/use-cloud-session"
import { getErrorMessage, resendVerificationEmail, signOut } from "@/lib/cloud/auth"
import { LogOut, MailCheck } from "lucide-react"

/**
 * @function VerifyEmailPanel
 * @description Cuenta creada pero sin verificar: hasta pulsar el enlace del email no se puede
 *              crear ni unirse a un hogar. Se vuelve a comprobar al volver a la pestaña.
 */
export function VerifyEmailPanel({ session }: { session: CloudSession }) {
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
