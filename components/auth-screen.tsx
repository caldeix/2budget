/**
 * @file components/auth-screen.tsx
 * @description Pantalla de acceso a pantalla completa. La app exige una cuenta con el email
 *              verificado: sin sesión se muestra el formulario de entrar / crear cuenta, y con
 *              la cuenta sin verificar, el aviso para verificarla. Si una entrada con Google tiene
 *              algo que decidir (¿ya tienes cuenta?, ¿su contraseña?), esa pregunta (3.2.0).
 *              Es un Client Component (`"use client"`) porque contiene formularios con estado.
 */

"use client"

import { AuthForm } from "@/components/auth-form"
import { VerifyEmailPanel } from "@/components/verify-email-panel"
import { GoogleLinkPrompt } from "@/components/google-link-prompt"
import type { CloudSession } from "@/hooks/use-cloud-session"
import { Heart } from "lucide-react"

interface AuthScreenProps {
  session: CloudSession
}

export function AuthScreen({ session }: AuthScreenProps) {
  if (!session.services) return null

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-10 gap-6">
      {/* Mismo logo que la cabecera de la app */}
      <h1 className="text-3xl font-bold text-foreground relative">
        2Budge
        <span className="relative inline-block">
          t
          <Heart className="h-3 w-3 fill-red-500 text-red-500 absolute -top-1 -right-1" />
        </span>
      </h1>

      <div className="w-full max-w-sm bg-card rounded-2xl shadow-lg border p-6">
        {session.googleLink && session.googleLink.stage !== "signing-in" ? (
          <GoogleLinkPrompt auth={session.services.auth} state={session.googleLink} />
        ) : session.user && !session.emailVerified ? (
          <VerifyEmailPanel session={session} />
        ) : (
          <AuthForm auth={session.services.auth} />
        )}
      </div>
    </div>
  )
}
