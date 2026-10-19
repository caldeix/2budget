/**
 * @file app/manifest.ts
 * @description Manifiesto de la app web: lo que Android (y los navegadores de escritorio) piden
 *              para ofrecer "Instalar app" en vez de un simple acceso directo. Next.js lo publica
 *              como `manifest.webmanifest` y añade su enlace en el `<head>`.
 *
 *              Las rutas llevan la base de GitHub Pages (`/2budget`) a mano: el manifiesto no la
 *              añade solo. En desarrollo no hay base (ver `next.config.mjs`).
 */

import type { MetadataRoute } from "next"

// Exportación estática: el manifiesto se genera en la build.
export const dynamic = "force-static"

const base = process.env.NODE_ENV === "production" ? "/2budget" : ""

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: `${base}/`,
    name: "2Budget, finanzas en pareja",
    short_name: "2Budget",
    description: "Finanzas en pareja o en solitario: gastos, ingresos, informes mensuales y datos cifrados en la nube.",
    lang: "es",
    start_url: `${base}/`,
    scope: `${base}/`,
    display: "standalone",
    // Colores del tema oscuro (el de por defecto): fondo de la app y de la cabecera.
    background_color: "#0a0b10",
    theme_color: "#17182c",
    icons: [
      { src: `${base}/icons/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${base}/icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      // Versión con margen: Android la recorta en círculo (u otra forma) sin cortar el logo.
      { src: `${base}/icons/icon-maskable-192.png`, sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: `${base}/icons/icon-maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Acceso rápido (3.11.0): al mantener pulsado el icono de la app instalada (Android) o con clic
    // derecho (Chrome y Edge en el ordenador), «Nueva transacción» abre directamente el formulario.
    shortcuts: [
      {
        name: "Nueva transacción",
        short_name: "Nueva",
        description: "Apuntar un gasto o un ingreso",
        url: `${base}/?accion=nueva`,
        icons: [{ src: `${base}/icons/icon-192.png`, sizes: "192x192", type: "image/png" }],
      },
    ],
  }
}
