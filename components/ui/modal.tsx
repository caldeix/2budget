/**
 * @file components/ui/modal.tsx
 * @description Este archivo define el componente `Modal`, una ventana emergente reutilizable
 *              que se superpone al contenido principal de la aplicación.
 *              Desde la 3.1.1 se monta sobre el Dialog de Radix: es un diálogo accesible
 *              (`role="dialog"`, `aria-modal`, título enlazado), lleva el foco dentro, no deja que
 *              salga con el tabulador y lo devuelve al cerrar. Con dos modales abiertos, Escape
 *              cierra solo el de encima. También bloquea el scroll del fondo.
 */

"use client"

import type React from "react"

import { useRef } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
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
  /** Centra el título en la cabecera (por defecto, alineado a la izquierda). */
  centerTitle?: boolean
  /** Si es `false`, el modal no se puede cerrar con Escape, clic en el fondo ni botón X (modal forzado). Por defecto `true`. */
  dismissible?: boolean
}

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

/**
 * Elementos fijos de la app que se pueden pulsar con un modal abierto sin cerrarlo (p. ej. el aviso
 * breve de abajo, que sale encima de Configuración al importar).
 */
const KEEP_MODAL_SELECTOR = "[data-keep-modal]"

/**
 * @function Modal
 * @description Componente React que renderiza un modal (ventana emergente).
 * @param {ModalProps} props - Propiedades del componente.
 * @returns {JSX.Element} El componente modal.
 */
export function Modal({ isOpen, onClose, title, children, size = "md", dismissible = true, centerTitle = false }: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  // Al abrir, el foco va al diálogo y no a su primer campo: en el móvil, enfocar un campo saca el
  // teclado sin que se haya pedido.
  const handleOpenAutoFocus = (event: Event) => {
    event.preventDefault()
    contentRef.current?.focus()
  }

  // Pulsar fuera cierra el modal, salvo que sea forzado o que se pulse un aviso de la app.
  const handleInteractOutside = (event: Event) => {
    const target = event.target as Element | null
    if (!dismissible || target?.closest?.(KEEP_MODAL_SELECTOR)) event.preventDefault()
  }

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        {/* Fondo oscuro semitransparente; centra el contenido. */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          {/* Contenedor del contenido del modal. */}
          <DialogPrimitive.Content
            ref={contentRef}
            aria-modal="true"
            aria-describedby={undefined}
            onOpenAutoFocus={handleOpenAutoFocus}
            onEscapeKeyDown={(event) => !dismissible && event.preventDefault()}
            onInteractOutside={handleInteractOutside}
            className={cn(
              "relative bg-card rounded-2xl shadow-lg w-full mx-4 max-h-[90vh] overflow-hidden focus:outline-none",
              sizeClasses[size], // Aplica la clase de tamaño dinámicamente.
            )}
          >
            {/* Cabecera del modal: título y botón de cierre. */}
            <div className="flex items-center justify-between p-6 border-b">
              {/* Hueco del ancho del botón de cerrar: así el título queda centrado de verdad. */}
              {centerTitle && dismissible && <span aria-hidden className="w-9 shrink-0" />}
              <DialogPrimitive.Title
                className={cn("text-xl font-semibold text-foreground", centerTitle && "flex-1 text-center")}
              >
                {title}
              </DialogPrimitive.Title>
              {dismissible && (
                <DialogPrimitive.Close
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                  aria-label="Cerrar" // Etiqueta para accesibilidad.
                >
                  <X className="w-5 h-5" /> {/* Icono de cierre. */}
                </DialogPrimitive.Close>
              )}
            </div>
            {/* Cuerpo del modal: donde se renderiza el `children`.
                Permite scroll interno si el contenido es demasiado largo. */}
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">{children}</div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
