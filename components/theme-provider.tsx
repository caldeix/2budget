/**
 * @file components/theme-provider.tsx
 * @description Este archivo define el `ThemeProvider` y el hook `useTheme`
 *              para gestionar el tema claro/oscuro de la aplicación.
 *              Utiliza el Context API de React para proporcionar el tema a todos los componentes
 *              y persiste la preferencia del usuario en `localStorage`.
 *              Es un Client Component (`"use client"`) ya que interactúa con el DOM y `localStorage`.
 */

"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

/**
 * @typedef {'light' | 'dark'} Theme
 * @description Tipo para representar el tema actual de la aplicación.
 */
type Theme = "light" | "dark"

/**
 * @interface ThemeContextValue
 * @description Define la estructura del valor proporcionado por el `ThemeContext`.
 * @property {Theme} theme - El tema actual ('light' o 'dark').
 * @property {() => void} toggleTheme - Función para alternar entre el tema claro y oscuro.
 */
interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

/**
 * @constant {React.Context<ThemeContextValue | undefined>} ThemeContext
 * @description Contexto de React para el tema. Se inicializa como `undefined`
 *              porque el valor real se proporcionará en el `ThemeProvider`.
 */
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

/**
 * @function ThemeProvider
 * @description Componente proveedor de tema. Envuelve a los componentes que necesitan
 *              acceso al tema. Gestiona el estado del tema y lo persiste en `localStorage`.
 * @param {object} props - Propiedades del componente.
 * @param {ReactNode} props.children - Los componentes hijos que tendrán acceso al contexto del tema.
 * @returns {JSX.Element} El proveedor de contexto que envuelve a los hijos.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  // Estado para almacenar el tema actual. Se inicializa en 'light' como valor por defecto.
  const [theme, setTheme] = useState<Theme>("light")

  /**
   * `useEffect` para inicializar el tema al montar el componente.
   * 1. Intenta cargar el tema guardado en `localStorage`.
   * 2. Si no hay tema guardado, detecta la preferencia de tema del sistema operativo.
   * 3. Aplica la clase 'dark' al elemento `<html>` si el tema es oscuro.
   */
  useEffect(() => {
    // Comprueba si `window` está definido para asegurar que estamos en el cliente.
    const stored = typeof window !== "undefined" ? localStorage.getItem("theme") : null
    if (stored === "light" || stored === "dark") {
      // Si hay un tema guardado, lo usa.
      setTheme(stored)
      document.documentElement.classList.toggle("dark", stored === "dark")
    } else {
      // Si no hay tema guardado, detecta la preferencia del sistema.
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      const initial = prefersDark ? "dark" : "light"
      setTheme(initial)
      document.documentElement.classList.toggle("dark", prefersDark)
    }
  }, []) // Array de dependencias vacío: este efecto se ejecuta solo una vez al montar.

  /**
   * @function toggleTheme
   * @description Función para alternar el tema entre 'light' y 'dark'.
   *              Actualiza el estado, la clase del elemento `<html>` y guarda la preferencia en `localStorage`.
   * @returns {void}
   */
  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark" // Determina el siguiente tema.
      document.documentElement.classList.toggle("dark", next === "dark") // Añade/quita la clase 'dark'.
      localStorage.setItem("theme", next) // Guarda la preferencia en localStorage.
      return next // Devuelve el nuevo tema para actualizar el estado.
    })
  }

  return (
    // `ThemeContext.Provider` hace que el `value` (objeto con `theme` y `toggleTheme`)
    // esté disponible para todos los componentes hijos que usen `useContext(ThemeContext)`.
    <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
  )
}

/**
 * @function useTheme
 * @description Hook personalizado para consumir el contexto del tema.
 *              Permite a cualquier componente hijo del `ThemeProvider` acceder al tema actual
 *              y a la función para alternarlo.
 * @returns {ThemeContextValue} Un objeto con el tema actual y la función `toggleTheme`.
 * @throws {Error} Si se usa fuera de un `ThemeProvider` (en un entorno de cliente completamente renderizado).
 *                  Incluye un fallback para SSR/renderizado parcial.
 */
export const useTheme = () => {
  const ctx = useContext(ThemeContext)

  // Si el contexto aún no está disponible (ej. durante el renderizado inicial en SSR o hidratación),
  // devolvemos un objeto con valores por defecto seguros para evitar errores.
  // Esto permite que los componentes que usan `useTheme` no fallen si se renderizan antes que el `ThemeProvider`
  // o si el `ThemeProvider` aún no ha hidratado completamente.
  if (!ctx) {
    // Detecta la preferencia del sistema como fallback para el tema inicial.
    const prefersDark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
    const fallbackTheme: Theme = prefersDark ? "dark" : "light"
    return {
      theme: fallbackTheme,
      // La función `toggleTheme` no hará nada hasta que el `ThemeProvider` esté completamente montado.
      toggleTheme: () => {},
    } as ThemeContextValue // Se usa `as` para asegurar el tipo.
  }

  return ctx // Devuelve el contexto real una vez que está disponible.
}
