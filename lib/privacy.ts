/**
 * @file lib/privacy.ts
 * @description Privacidad en pareja: cada persona puede ocultar a su pareja el importe de sus
 *              transacciones individuales (las que son 100% suyas). Solo se oculta en la interfaz
 *              (la lista, el aviso de gastos pagados y la copia de fijos): los totales, balances e
 *              informes no cambian, y los ajustes de cierre siempre se ven.
 *
 *              No es cifrado: los dos miembros comparten la clave del hogar, así que los datos
 *              siguen estando en el dispositivo de la pareja (por ejemplo, en una exportación).
 */

import type { AppConfig, Transaction } from "@/types"
import { isClosingAdjustment } from "@/lib/aggregations"
import { normalizePercentage } from "@/lib/money"

export type Person = "person1" | "person2"

/** Texto que sustituye a un importe oculto. */
export const HIDDEN_AMOUNT = "***"

/** La otra persona del hogar. */
export const partnerOf = (person: Person): Person => (person === "person1" ? "person2" : "person1")

/**
 * @function belongsOnlyTo
 * @description Indica si la transacción es 100% de esa persona (suya, o compartida con todo para ella).
 */
export function belongsOnlyTo(t: Transaction, person: Person): boolean {
  if (t.owner === person) return true
  if (t.owner !== "both") return false
  const share1 = normalizePercentage(t.person1Percentage ?? 50)
  return person === "person1" ? share1 === 100 : share1 === 0
}

/**
 * @function isHiddenFromViewer
 * @description Indica si quien mira (`viewer`, su rol en el hogar) no debe ver el importe de la
 *              transacción: es 100% de su pareja y su pareja ha activado la opción.
 *              Sin rol (modo local, sin hogar), nunca se oculta nada.
 */
export function isHiddenFromViewer(t: Transaction, viewer: Person | null, config: AppConfig): boolean {
  if (!viewer) return false
  const partner = partnerOf(viewer)
  if (!config.hideIndividualFromPartner?.[partner]) return false
  if (isClosingAdjustment(t)) return false
  return belongsOnlyTo(t, partner)
}
