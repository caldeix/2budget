/**
 * @file lib/cloud/firebase.ts
 * @description Inicialización perezosa de Firebase (Auth + Firestore) en el navegador.
 *              La configuración llega por variables `NEXT_PUBLIC_FIREBASE_*` (ver `.env.example`):
 *              son públicas por diseño, la seguridad está en `firestore.rules`.
 *              Si faltan, `getFirebase()` devuelve `null` y la app funciona solo en local.
 */

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app"
import {
  browserLocalPersistence,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
  type Auth,
} from "firebase/auth"
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore"

// Next.js sustituye cada `process.env.NEXT_PUBLIC_*` en la build: hay que nombrarlas una a una.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
}

/** `true` si la build trae la configuración de Firebase; si no, la app es solo local. */
export const isCloudConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)

export interface FirebaseServices {
  app: FirebaseApp
  auth: Auth
  db: Firestore
}

let services: FirebaseServices | null = null

/**
 * @function getFirebase
 * @description Devuelve los servicios de Firebase, inicializándolos la primera vez.
 *              - Auth usa `initializeAuth` con IndexedDB: `getAuth` se cuelga dentro del
 *                navegador de iOS empaquetado con Capacitor (fase 3).
 *              - Firestore usa caché persistente en IndexedDB: funciona sin conexión y las
 *                escrituras se ven al instante (se sincronizan al volver la red).
 *              Tolera la recarga en caliente de desarrollo, que vuelve a evaluar el módulo.
 * @returns {FirebaseServices | null} Los servicios, o `null` en el servidor o sin configuración.
 */
export function getFirebase(): FirebaseServices | null {
  if (!isCloudConfigured || typeof window === "undefined") return null
  if (services) return services

  const alreadyInitialized = getApps().length > 0
  const app = alreadyInitialized ? getApp() : initializeApp(firebaseConfig)

  const auth = alreadyInitialized
    ? getAuth(app)
    : initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] })
  // Los emails de Firebase (restablecer contraseña, cambio de email) salen en español.
  auth.languageCode = "es"

  const db = alreadyInitialized
    ? getFirestore(app)
    : initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
        // Los campos opcionales sin valor (`undefined`) se omiten en vez de dar error.
        ignoreUndefinedProperties: true,
      })

  services = { app, auth, db }
  return services
}
