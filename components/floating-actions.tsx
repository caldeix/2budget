/**
 * @file components/floating-actions.tsx
 * @description Botones flotantes de la pantalla principal (3.1.1: separados de `app/page.tsx`).
 *              En móvil solo se ven "+" y el menú, que despliega el resto (así no tapan el
 *              contenido); en PC se ven todos, con "+" arriba.
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
    <div className="mb-8 fixed bottom-6 left-6 flex flex-col gap-3 z-50">
      <Button onClick={onAdd} variant="secondary" size="icon" className="shadow-lg order-2 sm:order-1" data-tour="fab-add">
        <Plus className="h-5 w-5" />
        <span className="sr-only">Nueva Transacción</span>
      </Button>

      <div className={cn("flex-col gap-3 order-1 sm:order-2 sm:flex", isMenuOpen ? "flex" : "hidden")}>
        <Button
          onClick={fromMenu(onCopy)}
          variant={copyDisabled ? "outline" : "destructive"}
          size="icon"
          className={`shadow-lg ${!copyDisabled ? "hover:bg-red-600" : "opacity-50 cursor-not-allowed"}`}
          disabled={copyDisabled}
          data-tour="fab-copy"
          title={copyTitle}
        >
          <Copy className="h-5 w-5" />
          <span className="sr-only">Copiar gastos fijos e ingresos</span>
        </Button>

        <div data-tour="fab-theme" className="flex">
          <ThemeToggle />
        </div>

        <Button onClick={fromMenu(onSettings)} variant="outline" size="icon" className="shadow-lg" data-tour="fab-settings">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Configuración</span>
        </Button>

        <Button onClick={fromMenu(onHelp)} variant="outline" size="icon" className="shadow-lg" data-tour="fab-info">
          <Info className="h-4 w-4" />
          <span className="sr-only">Documentación</span>
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
