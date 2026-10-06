/**
 * @file hooks/use-cloud-session.ts
 * @description Estado de la sesión en la nube: usuario de Firebase Auth y su perfil
 *              (`users/{uid}`), que dice a qué hogar pertenece.
 *              Hasta que el usuario verifica su email no se lee ni se escribe nada en la nube
 *              (las reglas de Firestore también lo exigen).
 *              Sin configuración de Firebase en la build, la sesión queda desactivada y la app
 *              funciona solo en local, como antes.
 */

"use client"

import { useCallback, useEffect, useState } from "react"
import { onAuthStateChanged, type User } from "firebase/auth"
import { getFirebase, isCloudConfigured, type FirebaseServices } from "@/lib/cloud/firebase"
import { refreshVerification } from "@/lib/cloud/auth"
import { ensureUserProfile, subscribeUserProfile, type UserProfile } from "@/lib/cloud/repository"

/**
 * @interface CloudSession
 * @property {boolean} enabled - La build trae configuración de Firebase.
 * @property {boolean} ready - Ya se sabe si hay sesión y, si la hay, su perfil.
 * @property {User | null} user - Usuario con sesión iniciada.
 * @property {boolean} emailVerified - El usuario ha verificado su email (requisito para usar la nube).
 * @property {() => Promise<boolean>} refreshUser - Vuelve a comprobar si el email ya está verificado.
 * @property {UserProfile | null} profile - Perfil del usuario.
 * @property {string | null} householdId - Hogar del usuario; `null` = modo local.
 * @property {FirebaseServices | null} services - Servicios de Firebase.
 */
export interface CloudSession {
  enabled: boolean
  ready: boolean
  user: User | null
  emailVerified: boolean
  refreshUser: () => Promise<boolean>
  profile: UserProfile | null
  householdId: string | null
  services: FirebaseServices | null
}

export function useCloudSession(): CloudSession {
  const [services] = useState(() => getFirebase())
  const [authKnown, setAuthKnown] = useState(!isCloudConfigured)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  // `user.reload()` actualiza el mismo objeto `User`: este contador fuerza el nuevo render.
  const [, setUserVersion] = useState(0)
  const emailVerified = user?.emailVerified ?? false

  // Sesión de Firebase Auth.
  useEffect(() => {
    if (!services) {
      setAuthKnown(true)
      return
    }
    return onAuthStateChanged(services.auth, (nextUser) => {
      setUser(nextUser)
      setAuthKnown(true)
    })
  }, [services])

  const refreshUser = useCallback(async () => {
    if (!user) return false
    const verified = await refreshVerification(user)
    setUserVersion((v) => v + 1)
    return verified
  }, [user])

  // Perfil del usuario: se crea si no existe y se escucha para saber su hogar.
  // Solo con el email verificado: antes, las reglas no dejan tocar la nube.
  useEffect(() => {
    setProfile(null)
    setProfileLoaded(false)
    if (!services || !user || !emailVerified) return

    let cancelled = false
    let unsubscribe: (() => void) | null = null

    const start = async () => {
      // Las reglas leen la verificación del TOKEN de sesión, no del usuario. Un token emitido
      // antes de verificar (p. ej. verificado en otra pestaña o restaurado al recargar) aún
      // dice "no verificado" y Firestore lo rechazaría todo hasta que caducara (1 h): se renueva.
      try {
        const token = await user.getIdTokenResult()
        if (token.claims.email_verified !== true) await user.getIdToken(true)
      } catch (error) {
        console.error("Error refreshing session token:", error)
      }
      if (cancelled) return

      if (user.email) {
        ensureUserProfile(services.db, user.uid, user.email).catch((error) =>
          console.error("Error preparing user profile:", error),
        )
      }

      unsubscribe = subscribeUserProfile(
        services.db,
        user.uid,
        (nextProfile) => {
          setProfile(nextProfile)
          setProfileLoaded(true)
        },
        (error) => {
          // Sin perfil accesible, la app sigue en modo local.
          console.error("Error loading user profile:", error)
          setProfileLoaded(true)
        },
      )
    }
    void start()

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [services, user, emailVerified])

  return {
    enabled: services !== null,
    ready: authKnown && (!user || !emailVerified || profileLoaded),
    user,
    emailVerified,
    refreshUser,
    profile,
    householdId: emailVerified ? (profile?.householdId ?? null) : null,
    services,
  }
}
