/**
 * @file components/ui/modal.tsx
 * @description Este archivo define el componente `Modal`, una ventana emergente reutilizable
 *              que se superpone al contenido principal de la aplicación.
 *              Es un Client Component (`"use client"`) porque gestiona su propia visibilidad
 *              y efectos secundarios (como el bloqueo del scroll del cuerpo).
 */

"use client"

import type React from "react"

import { useEffect } from "react"
import { X } from "lucide-react" // Icono de cierre.
import { cn } from "@/lib/utils" // Utilidad para combinar clases de Tailwind CSS.

/**
 * @interface ModalProps
 * @description Define las propiedades que acepta el componente `Modal`.
 * @property {boolean} isOpen - Booleano que controla si el modal está abierto o cerrado.
 * @property {() => void} onClose - Función de callback que se ejecuta cuando el modal debe cerrarse
 *                                  (ej. al hacer clic en el botón de cerrar o en el fondo).
 * @property {string} title - El título que se mostrará en la cabecera del modal.
 * @property {React.ReactNode} children - El contenido que se renderizará dentro del cuerpo del modal.
 * @property {'sm' | 'md' | 'lg' | 'xl'} [size='md'] - Tamaño predefinido del modal.
 *                                                    'sm' (pequeño), 'md' (mediano), 'lg' (grande), 'xl' (extra grande).
 */
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: "sm" | "md" | "lg" | "xl"
}

/**
 * @function Modal
 * @description Componente React que renderiza un modal (ventana emergente).
 *              Controla el scroll del cuerpo y permite cerrar el modal con la tecla 'Escape'.
 * @param {ModalProps} props - Propiedades del componente.
 * @returns {JSX.Element | null} El componente modal si `isOpen` es `true`, de lo contrario `null`.
 */
export function Modal({ isOpen, onClose, title, children, size = "md" }: ModalProps) {
  /**
   * `useEffect` para controlar el scroll del cuerpo de la página.
   * Cuando el modal está abierto (`isOpen` es `true`), el scroll del `body` se oculta (`overflow = "hidden"`).
   * Cuando el modal se cierra, el scroll se restaura (`overflow = "unset"`).
   * La función de retorno (`return () => ...`) es una función de limpieza que se ejecuta
   * cuando el componente se desmonta o antes de que el efecto se vuelva a ejecutar.
   */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden" // Evita el scroll del fondo cuando el modal está abierto.
    } else {
      document.body.style.overflow = "unset" // Restaura el scroll cuando el modal está cerrado.
    }

    // Función de limpieza: asegura que el scroll se restaure si el componente se desmonta.
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen]) // Dependencia: el efecto se ejecuta cada vez que `isOpen` cambia.

  /**
   * `useEffect` para manejar el cierre del modal con la tecla 'Escape'.
   * Añade un event listener al documento cuando el modal está abierto.
   * Elimina el event listener cuando el modal se cierra o el componente se desmonta.
   */
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose() // Llama a la función `onClose` si se presiona 'Escape'.
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape) // Añade el listener.
    }

    // Función de limpieza: elimina el event listener para evitar fugas de memoria.
    return () => {
      document.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen, onClose]) // Dependencias: se ejecuta cuando `isOpen` o `onClose` cambian.

  // Si el modal no está abierto, no renderiza nada.
  if (!isOpen) return null

  /**
   * Objeto que mapea los tamaños (`sm`, `md`, `lg`, `xl`) a las clases de Tailwind CSS
   * que controlan el ancho máximo del modal.
   */
  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  }

  return (
    // Contenedor principal del modal: fija la posición y centra el contenido.
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Fondo oscuro semitransparente que cierra el modal al hacer clic. */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      {/* Contenedor del contenido del modal. */}
      <div
        className={cn(
          "relative bg-card rounded-2xl shadow-lg w-full mx-4 max-h-[90vh] overflow-hidden",
          sizeClasses[size], // Aplica la clase de tamaño dinámicamente.
        )}
      >
        {/* Cabecera del modal: título y botón de cierre. */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          <button
            onClick={onClose} // Cierra el modal al hacer clic.
            className="p-2 hover:bg-muted rounded-full transition-colors"
            aria-label="Cerrar modal" // Etiqueta para accesibilidad.
          >
            <X className="w-5 h-5" /> {/* Icono de cierre. */}
          </button>
        </div>
        {/* Cuerpo del modal: donde se renderiza el `children`.
            Permite scroll interno si el contenido es demasiado largo. */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">{children}</div>
      </div>
    </div>
  )
}
