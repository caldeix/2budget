/**
 * @file components/theme-toggle.tsx
 * @description Este archivo define el componente `ThemeToggle`, un botón que permite
 *              al usuario alternar entre el tema claro y oscuro de la aplicación.
 *              Es un Client Component (`"use client"`) porque utiliza el hook `useTheme`.
 */

"use client"

import { Button } from "@/components/ui/button" // Componente de botón de Shadcn UI.
import { Moon, Sun } from "lucide-react" // Iconos de luna y sol de Lucide React.
import { useTheme } from "@/components/theme-provider" // Hook personalizado para acceder al tema.

/**
 * @function ThemeToggle
 * @description Componente de botón para alternar el tema claro/oscuro.
 *              Muestra un icono de sol o luna dependiendo del tema actual.
 * @returns {JSX.Element} El botón de alternancia de tema.
 */
export function ThemeToggle() {
  // Obtiene el tema actual y la función para alternarlo del contexto.
  const { theme, toggleTheme } = useTheme()

  return (
    <Button variant="outline" size="icon" onClick={toggleTheme}>
      {/* Icono de sol: visible en tema claro, oculto y rotado en tema oscuro. */}
      <Sun className={`h-[1.2rem] w-[1.2rem] transition-all ${theme === "dark" ? "-rotate-90 scale-0" : ""}`} />
      {/* Icono de luna: visible en tema oscuro, oculto y rotado en tema claro. */}
      <Moon
        className={`absolute h-[1.2rem] w-[1.2rem] transition-all ${theme === "dark" ? "" : "rotate-90 scale-0"}`}
      />
      {/* Texto para lectores de pantalla, mejora la accesibilidad. */}
      <span className="sr-only">Cambiar tema</span>
    </Button>
  )
}
