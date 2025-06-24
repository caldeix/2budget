import type React from "react" // Importa el tipo React para tipado.
import type { Metadata } from "next" // Importa el tipo Metadata de Next.js para SEO.
import { Inter, Poppins } from "next/font/google" // Importa fuentes de Google Fonts.
import "./globals.css" // Importa los estilos CSS globales.
import { ThemeProvider } from "@/components/theme-provider" // Importa el componente ThemeProvider.
import { Footer } from "@/components/footer" // Importa el nuevo componente Footer.

/**
 * @constant {Inter} inter
 * @description Configuración de la fuente Inter de Google Fonts.
 *              Se utiliza como fuente principal para el cuerpo del texto.
 * @property {string[]} subsets - Subconjuntos de caracteres a cargar.
 * @property {string} variable - Nombre de la variable CSS para la fuente.
 */
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

/**
 * @constant {Poppins} poppins
 * @description Configuración de la fuente Poppins de Google Fonts.
 *              Se utiliza para títulos y elementos destacados.
 * @property {string[]} subsets - Subconjuntos de caracteres a cargar.
 * @property {string[]} weight - Pesos de fuente a cargar.
 * @property {string} variable - Nombre de la variable CSS para la fuente.
 */
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-poppins",
})

/**
 * @constant {Metadata} metadata
 * @description Metadatos de la aplicación para SEO y configuración de la pestaña del navegador.
 *              Next.js utiliza esto para generar las etiquetas <head>.
 * @property {string} title - Título de la aplicación.
 * @property {string} description - Descripción de la aplicación.
 */
export const metadata: Metadata = {
  title: "Gestor Financiero para Parejas",
  description: "Aplicación completa para gestionar las finanzas de pareja con informes mensuales y análisis detallados",
  generator: 'Caldeix',

}

/**
 * @function RootLayout
 * @description Componente de layout raíz. Envuelve toda la aplicación.
 *              Es un Server Component, lo que significa que se renderiza en el servidor.
 * @param {object} props - Propiedades del componente.
 * @param {React.ReactNode} props.children - Contenido de las páginas anidadas.
 * @returns {JSX.Element} La estructura HTML básica de la aplicación.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode // `children` representa el contenido de las páginas anidadas (ej. `app/page.tsx`).
}) {
  return (
    // La etiqueta <html> es el elemento raíz de cualquier documento HTML.
    // `lang="es"` indica el idioma principal del contenido.
    // `suppressHydrationWarning` se usa aquí para evitar una advertencia de hidratación
    // relacionada con la inicialización del tema en el cliente, ya que el servidor
    // no sabe la preferencia de tema del usuario.
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" type="image/ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png" />
      </head>
      {/* El <body> contiene todo el contenido visible de la página. */}
      {/* Se aplican las variables CSS de las fuentes para que Tailwind CSS pueda usarlas. */}
      <body className={`${inter.variable} ${poppins.variable}`}>
        {/* ThemeProvider envuelve toda la aplicación para proporcionar el contexto del tema
            (claro/oscuro) a todos los componentes que lo necesiten.
            `attribute="class"`: el tema se aplica como una clase CSS ('dark') al elemento <html>.
            `defaultTheme="light"`: tema por defecto si no hay preferencia guardada.
            `enableSystem`: permite detectar la preferencia de tema del sistema operativo. */}
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children} {/* Aquí se renderiza el contenido de la página actual. */}
          <Footer /> {/* Se añade el componente Footer al final del body. */}
        </ThemeProvider>
      </body>
    </html>
  )
}
