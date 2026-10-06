/**
 * @file hooks/use-vault.ts
 * @description Desbloqueo del hogar cifrado en este dispositivo.
 *              - Si el dispositivo ya guarda la clave del hogar (IndexedDB), queda desbloqueado solo.
 *              - Si no (dispositivo nuevo, tras cerrar sesión), hay que escribir la contraseña maestra.
 */

"use client"

import { useCallback, useEffect, useState } from "react"
import type { CloudSession } from "@/hooks/use-cloud-session"
import { loadCachedDek } from "@/lib/cloud/vault-cache"
import { recoverWithCode, unlockHousehold } from "@/lib/cloud/repository"

/**
 * @typedef {"none" | "checking" | "locked" | "unlocked"} VaultStatus
 * - none: no hay hogar en la nube (modo local).
 * - checking: buscando la clave en este dispositivo.
 * - locked: hace falta la contraseña maestra.
 * - unlocked: la clave está lista para cifrar y descifrar.
 */
export type VaultStatus = "none" | "checking" | "locked" | "unlocked"

export interface Vault {
  status: VaultStatus
  dek: CryptoKey | null
  /** Desbloquea con la contraseña maestra; lanza `WrongPasswordError` si no es la correcta. */
  unlock: (masterPassword: string) => Promise<void>
  /**
   * Elige una contraseña maestra nueva con el código de recuperación y desbloquea.
   * Devuelve el código de recuperación nuevo (el usado queda gastado).
   */
  recover: (recoveryCode: string, newMasterPassword: string) => Promise<string>
}

export function useVault(session: CloudSession): Vault {
  const uid = session.user?.uid ?? null
  const householdId = session.householdId
  const db = session.services?.db ?? null
  const key = uid && householdId ? `${uid}:${householdId}` : null

  // La clave va asociada al usuario y hogar para los que se obtuvo: si cambian, no se reutiliza.
  const [state, setState] = useState<{ key: string | null; status: VaultStatus; dek: CryptoKey | null }>({
    key: null,
    status: "none",
    dek: null,
  })

  useEffect(() => {
    if (!key || !uid || !householdId) {
      setState({ key: null, status: "none", dek: null })
      return
    }
    let cancelled = false
    setState({ key, status: "checking", dek: null })
    loadCachedDek(uid, householdId).then((dek) => {
      if (!cancelled) setState({ key, status: dek ? "unlocked" : "locked", dek })
    })
    return () => {
      cancelled = true
    }
  }, [key, uid, householdId])

  const unlock = useCallback(
    async (masterPassword: string) => {
      if (!db || !uid || !householdId || !key) return
      const dek = await unlockHousehold(db, householdId, uid, masterPassword)
      setState({ key, status: "unlocked", dek })
    },
    [db, uid, householdId, key],
  )

  const recover = useCallback(
    async (recoveryCode: string, newMasterPassword: string) => {
      if (!db || !uid || !householdId || !key) throw new Error("No hay ningún hogar que desbloquear.")
      const result = await recoverWithCode(db, householdId, uid, recoveryCode, newMasterPassword)
      setState({ key, status: "unlocked", dek: result.dek })
      return result.recoveryCode
    },
    [db, uid, householdId, key],
  )

  // Mientras el efecto aún no ha corrido para la clave actual, se considera "comprobando".
  const current = state.key === key ? state : { key, status: key ? ("checking" as const) : ("none" as const), dek: null }
  return { status: current.status, dek: current.dek, unlock, recover }
}
