/**
 * @file lib/device.ts
 * @description Detección del dispositivo para los avisos de instalar la app (3.2.0: separado de
 *              `components/local-storage-notice.tsx`).
 */

/** iPhone o iPad (los iPad recientes se presentan como Mac con pantalla táctil). */
export function isAppleMobile(): boolean {
  const ua = navigator.userAgent
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1)
}

/** La web está abierta como app instalada (pantalla de inicio). */
export function isInstalled(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  )
}
