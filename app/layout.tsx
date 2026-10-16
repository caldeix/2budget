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

/**
 * Content-Security-Policy (3.0.3). GitHub Pages no deja poner cabeceras, así que va por `<meta>`.
 * Limita de dónde se cargan scripts, marcos e imágenes y, sobre todo, A DÓNDE se pueden enviar datos
 * (`connect-src`): aunque un script ajeno llegara a ejecutarse, no podría mandar los datos descifrados
 * a otro sitio. Firebase (Auth, Firestore, App Check) va por *.googleapis.com y reCAPTCHA Enterprise por
 * google.com y gstatic.com. Next exporta scripts y estilos en línea, de ahí 'unsafe-inline'.
 * Solo en producción: el modo desarrollo de Next necesita `eval`.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.google.com https://www.gstatic.com https://apis.google.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://www.google.com https://www.gstatic.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://www.google.com https://www.gstatic.com",
  "frame-src https://www.google.com https://recaptcha.google.com https://*.firebaseapp.com",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ")

/** Script de tema que se ejecuta antes de pintar la página (ver el `<head>`). */
const THEME_SCRIPT =
  "(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}})()"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {process.env.NODE_ENV === "production" && (
          <meta httpEquiv="Content-Security-Policy" content={CONTENT_SECURITY_POLICY} />
        )}
        {/* Pone el tema antes de pintar (la preferencia guardada o la del sistema): sin esto, quien usa
            el tema oscuro veía un destello claro al abrir. Mismo criterio que `ThemeProvider`. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
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
