/**
 * @file lib/theme-colors.ts
 * @description Color de la barra del sistema en cada tema (3.1.1): el de la cabecera de la app
 *              (`--card`). Antes era oscuro también en el tema claro.
 */

export const THEME_COLORS = {
  light: "#ffffff",
  dark: "#17182c",
} as const

/** Pone el color de la barra del tema elegido (todas las `<meta name="theme-color">`). */
export function applyThemeColor(dark: boolean): void {
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((meta) => meta.setAttribute("content", dark ? THEME_COLORS.dark : THEME_COLORS.light))
}
