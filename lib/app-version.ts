/**
 * @file lib/app-version.ts
 * @description Versión de la app y compatibilidad con los datos del hogar (3.1.0).
 *
 *              Una app antigua que siga abierta o en caché puede leer mal datos de una versión
 *              posterior (p. ej. antes de la 3.0.0 las aportaciones contaban como gastos) y guardar
 *              cálculos erróneos. Para evitarlo:
 *              - El hogar guarda `minAppVersion`: la versión más antigua que entiende sus datos. Cada
 *                app al día lo sube a `DATA_MIN_APP_VERSION` si hace falta, y una app más antigua que
 *                ese valor se bloquea con un aviso de actualizar (ver `UpdateRequired`).
 *              - Cada página publicada lleva su versión en `<meta name="app-version">`: al volver a
 *                la app se compara con la que está abierta y, si hay una nueva, se avisa (ver
 *                `UpdateNotice`).
 *              Al cambiar el formato de los datos en el futuro, se sube `DATA_MIN_APP_VERSION`.
 */

import pkg from "@/package.json"

/** Versión de esta build (la de `package.json`). */
export const APP_VERSION: string = pkg.version

/**
 * Versión más antigua de la app que entiende los datos actuales: la 3.0.0 trajo las aportaciones y la
 * 3.3.0 las metas de ahorro (una app anterior las perdería al exportar, importar o borrar los datos).
 */
export const DATA_MIN_APP_VERSION = "3.3.0"

/** Compara dos versiones `x.y.z`: negativo si `a` es anterior, 0 si son iguales, positivo si es posterior. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => Number.parseInt(n, 10) || 0)
  const pb = b.split(".").map((n) => Number.parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

/** Si la versión `a` es anterior a `b`. */
export const isOlderVersion = (a: string, b: string) => compareVersions(a, b) < 0
