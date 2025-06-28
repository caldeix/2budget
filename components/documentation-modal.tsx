/**
 * @file components/documentation-modal.tsx
 * @description Este archivo define el componente `DocumentationModal`, un modal
 *              que proporciona información detallada sobre el uso y las funcionalidades
 *              de la aplicación 2Budget. Utiliza un componente `Accordion` para
 *              organizar la información en secciones colapsables.
 *              Es un Client Component (`"use client"`) debido al uso del componente `Modal`
 *              y `Accordion` de Shadcn UI.
 */

"use client"

import { Button } from "@/components/ui/button"

import { Modal } from "@/components/ui/modal" // Componente base del modal.
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion" // Componentes de acordeón de Shadcn UI.
import { formatCurrency } from "@/lib/utils" // Utilidad para formatear moneda.

/**
 * @interface DocumentationModalProps
 * @description Define las propiedades que acepta el componente `DocumentationModal`.
 * @property {boolean} isOpen - Controla la visibilidad del modal.
 * @property {() => void} onClose - Función para cerrar el modal.
 * @property {string} person1Name - Nombre de la Persona 1, para personalizar la documentación.
 * @property {string} person2Name - Nombre de la Persona 2, para personalizar la documentación.
 */
interface DocumentationModalProps {
  isOpen: boolean
  onClose: () => void
  person1Name: string
  person2Name: string
}

/**
 * @function DocumentationModal
 * @description Componente modal que muestra la documentación de la aplicación 2Budget.
 *              Organiza la información en secciones de acordeón para facilitar la navegación.
 * @param {DocumentationModalProps} props - Propiedades del componente.
 * @returns {JSX.Element} El componente modal de documentación.
 */
export function DocumentationModal({ isOpen, onClose, person1Name, person2Name }: DocumentationModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Documentación de 2Budget" size="xl">
      <div className="p-6 space-y-6">
        {/* Introducción a 2Budget */}
        <p className="text-lg text-foreground leading-relaxed">
          Bienvenido a <strong>2Budget</strong>, la aplicación definitiva diseñada para simplificar y optimizar la
          gestión de las finanzas en pareja. ¿Cansados de las discusiones por el dinero o de no saber quién pagó qué?
          2Budget está aquí para solucionar esos problemas. Nuestra misión es ofrecer una herramienta intuitiva y
          potente que les permita tener un control total sobre sus ingresos y gastos, facilitando la organización del
          presupuesto y promoviendo la transparencia financiera. Con 2Budget, podrán tomar decisiones informadas,
          alcanzar sus metas económicas juntos y disfrutar de una vida financiera más armoniosa. ¡Descubran cómo
          funciona!
        </p>

        {/* Componente Accordion para organizar las secciones de la documentación */}
        <Accordion type="multiple" className="w-full">
          {/* Sección: Inicio y Resumen General */}
          <AccordionItem value="item-1">
            <AccordionTrigger className="text-lg font-semibold text-primary">
              1. Inicio y Resumen General
            </AccordionTrigger>
            <AccordionContent className="space-y-4 text-muted-foreground">
              <p>
                La pantalla de inicio de 2Budget les ofrece una visión clara y concisa de su estado financiero actual.
                Está diseñada para que, de un vistazo, puedan entender dónde están sus finanzas.
              </p>
              <h4 className="font-medium text-foreground">Tarjetas de Resumen Mensual:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>Balance:</strong> Muestra la diferencia entre los ingresos y gastos totales del mes
                  seleccionado. Si es positivo, se muestra en <span className="text-green-600">verde</span>; si es
                  negativo, en <span className="text-red-600">rojo</span>.
                </li>
                <li>
                  <strong>Ingresos:</strong> Suma total de todos los ingresos registrados en el mes.
                </li>
                <li>
                  <strong>Gastos:</strong> Suma total de todos los gastos registrados en el mes.
                </li>
                <li>
                  <strong>Balance Individual:</strong> Desglosa el balance (ingresos - gastos) para cada persona,{" "}
                  {person1Name} y {person2Name}, permitiendo ver quién ha aportado o gastado más.
                </li>
              </ul>
              <h4 className="font-medium text-foreground">Tarjeta de Balance Total Acumulado:</h4>
              <p>
                Ubicada sobre la sección de "Informes Mensuales", esta tarjeta muestra el balance total acumulado de
                TODAS las transacciones registradas en la aplicación, desde el principio. Es ideal para tener una
                perspectiva a largo plazo de su salud financiera conjunta e individual.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Sección: Gestión de Transacciones */}
          <AccordionItem value="item-2">
            <AccordionTrigger className="text-lg font-semibold text-primary">
              2. Gestión de Transacciones
            </AccordionTrigger>
            <AccordionContent className="space-y-4 text-muted-foreground">
              <p>
                La tabla de transacciones es el corazón de 2Budget, donde pueden ver, añadir, editar y eliminar cada
                movimiento de dinero.
              </p>
              <h4 className="font-medium text-foreground">Navegador de Meses:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  En la parte superior de la tabla, pueden cambiar el mes y año que están visualizando usando las
                  flechas de navegación.
                </li>
                <li>
                  Haciendo clic en el nombre del mes y año (ej. "JUNIO 2025"), se abrirá un selector de calendario para
                  ir a cualquier mes y año rápidamente.
                </li>
                <li>
                  <strong>Navegación Táctil (Móvil):</strong> Pueden deslizar el dedo horizontalmente sobre el
                  encabezado de la tabla para cambiar de mes (deslizar a la derecha para el mes anterior, a la izquierda
                  para el siguiente).
                </li>
              </ul>
              <h4 className="font-medium text-foreground">Filtros y Búsqueda:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>Búsqueda:</strong> Escriban en la barra de búsqueda para encontrar transacciones por nombre.
                </li>
                <li>
                  <strong>Filtro por Tipo:</strong> Seleccionen "Ingresos" o "Gastos" para ver solo un tipo de
                  transacción.
                </li>
                <li>
                  <strong>Filtro por Categoría:</strong> Para gastos, pueden filtrar por "fijo" o "variable".
                </li>
              </ul>
              <h4 className="font-medium text-foreground">Ordenación de la Tabla:</h4>
              <p>
                En la vista de escritorio, pueden hacer clic en los encabezados de las columnas (Fecha, Descripción,
                Importe, Categoría) para ordenar las transacciones de forma ascendente o descendente.
              </p>
              <h4 className="font-medium text-foreground">Diseño de la Tabla:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>Escritorio:</strong> Las transacciones se muestran en un formato de tarjeta, con toda la
                  información relevante y los botones de acción (Editar y Eliminar) siempre visibles a la derecha.
                </li>
                <li>
                  <strong>Móvil:</strong> Para optimizar el espacio, los botones de acción están ocultos. Pueden
                  deslizar el dedo hacia la izquierda sobre una transacción para revelar los botones de "Editar" y
                  "Eliminar". Un ligero efecto visual indica que el menú se ha abierto.
                </li>
                <li>
                  <strong>Carga Infinita:</strong> En la vista de transacciones, solo se muestran 5 transacciones
                  inicialmente. A medida que se desplazan hacia abajo (scroll), se cargarán más transacciones de 5 en 5,
                  permitiendo una navegación fluida sin cargar todos los datos de golpe.
                </li>
              </ul>
              <h4 className="font-medium text-foreground">Añadir Nueva Transacción:</h4>
              <p>
                Hagan clic en el botón flotante <strong className="text-primary">"+"</strong> en la esquina inferior
                izquierda para abrir el formulario de nueva transacción.
              </p>
              <h4 className="font-medium text-foreground">Editar Transacción:</h4>
              <p>
                Hagan clic en el icono de lápiz (<strong className="text-primary">Editar</strong>) junto a cualquier
                transacción para abrir el formulario con los datos precargados y realizar cambios.
              </p>
              <h4 className="font-medium text-foreground">Eliminar Transacción:</h4>
              <p>
                Hagan clic en el icono de papelera (<strong className="text-red-600">Eliminar</strong>) junto a
                cualquier transacción para borrarla permanentemente.
              </p>
              <h4 className="font-medium text-foreground">Copiar Gastos Fijos:</h4>
              <p>
                Utilice el botón de copia en la barra lateral para duplicar automáticamente los gastos fijos del mes
                anterior al mes actual.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Sección: Añadir y Editar Transacciones (Formulario) */}
          <AccordionItem value="item-3">
            <AccordionTrigger className="text-lg font-semibold text-primary">
              3. Formulario de Transacciones
            </AccordionTrigger>
            <AccordionContent className="space-y-4 text-muted-foreground">
              <p>Al añadir o editar una transacción, se les presentará un formulario con los siguientes campos:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>Tipo:</strong> Seleccionen si es un "Gasto" o un "Ingreso". Esto afectará cómo se calcula en
                  sus balances.
                </li>
                <li>
                  <strong>Categoría:</strong>
                  <ul className="list-circle list-inside ml-4">
                    <li>
                      Para <strong>Gastos</strong>: Elijan entre "variable" (ej. supermercado, ocio) o "fijo" (ej.
                      alquiler, suscripciones).
                    </li>
                    <li>
                      Para <strong>Ingresos</strong>: La categoría es automáticamente "ingreso".
                    </li>
                  </ul>
                </li>
                <li>
                  <strong>Nombre:</strong> Una breve descripción de la transacción (ej. "Cena en restaurante", "Salario
                  de {person1Name}").
                </li>
                <li>
                  <strong>Importe (€):</strong> La cantidad de dinero de la transacción. Asegúrense de usar el formato
                  correcto (ej. 120.50).
                </li>
                <li>
                  <strong>Fecha:</strong> La fecha en que ocurrió la transacción.
                </li>
                <li>
                  <strong>Propietario:</strong> Indiquen quién realizó o recibió la transacción:
                  <ul className="list-circle list-inside ml-4">
                    <li>
                      <strong>{person1Name}:</strong> La transacción afecta solo el balance de {person1Name}.
                    </li>
                    <li>
                      <strong>{person2Name}:</strong> La transacción afecta solo el balance de {person2Name}.
                    </li>
                    <li>
                      <strong>Ambos:</strong> La transacción se comparte entre los dos.
                    </li>
                  </ul>
                </li>
                <li>
                  <strong>Distribución de porcentajes (solo si el propietario es "Ambos"):</strong>
                  <p className="ml-4 mt-1">
                    Si seleccionan "Ambos", aparecerá un deslizador (slider) para distribuir el porcentaje de la
                    transacción entre {person1Name} y {person2Name}. Muevan el deslizador para ajustar el porcentaje de{" "}
                    {person1Name}, y el porcentaje de {person2Name} se ajustará automáticamente para sumar 100%. Los
                    porcentajes se muestran como números enteros.
                  </p>
                  <p className="ml-4 mt-1 text-sm italic">
                    Ejemplo: Si {person1Name} paga el 70% de un gasto compartido, el deslizador se ajustará a 70% para{" "}
                    {person1Name} y 30% para {person2Name}.
                  </p>
                </li>
              </ul>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline">Cancelar</Button>
                <Button type="submit">Crear / Actualizar</Button>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Sección: Informes Mensuales */}
          <AccordionItem value="item-4">
            <AccordionTrigger className="text-lg font-semibold text-primary">4. Informes Mensuales</AccordionTrigger>
            <AccordionContent className="space-y-4 text-muted-foreground">
              <p>
                Los informes mensuales les permiten cerrar un mes, calcular ajustes y obtener un resumen detallado de
                sus finanzas.
              </p>
              <h4 className="font-medium text-foreground">Cerrar Mes Actual / Actualizar Mes Actual:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Este botón, ubicado en la barra lateral de "Informes Mensuales", les permite generar un informe para
                  el mes actual del sistema.
                </li>
                <li>Si ya existe un informe para el mes actual, el botón cambiará a "Actualizar Mes Actual".</li>
              </ul>
              <h4 className="font-medium text-foreground">Generar / Actualizar Informe del Mes Seleccionado:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Si están viendo un mes diferente al actual en la tabla de transacciones (y no es un mes futuro),
                  aparecerá un botón para generar o actualizar el informe de ese mes específico.
                </li>
              </ul>
              <h4 className="font-medium text-foreground">Modal de Informe Mensual:</h4>
              <p>Al hacer clic en los botones de informe, se abrirá un modal donde podrán:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>Resumen del mes (antes de ajustes):</strong> Verán un resumen de ingresos, gastos y balances
                  calculados automáticamente a partir de las transacciones del mes.
                </li>
                <li>
                  <strong>Dinero real disponible al final del mes:</strong> Aquí deben introducir la cantidad de dinero
                  real que cada persona tiene disponible al final del mes. Esto es crucial para calcular los ajustes.
                </li>
                <li>
                  <strong>Ajustes calculados:</strong> 2Budget calculará automáticamente la diferencia entre el balance
                  calculado y el dinero real introducido. Si hay una diferencia significativa (mayor o igual a{" "}
                  {formatCurrency(0.01)}), se generarán transacciones de ajuste.
                </li>
                <li>
                  <strong>Transacciones de ajuste que se crearán:</strong> Verán una vista previa de las transacciones
                  que se añadirán automáticamente para equilibrar los balances según el dinero real.
                </li>
              </ul>
              <h4 className="font-medium text-foreground">Ver Informes Anteriores:</h4>
              <p>
                En la barra lateral, debajo de los botones de informe, encontrarán una lista de todos los informes
                mensuales generados previamente. Hagan clic en cualquiera de ellos para abrir el "Modal de Detalle de
                Informe".
              </p>
              <h4 className="font-medium text-foreground">Modal de Detalle de Informe:</h4>
              <p>Este modal les proporciona un análisis profundo del mes seleccionado:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>Resumen General:</strong> Ingresos, gastos y balance total del mes.
                </li>
                <li>
                  <strong>Gráficos de Distribución:</strong>
                  <ul className="list-circle list-inside ml-4">
                    <li>
                      <strong>Gastos:</strong> Un gráfico de pastel que muestra la proporción de gastos "fijos" y
                      "variables".
                    </li>
                    <li>
                      <strong>Ingresos:</strong> Un gráfico de pastel que muestra la proporción de ingresos aportados
                      por {person1Name} y {person2Name}.
                    </li>
                  </ul>
                </li>
                <li>
                  <strong>Detalles por Persona:</strong> Un desglose completo de ingresos, gastos, balance calculado,
                  dinero real introducido y el ajuste final para cada persona.
                </li>
                <li>
                  <strong>Estadísticas del mes:</strong> Información adicional como el total de transacciones, número de
                  gastos fijos, variables e ingresos.
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          {/* Sección: Configuración */}
          <AccordionItem value="item-5">
            <AccordionTrigger className="text-lg font-semibold text-primary">5. Configuración</AccordionTrigger>
            <AccordionContent className="space-y-4 text-muted-foreground">
              <p>
                Accedan a la configuración haciendo clic en el icono de engranaje (
                <strong className="text-primary">Configuración</strong>) en la esquina inferior izquierda. Aquí pueden
                personalizar la aplicación y gestionar sus datos.
              </p>
              <h4 className="font-medium text-foreground">Nombres de las personas:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Pueden cambiar los nombres de "Persona 1" y "Persona 2" a sus nombres reales o apodos. Estos nombres
                  se actualizarán en toda la aplicación.
                </li>
                <li>Hagan clic en "Guardar Nombres" para aplicar los cambios.</li>
              </ul>
              <h4 className="font-medium text-foreground">Gestión de datos:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>Exportar datos:</strong> Descarguen un archivo JSON con todas sus transacciones, informes y
                  configuraciones. Esto es útil para hacer copias de seguridad.
                </li>
                <li>
                  <strong>Importar datos:</strong> Suban un archivo JSON previamente exportado para restaurar sus datos.
                </li>
                <li>
                  <strong>Cargar datos de prueba:</strong> Si quieren explorar la aplicación sin añadir sus propios
                  datos, pueden cargar un conjunto de transacciones e informes de ejemplo.
                </li>
                <li>
                  <strong>Eliminar todos los datos:</strong> Esta opción borrará permanentemente todas las
                  transacciones, informes y configuraciones de la aplicación. Se les pedirá una confirmación para evitar
                  eliminaciones accidentales.
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          {/* Sección: Cambiar Tema */}
          <AccordionItem value="item-6">
            <AccordionTrigger className="text-lg font-semibold text-primary">6. Cambiar Tema</AccordionTrigger>
            <AccordionContent className="space-y-4 text-muted-foreground">
              <p>
                Pueden alternar entre el modo claro y oscuro de la aplicación haciendo clic en el botón de sol/luna
                ubicado en la esquina inferior izquierda. La aplicación recordará su preferencia para futuras sesiones.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Sección: Persistencia de Datos */}
          <AccordionItem value="item-7">
            <AccordionTrigger className="text-lg font-semibold text-primary">7. Persistencia de Datos</AccordionTrigger>
            <AccordionContent className="space-y-4 text-muted-foreground">
              <p>
                Es importante saber que{" "}
                <strong>todos sus datos se guardan automáticamente en el almacenamiento local de su navegador</strong>{" "}
                Esto significa que sus transacciones e informes estarán disponibles cada vez que visiten la aplicación
                en el mismo navegador y dispositivo.
              </p>
              <p>
                <strong>Consideraciones:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Si borran la caché o los datos del sitio web en su navegador, sus datos de 2Budget se perderán. Por
                  ello, se recomienda usar la función de <strong>Exportar datos</strong> regularmente para tener copias
                  de seguridad externas.
                </li>
                <li>
                  Los datos no se sincronizan entre diferentes dispositivos o navegadores. Si desean usar 2Budget en
                  otro dispositivo, deberán exportar los datos del primero e importarlos en el segundo.
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </Modal>
  )
}
