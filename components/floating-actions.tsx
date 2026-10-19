/**
 * @file components/floating-actions.tsx
 * @description Botones flotantes de la pantalla principal (3.1.1: separados de `app/page.tsx`).
 *              En móvil solo se ven "+" y el menú, que despliega el resto (así no tapan el
 *              contenido); en PC se ven todos, con "+" arriba, y al pasar el ratón (o con el foco del
 *              teclado) cada uno se alarga y enseña su nombre al lado del icono (3.8.0).
 */

"use client"

import { useEffect, useState } from "react"
import { Plus, Settings, Info, Copy, MoreVertical, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"

interface FloatingActionsProps {
  onAdd: () => void
  onCopy: () => void
  /** Copiar no se puede (ya está todo copiado, o es un mes futuro sin cerrar el anterior). */
  copyDisabled: boolean
  /** Explicación del botón de copiar (por qué no se puede, o qué copia). */
  copyTitle: string
  onSettings: () => void
  onHelp: () => void
  /** Al empezar el tour, el menú del móvil se cierra (el tour parte siempre del mismo estado). */
  isTourActive: boolean
}

/** Botón redondo que en PC, al pasar el ratón o con el foco, se alarga con su nombre. */
const FAB = "group shadow-lg w-10 justify-start px-3 sm:hover:w-auto sm:hover:px-4 sm:focus-visible:w-auto sm:focus-visible:px-4"

/** Nombre del botón, visible solo al alargarse (para los lectores de pantalla va en `aria-label`). */
function FabLabel({ children }: { children: string }) {
  return (
    <span aria-hidden className="hidden sm:group-hover:inline sm:group-focus-visible:inline whitespace-nowrap">
      {children}
    </span>
  )
}

export function FloatingActions({ onAdd, onCopy, copyDisabled, copyTitle, onSettings, onHelp, isTourActive }: FloatingActionsProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  useEffect(() => {
    if (isTourActive) setIsMenuOpen(false)
  }, [isTourActive])
  // Cada acción del menú lo cierra (en móvil).
  const fromMenu = (action: () => void) => () => {
    setIsMenuOpen(false)
    action()
  }

  return (
    <div className="mb-8 fixed bottom-6 left-6 flex flex-col items-start gap-3 z-50">
      <Button onClick={onAdd} variant="secondary" size="icon" className={cn(FAB, "order-2 sm:order-1")} data-tour="fab-add" aria-label="Nueva transacción">
        <Plus className="h-5 w-5 shrink-0" />
        <FabLabel>Nueva transacción</FabLabel>
      </Button>

      <div className={cn("flex-col items-start gap-3 order-1 sm:order-2 sm:flex", isMenuOpen ? "flex" : "hidden")}>
        <Button
          onClick={fromMenu(onCopy)}
          variant={copyDisabled ? "outline" : "destructive"}
          size="icon"
          className={cn(FAB, !copyDisabled ? "hover:bg-red-600" : "opacity-50 cursor-not-allowed")}
          disabled={copyDisabled}
          data-tour="fab-copy"
          title={copyTitle}
          aria-label={copyTitle}
        >
          <Copy className="h-5 w-5 shrink-0" />
          <FabLabel>Copiar del mes anterior</FabLabel>
        </Button>

        <div data-tour="fab-theme" className="flex">
          <ThemeToggle className={FAB} label="Cambiar tema" />
        </div>

        <Button onClick={fromMenu(onSettings)} variant="outline" size="icon" className={FAB} data-tour="fab-settings" aria-label="Configuración">
          <Settings className="h-4 w-4 shrink-0" />
          <FabLabel>Configuración</FabLabel>
        </Button>

        <Button onClick={fromMenu(onHelp)} variant="outline" size="icon" className={FAB} data-tour="fab-info" aria-label="Ayuda">
          <Info className="h-4 w-4 shrink-0" />
          <FabLabel>Ayuda</FabLabel>
        </Button>
      </div>

      <Button
        onClick={() => setIsMenuOpen((open) => !open)}
        variant="outline"
        size="icon"
        className="shadow-lg order-3 sm:hidden"
        aria-expanded={isMenuOpen}
        data-tour="fab-menu"
      >
        {isMenuOpen ? <X className="h-4 w-4" /> : <MoreVertical className="h-4 w-4" />}
        <span className="sr-only">{isMenuOpen ? "Cerrar menú" : "Más opciones"}</span>
      </Button>
    </div>
  )
}
