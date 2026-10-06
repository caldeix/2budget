import type React from "react"
import type { Metadata } from "next"
import { Inter, Poppins } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Footer } from "@/components/footer"

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
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  )
}
