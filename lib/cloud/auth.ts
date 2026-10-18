/**
 * @file lib/cloud/auth.ts
 * @description Operaciones de cuenta con Firebase Auth (email y contraseña, y Google desde la
 *              3.2.0) y la traducción de sus errores a mensajes en español para la interfaz.
 */

import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  getAdditionalUserInfo,
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  signInWithPopup,
  unlink,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  verifyBeforeUpdateEmail,
  type Auth,
  type User,
} from "firebase/auth"
import type { FirebaseError } from "firebase/app"
import { clearIndexedDbPersistence, terminate } from "firebase/firestore"
import type { FirebaseServices } from "@/lib/cloud/firebase"
import { deleteUserProfile, leaveHousehold, setPendingEmail } from "@/lib/cloud/repository"
import { clearVaultCache } from "@/lib/cloud/vault-cache"
import { clearAllData } from "@/lib/storage"
import { getGoogleLinkState, setGoogleLinkState } from "@/lib/cloud/google-link"

/** Mensajes en español para los códigos de error de Firebase más habituales. */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Email o contraseña incorrectos.",
  "auth/wrong-password": "La contraseña no es correcta.",
  "auth/user-not-found": "No hay ninguna cuenta con ese email.",
  "auth/invalid-email": "El email no es válido.",
  "auth/email-already-in-use": "Ya existe una cuenta con ese email.",
  "auth/weak-password": "La contraseña es demasiado débil: usa al menos 8 caracteres.",
  "auth/password-does-not-meet-requirements": "La contraseña no cumple los requisitos: usa al menos 8 caracteres.",
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
  "auth/popup-closed-by-user": "Has cerrado la ventana de Google antes de terminar.",
  "auth/popup-blocked": "El navegador ha bloqueado la ventana de Google. Permite las ventanas emergentes para esta web y vuelve a probar.",
  "auth/credential-already-in-use": "Esa cuenta de Google ya está unida a otra cuenta de 2Budget.",
  "auth/provider-already-linked": "Tu cuenta ya tiene Google vinculado.",
  "auth/no-such-provider": "Tu cuenta no tiene Google vinculado.",
  "auth/user-mismatch": "Esa cuenta de Google no es la vinculada a tu cuenta de 2Budget.",
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
 * @description Firebase exige un login reciente para cambiar el email o borrar la cuenta. Con
 *              contraseña, con ella; si la cuenta solo entra con Google, con la ventana de Google.
 */
async function reauthenticate(user: User, password: string): Promise<void> {
  if (!user.providerData.some((provider) => provider.providerId === "password")) {
    await reauthenticateWithPopup(user, new GoogleAuthProvider())
    return
  }
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

// --- Google (3.2.0) -------------------------------------------------------------------------

const GOOGLE = "google.com"
const PASSWORD = "password"

/** Proveedor de Google; pide elegir cuenta cada vez (si no, entra con la última sin preguntar). */
function googleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: "select_account" })
  return provider
}

/** Si la cuenta puede entrar con ese método (`google.com` o `password`). */
export const hasProvider = (user: User, providerId: string) =>
  user.providerData.some((provider) => provider.providerId === providerId)
export const hasGoogle = (user: User) => hasProvider(user, GOOGLE)
export const hasPassword = (user: User) => hasProvider(user, PASSWORD)

/**
 * @function signInWithGoogle
 * @description Entra con la ventana de Google. Si Google crea un usuario nuevo, queda pendiente de
 *              la pregunta «¿Ya tienes una cuenta?» (ver `lib/cloud/google-link.ts`); si el email ya
 *              tiene cuenta con contraseña y Firebase no las une solo, queda pendiente de esa
 *              contraseña. Con un Gmail ya registrado y verificado, Firebase las une y entra directo.
 */
export async function signInWithGoogle(auth: Auth): Promise<void> {
  // Antes de abrir la ventana: así la sesión no crea el perfil del usuario nuevo mientras tanto.
  setGoogleLinkState({ stage: "signing-in" })
  try {
    const result = await signInWithPopup(auth, googleProvider())
    const credential = GoogleAuthProvider.credentialFromResult(result)
    if (getAdditionalUserInfo(result)?.isNewUser && credential) {
      setGoogleLinkState({ stage: "ask", credential, googleEmail: result.user.email ?? "" })
    } else {
      setGoogleLinkState(null)
    }
  } catch (error) {
    const firebaseError = error as FirebaseError
    const email = (firebaseError.customData as { email?: string } | undefined)?.email
    const credential = GoogleAuthProvider.credentialFromError(firebaseError)
    if (firebaseError.code === "auth/account-exists-with-different-credential" && credential && email) {
      setGoogleLinkState({ stage: "existing", credential, email })
      return
    }
    setGoogleLinkState(null)
    throw error
  }
}

/** «No, es una cuenta nueva»: se queda la cuenta creada con Google y sigue como siempre. */
export function keepNewGoogleAccount(): void {
  setGoogleLinkState(null)
}

/**
 * @function linkGoogleToExistingAccount
 * @description Une la cuenta de Google pendiente a una cuenta de 2Budget que ya existe, entrando con
 *              su email y contraseña. Si Google acababa de crear un usuario nuevo, antes se borra (no
 *              tiene perfil ni hogar), para que no quede un usuario de más en Firebase.
 */
export async function linkGoogleToExistingAccount(auth: Auth, email: string, password: string): Promise<void> {
  const pending = getGoogleLinkState()
  if (!pending || pending.stage === "signing-in") throw new Error("No hay ninguna cuenta de Google que unir.")
  if (pending.stage === "ask" && auth.currentUser && hasGoogle(auth.currentUser) && !hasPassword(auth.currentUser)) {
    // Acaba de entrar con Google: cuenta como acceso reciente, así que se puede borrar sin más.
    await deleteUser(auth.currentUser)
  }
  const { user } = await signInWithEmailAndPassword(auth, email.trim(), password)
  try {
    await linkWithCredential(user, pending.credential)
  } catch (error) {
    // Ya la tenía vinculada (p. ej. un segundo intento): no es un problema.
    if ((error as { code?: string }).code !== "auth/provider-already-linked") throw error
  }
  setGoogleLinkState(null)
}

/** Volver atrás sin unir nada: se cierra la sesión del usuario de Google que hubiera. */
export async function cancelGoogleLink(auth: Auth): Promise<void> {
  setGoogleLinkState(null)
  if (auth.currentUser) await firebaseSignOut(auth)
}

/** Vincula Google a la cuenta abierta (desde Cuenta). */
export async function linkGoogle(user: User): Promise<void> {
  await linkWithPopup(user, googleProvider())
}

/** Desvincula Google; solo si queda la contraseña para entrar. */
export async function unlinkGoogle(user: User): Promise<void> {
  if (!hasPassword(user)) throw new Error("Para quitar Google, la cuenta necesita una contraseña.")
  await unlink(user, GOOGLE)
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

/**
 * @function signOut
 * @description Cierra la sesión y borra la caché de la nube de este dispositivo. Con
 *              `clearLocalData`, borra también la copia del modo local (sin cifrar), si la había.
 */
export async function signOut(services: FirebaseServices, options: { clearLocalData?: boolean } = {}): Promise<void> {
  await firebaseSignOut(services.auth)
  if (options.clearLocalData) clearAllData()
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
