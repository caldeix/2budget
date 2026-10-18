/**
 * @file components/google-link-prompt.tsx
 * @description Lo que se pregunta al entrar con Google cuando hay algo que decidir (3.2.0, ver
 *              `lib/cloud/google-link.ts`):
 *              - Google ha creado una cuenta nueva: «¿Ya tienes una cuenta de 2Budget?». Si sí, se
 *                entra con su email y contraseña y Google queda unido a ella (mismo hogar y datos).
 *              - El email de Google ya tiene cuenta con contraseña: se pide esa contraseña para unirlas.
 */

"use client"

import type React from "react"
import { useState } from "react"
import type { Auth } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { GoogleLinkState } from "@/lib/cloud/google-link"
import { cancelGoogleLink, getErrorMessage, keepNewGoogleAccount, linkGoogleToExistingAccount } from "@/lib/cloud/auth"

interface GoogleLinkPromptProps {
  auth: Auth
  state: Extract<GoogleLinkState, { stage: "ask" | "existing" }>
}

export function GoogleLinkPrompt({ auth, state }: GoogleLinkPromptProps) {
  // En «ask», primero la pregunta; con «sí», el formulario. En «existing», directamente el formulario.
  const [showForm, setShowForm] = useState(state.stage === "existing")
  const [email, setEmail] = useState(state.stage === "existing" ? state.email : "")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  const run = async (action: () => Promise<void>) => {
    setError(null)
    setIsBusy(true)
    try {
      await action()
    } catch (err) {
      setError(getErrorMessage(err))
      setIsBusy(false)
    }
  }

  const handleLink = (e: React.FormEvent) => {
    e.preventDefault()
    void run(() => linkGoogleToExistingAccount(auth, email, password))
  }

  if (!showForm) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">¿Ya tienes una cuenta de 2Budget?</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Es la primera vez que entras con la cuenta de Google{" "}
            <strong className="break-all">{state.stage === "ask" ? state.googleEmail : state.email}</strong>.
            Si ya usas 2Budget con otro email, une Google a esa cuenta para conservar tu hogar y tus datos.
          </p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="grid gap-3">
          <Button type="button" onClick={() => setShowForm(true)} disabled={isBusy}>
            Sí, unir Google a mi cuenta
          </Button>
          <Button type="button" variant="outline" onClick={keepNewGoogleAccount} disabled={isBusy}>
            No, crear una cuenta nueva con Google
          </Button>
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={() => void run(() => cancelGoogleLink(auth))}
            disabled={isBusy}
          >
            Volver a <span className="text-primary">iniciar sesión</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleLink} className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Une Google a tu cuenta</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {state.stage === "existing"
            ? "Ya tienes una cuenta con este email. Escribe su contraseña para entrar y, a partir de ahora, podrás entrar también con Google."
            : "Entra con el email y la contraseña de tu cuenta de 2Budget. Después podrás entrar también con Google."}
        </p>
      </div>
      <div>
        <Label htmlFor="link-email">Email de tu cuenta</Label>
        <Input
          id="link-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          readOnly={state.stage === "existing"}
          required
        />
      </div>
      <div>
        <Label htmlFor="link-password">Contraseña</Label>
        <Input
          id="link-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={isBusy}>
        {isBusy ? "Un momento..." : "Entrar y unir Google"}
      </Button>
      <button
        type="button"
        className="w-full text-sm text-muted-foreground hover:text-foreground"
        onClick={() => void run(() => cancelGoogleLink(auth))}
        disabled={isBusy}
      >
        Cancelar y volver a <span className="text-primary">iniciar sesión</span>
      </button>
    </form>
  )
}
