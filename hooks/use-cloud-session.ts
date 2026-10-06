/**
 * @file hooks/use-cloud-session.ts
 * @description Estado de la sesión en la nube: usuario de Firebase Auth y su perfil
 *              (`users/{uid}`), que dice a qué hogar pertenece.
 *              Sin configuración de Firebase en la build, la sesión queda desactivada y la app
 *              funciona solo en local, como antes.
 */

"use client"

import { useEffect, useState } from "react"
import { onAuthStateChanged, type User } from "firebase/auth"
import { getFirebase, isCloudConfigured, type FirebaseServices } from "@/lib/cloud/firebase"
import { ensureUserProfile, subscribeUserProfile, type UserProfile } from "@/lib/cloud/repository"

/**
 * @interface CloudSession
 * @property {boolean} enabled - La build trae configuración de Firebase.
 * @property {boolean} ready - Ya se sabe si hay sesión y, si la hay, su perfil.
 * @property {User | null} user - Usuario con sesión iniciada.
 * @property {UserProfile | null} profile - Perfil del usuario.
 * @property {string | null} householdId - Hogar del usuario; `null` = modo local.
 * @property {FirebaseServices | null} services - Servicios de Firebase.
 */
export interface CloudSession {
  enabled: boolean
  ready: boolean
  user: User | null
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

  // Perfil del usuario: se crea si no existe y se escucha para saber su hogar.
  useEffect(() => {
    setProfile(null)
    setProfileLoaded(false)
    if (!services || !user) return

    if (user.email) {
      ensureUserProfile(services.db, user.uid, user.email).catch((error) =>
        console.error("Error preparing user profile:", error),
      )
    }

    return subscribeUserProfile(
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
  }, [services, user])

  return {
    enabled: services !== null,
    ready: authKnown && (!user || profileLoaded),
    user,
    profile,
    householdId: profile?.householdId ?? null,
    services,
  }
}
