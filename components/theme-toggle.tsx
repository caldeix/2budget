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
export function ThemeToggle({ className, label }: { className?: string; label?: string }) {
  // Obtiene el tema actual y la función para alternarlo del contexto.
  const { theme, toggleTheme } = useTheme()
  const Icon = theme === "dark" ? Moon : Sun

  return (
    <Button variant="outline" size="icon" onClick={toggleTheme} className={className} aria-label="Cambiar tema">
      {/* Sol en tema claro, luna en oscuro. */}
      <Icon className="h-[1.2rem] w-[1.2rem] shrink-0" />
      {/* Nombre que aparece al pasar el ratón en los botones flotantes (ver `FloatingActions`). */}
      {label && (
        <span aria-hidden className="hidden sm:group-hover:inline sm:group-focus-visible:inline whitespace-nowrap">
          {label}
        </span>
      )}
    </Button>
  )
}
