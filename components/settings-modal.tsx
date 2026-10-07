/**
 * @file components/settings-modal.tsx
 * @description Este archivo define el componente `SettingsModal`, un modal
 *              que permite al usuario configurar nombres y el modo individual, exportar/importar datos,
 *              y eliminar todos los datos de la aplicación.
 *              Incluye un modal de confirmación para la eliminación de datos.
 *              Es un Client Component (`"use client"`) debido al uso de estados, refs y eventos.
 */

"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import type { AppConfig, AppData } from "@/types"
import { Modal } from "@/components/ui/modal" // Componente base del modal.
import { Button } from "@/components/ui/button" // Componente de botón.
import { Input } from "@/components/ui/input" // Componente de input.
import { Label } from "@/components/ui/label" // Componente de etiqueta para inputs.
import { Switch } from "@/components/ui/switch" // Interruptor para el modo individual.
import { downloadAppData } from "@/lib/storage" // Descarga del JSON de copia de seguridad.
import { Download, Upload, Trash2, AlertTriangle } from "lucide-react" // Iconos.

/**
 * @interface SettingsModalProps
 * @description Define las propiedades que acepta el componente `SettingsModal`.
 * @property {boolean} isOpen - Controla la visibilidad del modal.
 * @property {() => void} onClose - Función para cerrar el modal.
 * @property {AppConfig} config - El objeto de configuración actual de la aplicación.
 * @property {(config: AppConfig) => void} onUpdateConfig - Función para actualizar la configuración.
 * @property {AppData} appData - Los datos actuales, para exportarlos.
 * @property {(content: string) => boolean} onImportData - Importa el contenido de un JSON; devuelve si fue válido.
 * @property {boolean} isCloud - Los datos se guardan en la nube (hogar compartido) y no solo en este navegador.
 * @property {() => void} onClearData - Función para eliminar todos los datos.
 * @property {number} person2OpenTransactionsCount - Transacciones `person2`/`both` de meses sin informe,
 *           para avisar al activar el modo individual.
 */
interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  config: AppConfig
  onUpdateConfig: (config: AppConfig) => void
  appData: AppData
  onImportData: (content: string) => boolean
  isCloud: boolean
  onClearData: () => void
  person2OpenTransactionsCount: number
}

/**
 * @function SettingsModal
 * @description Componente modal para la configuración de la aplicación.
 *              Permite personalizar nombres, gestionar datos (exportar, importar, etc.)
 *              y ofrece una confirmación antes de borrar todos los datos.
 * @param {SettingsModalProps} props - Propiedades del componente.
 * @returns {JSX.Element} El componente modal de configuración.
 */
export function SettingsModal({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  appData,
  onImportData,
  isCloud,
  onClearData,
  person2OpenTransactionsCount,
}: SettingsModalProps) {
  // Estados locales para los nombres de las personas, inicializados con la configuración actual.
  const [person1Name, setPerson1Name] = useState(config.person1Name)
  const [person2Name, setPerson2Name] = useState(config.person2Name)
  // Estado local del modo individual; se guarda junto con los nombres.
  const [singleMode, setSingleMode] = useState(Boolean(config.singleMode))
  // Estado para controlar la visibilidad del modal de confirmación de eliminación de datos.
  const [isClearDataConfirmModalOpen, setIsClearDataConfirmModalOpen] = useState(false)
  // Ref para el input de tipo archivo, permitiendo activarlo programáticamente.
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Al abrir, los campos parten de la configuración actual (puede haber cambiado por una
  // importación o desde otro dispositivo del hogar).
  useEffect(() => {
    if (!isOpen) return
    setPerson1Name(config.person1Name)
    setPerson2Name(config.person2Name)
    setSingleMode(Boolean(config.singleMode))
  }, [isOpen, config])

  /**
   * @function handleSaveConfig
   * @description Manejador para guardar los nombres de las personas y el modo individual.
   *              Llama a la función `onUpdateConfig` del padre y cierra el modal.
   * @returns {void}
   */
  const handleSaveConfig = () => {
    onUpdateConfig({
      person1Name,
      person2Name,
      singleMode,
    })
    onClose()
  }

  /**
   * @function handleExport
   * @description Manejador para exportar los datos de la aplicación.
   *              Crea un archivo JSON con los datos y lo descarga en el navegador del usuario.
   * @returns {void}
   */
  const handleExport = () => {
    downloadAppData(appData)
  }

  /**
   * @function handleImport
   * @description Manejador para importar datos desde un archivo JSON.
   *              Lee el contenido del archivo y llama a la función `importData` del padre.
   * @param {React.ChangeEvent<HTMLInputElement>} event - El evento de cambio del input de archivo.
   * @returns {void}
   */
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] // Obtiene el primer archivo seleccionado.
    if (!file) return // Si no hay archivo, sale.

    const reader = new FileReader() // Crea un lector de archivos.
    reader.onload = (e) => {
      const content = e.target?.result as string // Obtiene el contenido del archivo como string.
      const success = onImportData(content) // El padre valida y guarda los datos importados.
      if (success) {
        onClose() // Cierra el modal si la importación fue exitosa.
      }
    }
    reader.readAsText(file) // Lee el contenido del archivo como texto.

    // Reinicia el input de archivo para permitir seleccionar el mismo archivo de nuevo si es necesario.
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  /**
   * @function handleClearDataClick
   * @description Manejador para el botón "Eliminar todos los datos".
   *              Abre el modal de confirmación antes de proceder con la eliminación.
   * @returns {void}
   */
  const handleClearDataClick = () => {
    setIsClearDataConfirmModalOpen(true) // Abre el modal de confirmación.
  }

  /**
   * @function handleConfirmClearData
   * @description Manejador para confirmar la eliminación de todos los datos.
   *              Llama a la función `onClearData` del padre, cierra el modal de confirmación
   *              y luego el modal principal de configuración.
   * @returns {void}
   */
  const handleConfirmClearData = () => {
    onClearData() // Llama a la función para borrar todos los datos.
    setIsClearDataConfirmModalOpen(false) // Cierra el modal de confirmación.
    onClose() // Cierra el modal de configuración.
  }

  return (
    <>
      {/* Modal principal de Configuración */}
      <Modal isOpen={isOpen} onClose={onClose} title="Configuración" size="md">
        <div className="p-6 space-y-8">
          {/* Sección: Configuración de personas */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">{singleMode ? "Tu nombre" : "Nombres de las personas"}</h3>

            {/* Interruptor del modo individual */}
            <div className="flex items-center justify-between gap-4 rounded-2xl border p-4">
              <div>
                <Label htmlFor="singleMode" className="text-sm font-medium">
                  Modo individual
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Para usar la app sin pareja: oculta la segunda persona y los repartos.
                </p>
              </div>
              <Switch id="singleMode" checked={singleMode} onCheckedChange={setSingleMode} />
            </div>

            {/* Aviso: al activar el modo quedan transacciones compartidas o de la Persona 2 en meses abiertos */}
            {singleMode && !config.singleMode && person2OpenTransactionsCount > 0 && (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-600">
                  Hay {person2OpenTransactionsCount}{" "}
                  {person2OpenTransactionsCount === 1 ? "transacción" : "transacciones"} de {config.person2Name} o
                  compartidas en meses sin cerrar. Seguirán sumando en los totales y se mostrarán con su etiqueta.
                  No se borra ni se modifica ningún dato, y puedes desactivar el modo cuando quieras.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="person1Name">{singleMode ? "Nombre" : "Persona 1"}</Label>
                <Input
                  id="person1Name"
                  type="text"
                  value={person1Name}
                  onChange={(e) => setPerson1Name(e.target.value)}
                  placeholder="Nombre de la primera persona"
                />
              </div>
              {/* En modo individual el nombre de la Persona 2 no se pide, pero se conserva. */}
              {!singleMode && (
                <div>
                  <Label htmlFor="person2Name">Persona 2</Label>
                  <Input
                    id="person2Name"
                    type="text"
                    value={person2Name}
                    onChange={(e) => setPerson2Name(e.target.value)}
                    placeholder="Nombre de la segunda persona"
                  />
                </div>
              )}
            </div>
            <Button onClick={handleSaveConfig} className="w-full">
              Guardar configuración
            </Button>
          </div>

          {/* Sección: Gestión de datos */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Gestión de datos</h3>

            <div className="grid grid-cols-1 gap-3">
              <Button onClick={handleExport} variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Exportar datos
              </Button>

              <div>
                {/* Input de tipo archivo oculto, activado por el botón. */}
                <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
                <Button
                  onClick={() => fileInputRef.current?.click()} // Simula un clic en el input de archivo.
                  variant="outline"
                  className="flex items-center gap-2 w-full"
                >
                  <Upload className="h-4 w-4" />
                  Importar datos
                </Button>
              </div>

              <Button
                onClick={handleClearDataClick} // Abre el modal de confirmación.
                variant="outline"
                // Clases de Tailwind para el estilo del botón destructivo.
                className="flex items-center gap-2 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar todos los datos
              </Button>
            </div>
          </div>

          {/* Sección: Información y notas */}
          <div className="bg-muted rounded-2xl p-4">
            <h4 className="font-medium text-foreground mb-2">Información</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>
                •{" "}
                {isCloud
                  ? "Los datos se guardan en la nube y se sincronizan entre tus dispositivos"
                  : "Los datos se guardan automáticamente en tu navegador"}
              </li>
              <li>• Usa exportar/importar para hacer copias de seguridad</li>
              <li>• Eliminar datos borrará toda la información permanentemente</li>
            </ul>
          </div>
        </div>
      </Modal>

      {/* Modal de confirmación para eliminar datos */}
      <Modal
        isOpen={isClearDataConfirmModalOpen}
        onClose={() => setIsClearDataConfirmModalOpen(false)}
        title="Confirmar Eliminación de Datos"
        size="sm"
      >
        <div className="p-6 space-y-6 text-center">
          <Trash2 className="h-12 w-12 text-destructive mx-auto" /> {/* Icono grande de papelera. */}
          <p className="text-foreground">
            ¿Estás seguro de que quieres eliminar <span className="font-bold">TODOS</span> los datos?
          </p>
          <p className="text-sm text-muted-foreground">
            Esta acción es irreversible y borrará todas tus transacciones, informes y configuraciones.
            {isCloud && " Se borran del hogar en la nube: también desaparecen para el resto de miembros."}
          </p>
          <div className="flex justify-center gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsClearDataConfirmModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleConfirmClearData}>
              Eliminar Datos
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
