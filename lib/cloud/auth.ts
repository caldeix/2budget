/**
 * @file lib/cloud/auth.ts
 * @description Operaciones de cuenta con Firebase Auth (email y contraseña) y la traducción
 *              de sus errores a mensajes en español para la interfaz.
 */

import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  verifyBeforeUpdateEmail,
  type Auth,
  type User,
} from "firebase/auth"
import { clearIndexedDbPersistence, terminate } from "firebase/firestore"
import type { FirebaseServices } from "@/lib/cloud/firebase"
import { deleteUserProfile, leaveHousehold, setPendingEmail } from "@/lib/cloud/repository"
import { clearVaultCache } from "@/lib/cloud/vault-cache"

/** Mensajes en español para los códigos de error de Firebase más habituales. */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Email o contraseña incorrectos.",
  "auth/wrong-password": "La contraseña no es correcta.",
  "auth/user-not-found": "No hay ninguna cuenta con ese email.",
  "auth/invalid-email": "El email no es válido.",
  "auth/email-already-in-use": "Ya existe una cuenta con ese email.",
  "auth/weak-password": "La contraseña es demasiado débil: usa al menos 6 caracteres.",
  "auth/missing-password": "Escribe la contraseña.",
  "auth/too-many-requests": "Demasiados intentos. Espera unos minutos y vuelve a probar.",
  "auth/network-request-failed": "No hay conexión. Comprueba tu red y vuelve a probar.",
  "auth/requires-recent-login": "Por seguridad, vuelve a escribir tu contraseña.",
  "auth/operation-not-allowed": "Este tipo de acceso no está activado en Firebase.",
  "auth/quota-exceeded": "Se ha alcanzado el límite de envíos de Firebase. Vuelve a probar más tarde.",
  "auth/unauthorized-continue-uri": "Este dominio no está autorizado en Firebase (Authentication → Configuración → Dominios autorizados).",
  "auth/invalid-continue-uri": "La dirección de vuelta del enlace no es válida.",
  "auth/unauthorized-domain": "Este dominio no está autorizado en Firebase (Authentication → Configuración → Dominios autorizados).",
  "auth/user-token-expired": "Tu sesión ha caducado. Vuelve a iniciar sesión.",
  "permission-denied": "No tienes permiso para hacer esto.",
  unavailable: "No hay conexión con el servidor. Vuelve a probar en un momento.",
}

/**
 * @function getErrorMessage
 * @description Devuelve un mensaje para el usuario a partir de un error de Firebase o propio.
 */
export function getErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code
  if (code && AUTH_ERROR_MESSAGES[code]) return AUTH_ERROR_MESSAGES[code]
  if (error instanceof Error && error.name === "HouseholdError") return error.message
  if (error instanceof Error && !code) return error.message
  // Error no previsto: se deja en la consola y se muestra su código para poder diagnosticarlo.
  console.error("Unexpected Firebase error:", error)
  return `Ha ocurrido un error inesperado${code ? ` (${code})` : ""}. Vuelve a probar.`
}

/** URL a la que vuelven los enlaces de los emails de Firebase (dominio autorizado). */
function continueUrl(): string {
  return `${window.location.origin}${window.location.pathname}`
}

export function signIn(auth: Auth, email: string, password: string) {
  return signInWithEmailAndPassword(auth, email.trim(), password)
}

/**
 * @function signUp
 * @description Crea la cuenta y envía el email de verificación. Hasta pulsar el enlace no se
 *              puede usar la nube (lo exigen también las reglas de Firestore).
 */
export async function signUp(auth: Auth, email: string, password: string): Promise<void> {
  const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password)
  await sendEmailVerification(user, { url: continueUrl() })
}

/**
 * @function resendVerificationEmail
 * @description Vuelve a enviar el email de verificación.
 */
export function resendVerificationEmail(user: User) {
  return sendEmailVerification(user, { url: continueUrl() })
}

/**
 * @function refreshVerification
 * @description Comprueba si el email ya está verificado. Tras verificarlo hay que renovar el
 *              token de sesión: las reglas de Firestore leen `email_verified` del token, no del usuario.
 * @returns {Promise<boolean>} `true` si ya está verificado.
 */
export async function refreshVerification(user: User): Promise<boolean> {
  await user.reload()
  if (user.emailVerified) await user.getIdToken(true)
  return user.emailVerified
}

export function resetPassword(auth: Auth, email: string) {
  return sendPasswordResetEmail(auth, email.trim(), { url: continueUrl() })
}

/**
 * @function reauthenticate
 * @description Firebase exige un login reciente para cambiar el email o borrar la cuenta.
 */
async function reauthenticate(user: User, password: string): Promise<void> {
  if (!user.email) throw new Error("La cuenta no tiene email.")
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password))
}

/**
 * @function requestEmailChange
 * @description Envía un enlace al email nuevo; el cambio solo se aplica al pulsarlo. Mientras,
 *              se sigue entrando con el email actual. Después, al antiguo le llega un aviso con
 *              un enlace para deshacerlo.
 */
export async function requestEmailChange(
  services: FirebaseServices,
  user: User,
  password: string,
  newEmail: string,
): Promise<void> {
  await reauthenticate(user, password)
  await verifyBeforeUpdateEmail(user, newEmail.trim(), { url: continueUrl() })
  await setPendingEmail(services.db, user.uid, newEmail.trim())
}

/**
 * @function clearLocalCloudCacheAndReload
 * @description Cierra Firestore, borra su caché y la clave del hogar guardada en el
 *              dispositivo, y recarga la app. Así, tras cerrar sesión, ni los datos (cifrados) ni
 *              la clave para leerlos quedan en este navegador.
 */
async function clearLocalCloudCacheAndReload(services: FirebaseServices): Promise<void> {
  await clearVaultCache()
  try {
    await terminate(services.db)
    await clearIndexedDbPersistence(services.db)
  } catch (error) {
    console.error("Error clearing Firestore cache:", error)
  }
  window.location.reload()
}

export async function signOut(services: FirebaseServices): Promise<void> {
  await firebaseSignOut(services.auth)
  await clearLocalCloudCacheAndReload(services)
}

/**
 * @function deleteAccount
 * @description Elimina la cuenta: sale del hogar (si era el último miembro, se borra con sus
 *              datos), borra el perfil y por último el usuario de Firebase Auth.
 */
export async function deleteAccount(
  services: FirebaseServices,
  user: User,
  password: string,
  householdId: string | null,
): Promise<void> {
  await reauthenticate(user, password)
  if (householdId) await leaveHousehold(services.db, householdId, user.uid)
  await deleteUserProfile(services.db, user.uid)
  await deleteUser(user)
  await clearLocalCloudCacheAndReload(services)
}
