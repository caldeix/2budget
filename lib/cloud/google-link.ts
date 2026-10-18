/**
 * @file lib/cloud/google-link.ts
 * @description Estado de la entrada con Google mientras hay algo que decidir (3.2.0).
 *
 *              Entrar con Google con una cuenta de Google que no existía en 2Budget CREA un usuario
 *              nuevo en Firebase. Si esa persona ya tenía una cuenta de 2Budget (con otro email), ese
 *              usuario nuevo no tendría su hogar. Por eso, antes de crear su perfil, se pregunta
 *              «¿Ya tienes una cuenta?» y, si dice que sí, Google se une a la cuenta existente.
 *
 *              - `signing-in`: la ventana de Google está abierta (aún no se sabe si el usuario es nuevo).
 *              - `ask`: Google ha creado un usuario nuevo; falta preguntar.
 *              - `existing`: el email de Google ya tiene cuenta con contraseña (y Firebase no las une
 *                solo, p. ej. con un email que no es de Gmail): hay que pedir esa contraseña.
 *
 *              Mientras hay estado, la sesión no crea el perfil ni abre la app (ver `useCloudSession`).
 */

import type { OAuthCredential } from "firebase/auth"

export type GoogleLinkState =
  | { stage: "signing-in" }
  | { stage: "ask"; credential: OAuthCredential; googleEmail: string }
  | { stage: "existing"; credential: OAuthCredential; email: string }

let state: GoogleLinkState | null = null
const listeners = new Set<() => void>()

export function getGoogleLinkState(): GoogleLinkState | null {
  return state
}

export function setGoogleLinkState(next: GoogleLinkState | null): void {
  state = next
  listeners.forEach((listener) => listener())
}

export function subscribeGoogleLink(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
