/**
 * @file components/auth-form.tsx
 * @description Formulario de acceso con email y contraseña: iniciar sesión, crear cuenta y
 *              recuperar la contraseña (Firebase envía un enlace por email).
 *              Es un Client Component (`"use client"`) debido al uso de estados y eventos.
 */

"use client"

import type React from "react"
import { useState } from "react"
import type { Auth } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getErrorMessage, resetPassword, signIn, signUp } from "@/lib/cloud/auth"

type AuthMode = "signIn" | "signUp" | "reset"

/**
 * @interface AuthFormProps
 * @property {Auth} auth - Instancia de Firebase Auth.
 */
interface AuthFormProps {
  auth: Auth
}

export function AuthForm({ auth }: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>("signIn")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [passwordRepeat, setPasswordRepeat] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  const switchMode = (next: AuthMode) => {
    setMode(next)
    setError(null)
    setInfo(null)
    setPassword("")
    setPasswordRepeat("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)

    if (mode === "signUp" && password !== passwordRepeat) {
      setError("Las contraseñas no coinciden.")
      return
    }

    setIsBusy(true)
    try {
      if (mode === "signIn") await signIn(auth, email, password)
      else if (mode === "signUp") await signUp(auth, email, password)
      else {
        await resetPassword(auth, email)
        // Mismo mensaje exista o no la cuenta: no se revela qué emails están registrados.
        setInfo("Si hay una cuenta con ese email, te llegará un enlace para elegir una contraseña nueva.")
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsBusy(false)
    }
  }

  const title = mode === "signIn" ? "Inicia sesión" : mode === "signUp" ? "Crea tu cuenta" : "Recupera tu contraseña"
  const submitLabel = mode === "signIn" ? "Entrar" : mode === "signUp" ? "Crear cuenta" : "Enviar enlace"

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {mode === "reset"
            ? "Te enviaremos un enlace para elegir una contraseña nueva."
            : "Necesitas una cuenta para usar 2Budget. Con ella podrás guardar tus datos cifrados en la nube, usarlos desde cualquier dispositivo y compartirlos con tu pareja."}
        </p>
      </div>

      <div>
        <Label htmlFor="auth-email">Email</Label>
        <Input
          id="auth-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      {mode !== "reset" && (
        <div>
          <Label htmlFor="auth-password">Contraseña</Label>
          <Input
            id="auth-password"
            type="password"
            autoComplete={mode === "signUp" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </div>
      )}

      {mode === "signUp" && (
        <div>
          <Label htmlFor="auth-password-repeat">Repite la contraseña</Label>
          <Input
            id="auth-password-repeat"
            type="password"
            autoComplete="new-password"
            value={passwordRepeat}
            onChange={(e) => setPasswordRepeat(e.target.value)}
            minLength={6}
            required
          />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {info && <p className="text-sm text-green-600">{info}</p>}

      <Button type="submit" className="w-full" disabled={isBusy}>
        {isBusy ? "Un momento..." : submitLabel}
      </Button>

      <div className="flex flex-col items-center gap-2 text-sm">
        {mode === "signIn" && (
          <>
            <button type="button" className="text-primary hover:underline" onClick={() => switchMode("reset")}>
              ¿Has olvidado tu contraseña?
            </button>
            <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => switchMode("signUp")}>
              ¿No tienes cuenta? <span className="text-primary">Créala</span>
            </button>
          </>
        )}
        {mode !== "signIn" && (
          <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => switchMode("signIn")}>
            Volver a <span className="text-primary">iniciar sesión</span>
          </button>
        )}
      </div>
    </form>
  )
}
