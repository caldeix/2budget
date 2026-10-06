/**
 * @file components/cloud-status.tsx
 * @description Botón de la cuenta en la cabecera (nube verde = sincronizado, nube tachada =
 *              solo en este dispositivo) y, con sesión pero sin datos en la nube, un aviso
 *              amarillo que explica por qué y lleva a resolverlo.
 *              El aviso se abre al pasar el ratón (ordenador) o al tocarlo (móvil y tablet). El
 *              hover solo cuenta con ratón real: en táctil, el toque también genera eventos de
 *              puntero y abriría y cerraría el aviso a la vez.
 *              Es un Client Component (`"use client"`) debido al uso de estados y eventos.
 */

"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { CloudSession } from "@/hooks/use-cloud-session"
import { AlertTriangle, Cloud, CloudOff } from "lucide-react"

interface CloudStatusProps {
  session: CloudSession
  singleMode?: boolean
  onOpenAccount: () => void
}

export function CloudStatus({ session, singleMode, onOpenAccount }: CloudStatusProps) {
  const [isWarningOpen, setIsWarningOpen] = useState(false)
  // Al pasar del icono al mensaje hay un hueco: el cierre por hover espera un instante.
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const openOnHover = (pointerType: string) => {
    if (pointerType !== "mouse") return
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setIsWarningOpen(true)
  }
  const closeOnHover = (pointerType: string) => {
    if (pointerType !== "mouse") return
    closeTimer.current = setTimeout(() => setIsWarningOpen(false), 150)
  }
  const { user, emailVerified, householdId } = session

  // Sin sesión no se avisa: usar la app solo en local es una opción válida.
  const warning = !user
    ? null
    : !emailVerified
      ? {
          text: "Tus datos solo están en este dispositivo. Verifica tu email para poder guardarlos en la nube.",
          action: "Verificar email",
        }
      : !householdId
        ? {
            text: singleMode
              ? "Tus datos solo están en este dispositivo. Crea tu espacio en la nube para tenerlos a salvo y usarlos desde cualquier dispositivo."
              : "Tus datos solo están en este dispositivo. Crea tu hogar en la nube (o únete al de tu pareja) para tenerlos a salvo y compartirlos.",
            action: singleMode ? "Crear mi espacio" : "Crear o unirme a un hogar",
          }
        : null

  return (
    <div className="absolute right-0 flex items-center gap-1">
      {warning && (
        <Popover open={isWarningOpen} onOpenChange={setIsWarningOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Tus datos no están en la nube"
              className="p-2 rounded-md text-amber-500 hover:bg-amber-500/10"
              onPointerEnter={(e) => openOnHover(e.pointerType)}
              onPointerLeave={(e) => closeOnHover(e.pointerType)}
            >
              <AlertTriangle className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="fade-in-place w-72 space-y-3"
            onPointerEnter={(e) => openOnHover(e.pointerType)}
            onPointerLeave={(e) => closeOnHover(e.pointerType)}
          >
            <p className="text-sm text-foreground">{warning.text}</p>
            <Button
              size="sm"
              className="w-full"
              onClick={() => {
                setIsWarningOpen(false)
                onOpenAccount()
              }}
            >
              {warning.action}
            </Button>
          </PopoverContent>
        </Popover>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={onOpenAccount}
        className="flex items-center gap-2"
        title={householdId ? "Sincronizado en la nube" : "Solo en este dispositivo"}
      >
        {householdId ? <Cloud className="h-4 w-4 text-green-600" /> : <CloudOff className="h-4 w-4 text-muted-foreground" />}
        <span className="hidden sm:inline max-w-[180px] truncate">{user?.email ?? "Entrar"}</span>
      </Button>
    </div>
  )
}
