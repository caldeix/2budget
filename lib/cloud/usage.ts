/**
 * @file lib/cloud/usage.ts
 * @description Registro de uso de la app por usuario, para saber quién la usa de verdad.
 *              El "último inicio de sesión" de Firebase Auth no sirve para eso: la sesión se
 *              mantiene abierta y no cambia al abrir la app. Se guarda en el perfil (`users/{uid}`):
 *              - `lastSeenAt`: fecha de la última visita.
 *              - `visitDays`: número de días distintos en que se ha abierto la app.
 *              Como mucho se escribe una vez al día por usuario, para no gastar cuota.
 */

import { toLocalDateString } from "@/lib/utils"

/**
 * @interface UsageState
 * @description Campos del perfil con el registro de uso.
 */
export interface UsageState {
  lastSeenAt?: string | null
  visitDays?: number
}

/**
 * @function shouldRecordVisit
 * @description Indica si hay que registrar la visita: la primera vez, o si la última fue otro día
 *              (en la hora local del dispositivo).
 * @param {string | null | undefined} lastSeenAt - Última visita registrada (ISO).
 * @param {Date} now - Momento actual.
 * @returns {boolean}
 */
export function shouldRecordVisit(lastSeenAt: string | null | undefined, now: Date): boolean {
  if (!lastSeenAt) return true
  const last = new Date(lastSeenAt)
  if (Number.isNaN(last.getTime())) return true
  return toLocalDateString(last) !== toLocalDateString(now)
}
