/**
 * @file components/recovery-code-dialog.tsx
 * @description Muestra el código de recuperación de la contraseña maestra UNA sola vez (no se
 *              guarda en ningún sitio), con opciones para copiarlo y descargarlo. No se puede
 *              cerrar hasta confirmar que está guardado.
 *              Es un Client Component (`"use client"`) debido al uso de estados y eventos.
 */

"use client"

import { useState } from "react"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { formatCode } from "@/lib/cloud/crypto"
import { Copy, Download, ShieldCheck } from "lucide-react"

interface RecoveryCodeDialogProps {
  /** Código a mostrar; `null` = diálogo cerrado. */
  code: string | null
  email: string | null
  onClose: () => void
}

export function RecoveryCodeDialog({ code, email, onClose }: RecoveryCodeDialogProps) {
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)

  if (!code) return null
  const formatted = formatCode(code)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatted)
      setCopied(true)
    } catch {
      // Sin permiso de portapapeles: el código sigue visible para copiarlo a mano.
    }
  }

  const handleDownload = () => {
    const text = [
      "2Budget - Código de recuperación de la contraseña maestra",
      "",
      email ? `Cuenta: ${email}` : null,
      `Código: ${formatted}`,
      `Generado: ${new Date().toLocaleString("es-ES")}`,
      "",
      "Con este código puedes elegir una contraseña maestra nueva si olvidas la actual.",
      "Guárdalo en un lugar seguro y privado: quien lo tenga junto a tu cuenta puede leer tus datos.",
    ]
      .filter((line) => line !== null)
      .join("\n")
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }))
    const a = document.createElement("a")
    a.href = url
    a.download = "2budget-codigo-recuperacion.txt"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleClose = () => {
    setCopied(false)
    setSaved(false)
    onClose()
  }

  return (
    <Modal isOpen onClose={handleClose} title="Tu código de recuperación" size="md" dismissible={false}>
      <div className="p-6 space-y-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
          <p className="text-sm text-muted-foreground">
            Si olvidas tu contraseña maestra, con este código podrás elegir una nueva sin perder tus datos.{" "}
            <strong className="text-foreground">Solo se muestra ahora</strong>: no lo guardamos en ningún sitio.
          </p>
        </div>

        <div className="rounded-xl bg-muted px-4 py-3 text-center">
          <span className="font-mono text-base sm:text-lg tracking-wider text-foreground break-all">{formatted}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" onClick={handleCopy} className="flex items-center gap-2">
            <Copy className="h-4 w-4" /> {copied ? "Copiado" : "Copiar"}
          </Button>
          <Button type="button" variant="outline" onClick={handleDownload} className="flex items-center gap-2">
            <Download className="h-4 w-4" /> Descargar
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Guárdalo en un lugar seguro y privado, como un gestor de contraseñas: quien lo tenga junto a tu cuenta puede
          leer tus datos. Si generas uno nuevo, este deja de funcionar.
        </p>

        <label className="flex items-start gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={saved}
            onChange={(e) => setSaved(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span>He guardado el código en un lugar seguro</span>
        </label>

        <Button type="button" className="w-full" disabled={!saved} onClick={handleClose}>
          Continuar
        </Button>
      </div>
    </Modal>
  )
}
