import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Poppins } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Footer } from "@/components/footer"
import { ServiceWorkerRegister } from "@/components/service-worker-register"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-poppins",
})

export const metadata: Metadata = {
  title: "2Budget, gestor financiero",
  description: "Aplicación para gestionar las finanzas en pareja o en solitario, con informes mensuales y análisis detallados",
  generator: "Caldeix",
  applicationName: "2Budget",
  // iPhone: al añadirla a la pantalla de inicio desde Safari, se abre a pantalla completa.
  appleWebApp: { capable: true, title: "2Budget", statusBarStyle: "black" },
}

// Color de la barra del sistema con la app instalada (el de la cabecera en el tema oscuro).
export const viewport: Viewport = {
  themeColor: "#17182c",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      {/* Los iconos (favicon.ico, icon1.png, icon2.png y apple-icon.png) están en app/: Next.js
          genera sus enlaces con la ruta base /2budget. Puestos aquí a mano daban 404 en producción. */}
      <body className={`${inter.variable} ${poppins.variable}`}>
        {/* El tema lo decide `ThemeProvider` (preferencia guardada o la del sistema). */}
        <ThemeProvider>
          {children}
          <Footer />
          <ServiceWorkerRegister />
        </ThemeProvider>
      </body>
    </html>
  )
}
