/**
 * @file lib/cloud/master-check.ts
 * @description Cuándo toca la comprobación mensual de la contraseña maestra.
 *              Como la clave del hogar queda guardada en cada dispositivo, la contraseña maestra
 *              casi nunca se escribe y es fácil olvidarla; sin ella (ni el código de recuperación)
 *              los datos son irrecuperables. Una vez al mes se pide para que no se olvide.
 *
 *              Cualquier momento en que se escribe correctamente (desbloquear, invitar, cambiarla,
 *              generar el código de recuperación...) cuenta como comprobación.
 */

/** Días entre comprobaciones. */
export const MASTER_CHECK_INTERVAL_DAYS = 30

/** Cuánto se pospone al pulsar "Recordármelo mañana". */
export const MASTER_CHECK_SNOOZE_HOURS = 24

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * @interface MasterCheckState
 * @description Campos del perfil (`users/{uid}`) que guardan el estado de la comprobación.
 */
export interface MasterCheckState {
  /** Última vez que se escribió correctamente la contraseña maestra (ISO). */
  lastMasterCheckAt?: string | null
  /** Hasta cuándo se ha pospuesto la comprobación (ISO). */
  masterCheckSnoozedUntil?: string | null
}

/**
 * @function isMasterCheckDue
 * @description Indica si hay que pedir la contraseña maestra.
 *              Sin fecha registrada no se pide: se registra la de ese momento y se cuenta desde ahí.
 * @param {MasterCheckState} state - Estado guardado en el perfil.
 * @param {Date} now - Momento actual.
 * @returns {boolean}
 */
export function isMasterCheckDue(state: MasterCheckState, now: Date): boolean {
  if (!state.lastMasterCheckAt) return false
  const last = Date.parse(state.lastMasterCheckAt)
  if (Number.isNaN(last)) return true
  if (now.getTime() - last < MASTER_CHECK_INTERVAL_DAYS * DAY_MS) return false

  const snoozedUntil = state.masterCheckSnoozedUntil ? Date.parse(state.masterCheckSnoozedUntil) : NaN
  return Number.isNaN(snoozedUntil) || now.getTime() >= snoozedUntil
}

/**
 * @function snoozeUntil
 * @description Fecha hasta la que se pospone la comprobación.
 */
export function snoozeUntil(now: Date): Date {
  return new Date(now.getTime() + MASTER_CHECK_SNOOZE_HOURS * 60 * 60 * 1000)
}
