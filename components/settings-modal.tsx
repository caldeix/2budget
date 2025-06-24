/**
 * @file components/settings-modal.tsx
 * @description Este archivo define el componente `SettingsModal`, un modal
 *              que permite al usuario configurar nombres, exportar/importar datos,
 *              cargar datos de prueba y eliminar todos los datos de la aplicación.
 *              Incluye un modal de confirmación para la eliminación de datos.
 *              Es un Client Component (`"use client"`) debido al uso de estados, refs y eventos.
 */

"use client"

import type React from "react"

import { useState, useRef } from "react"
import type { AppConfig } from "@/types"
import { Modal } from "@/components/ui/modal" // Componente base del modal.
import { Button } from "@/components/ui/button" // Componente de botón.
import { Input } from "@/components/ui/input" // Componente de input.
import { Label } from "@/components/ui/label" // Componente de etiqueta para inputs.
import { exportData, importData } from "@/lib/storage" // Funciones de gestión de datos.
import { Download, Upload, Trash2, Database } from "lucide-react" // Iconos.

/**
 * @interface SettingsModalProps
 * @description Define las propiedades que acepta el componente `SettingsModal`.
 * @property {boolean} isOpen - Controla la visibilidad del modal.
 * @property {() => void} onClose - Función para cerrar el modal.
 * @property {AppConfig} config - El objeto de configuración actual de la aplicación.
 * @property {(config: AppConfig) => void} onUpdateConfig - Función para actualizar la configuración.
 * @property {(success: boolean) => void} onImportData - Función de callback después de intentar importar datos.
 * @property {() => void} onLoadSampleData - Función para cargar datos de prueba.
 * @property {() => void} onClearData - Función para eliminar todos los datos.
 */
interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  config: AppConfig
  onUpdateConfig: (config: AppConfig) => void
  onImportData: (success: boolean) => void
  onLoadSampleData: () => void
  onClearData: () => void
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
  onImportData,
  onLoadSampleData,
  onClearData,
}: SettingsModalProps) {
  // Estados locales para los nombres de las personas, inicializados con la configuración actual.
  const [person1Name, setPerson1Name] = useState(config.person1Name)
  const [person2Name, setPerson2Name] = useState(config.person2Name)
  // Estado para controlar la visibilidad del modal de confirmación de eliminación de datos.
  const [isClearDataConfirmModalOpen, setIsClearDataConfirmModalOpen] = useState(false)
  // Ref para el input de tipo archivo, permitiendo activarlo programáticamente.
  const fileInputRef = useRef<HTMLInputElement>(null)

  /**
   * @function handleSaveConfig
   * @description Manejador para guardar los nombres de las personas.
   *              Llama a la función `onUpdateConfig` del padre y cierra el modal.
   * @returns {void}
   */
  const handleSaveConfig = () => {
    onUpdateConfig({
      person1Name,
      person2Name,
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
    const data = exportData() // Obtiene los datos como una cadena JSON.
    // Crea un Blob (objeto de datos inmutables) con el contenido JSON.
    const blob = new Blob([data], { type: "application/json" })
    // Crea una URL para el Blob.
    const url = URL.createObjectURL(blob)
    // Crea un elemento <a> temporal para simular un clic de descarga.
    const a = document.createElement("a")
    a.href = url
    // Define el nombre del archivo a descargar.
    a.download = `financial-data-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a) // Añade el elemento al DOM.
    a.click() // Simula un clic para iniciar la descarga.
    document.body.removeChild(a) // Elimina el elemento temporal.
    URL.revokeObjectURL(url) // Libera la URL del Blob para liberar memoria.
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
      const success = importData(content) // Intenta importar los datos.
      onImportData(success) // Llama al callback del padre con el resultado.
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
   * @function handleLoadSampleData
   * @description Manejador para cargar datos de prueba.
   *              Llama a la función `onLoadSampleData` del padre y cierra el modal.
   * @returns {void}
   */
  const handleLoadSampleData = () => {
    onLoadSampleData()
    onClose()
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
          {/* Sección: Configuración de nombres */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Nombres de las personas</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="person1Name">Persona 1</Label>
                <Input
                  id="person1Name"
                  type="text"
                  value={person1Name}
                  onChange={(e) => setPerson1Name(e.target.value)}
                  placeholder="Nombre de la primera persona"
                />
              </div>
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
            </div>
            <Button onClick={handleSaveConfig} className="w-full">
              Guardar Nombres
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

              <Button onClick={handleLoadSampleData} variant="outline" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Cargar datos de prueba
              </Button>

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
              <li>• Los datos se guardan automáticamente en tu navegador</li>
              <li>• Usa exportar/importar para hacer copias de seguridad</li>
              <li>• Los datos de prueba incluyen transacciones de ejemplo de un año completo</li>
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
