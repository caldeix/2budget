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
import { Compass } from "lucide-react" // Icono del tour.

/**
 * @interface DocumentationModalProps
 * @description Define las propiedades que acepta el componente `DocumentationModal`.
 * @property {boolean} isOpen - Controla la visibilidad del modal.
 * @property {() => void} onClose - Función para cerrar el modal.
 * @property {string} person1Name - Nombre de la Persona 1, para personalizar la documentación.
 * @property {string} person2Name - Nombre de la Persona 2, para personalizar la documentación.
 * @property {() => void} onStartTour - Cierra la ayuda y vuelve a mostrar el tour de bienvenida.
 */
interface DocumentationModalProps {
  isOpen: boolean
  onClose: () => void
  person1Name: string
  person2Name: string
  onStartTour: () => void
}

/** Título de cada sección del acordeón. */
function SectionTrigger({ children }: { children: React.ReactNode }) {
  return <AccordionTrigger className="text-lg font-semibold text-primary text-left">{children}</AccordionTrigger>
}

/** Subtítulo dentro de una sección. */
function Subtitle({ children }: { children: React.ReactNode }) {
  return <h4 className="font-medium text-foreground">{children}</h4>
}

/**
 * @function DocumentationModal
 * @description Componente modal que muestra la documentación de la aplicación 2Budget.
 *              Organiza la información en secciones de acordeón para facilitar la navegación.
 * @param {DocumentationModalProps} props - Propiedades del componente.
 * @returns {JSX.Element} El componente modal de documentación.
 */
export function DocumentationModal({ isOpen, onClose, person1Name, person2Name, onStartTour }: DocumentationModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ayuda de 2Budget" size="xl">
      <div className="p-6 space-y-6">
        <p className="text-foreground leading-relaxed">
          <strong>2Budget</strong> sirve para llevar las finanzas en pareja: qué entra, qué sale, quién paga qué y
          cuánto le queda a cada uno, mes a mes. ¿Vas por tu cuenta? Activa el <strong>modo individual</strong> en
          Configuración y la app funcionará para una sola persona.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl bg-muted p-4">
          <p className="text-sm text-muted-foreground">¿Prefieres verlo sobre la propia app? Repite el tour guiado.</p>
          <Button onClick={onStartTour} variant="outline" className="flex items-center gap-2 shrink-0">
            <Compass className="h-4 w-4" />
            Repetir el tour
          </Button>
        </div>

        <Accordion type="multiple" className="w-full">
          {/* 1. Resumen */}
          <AccordionItem value="resumen">
            <SectionTrigger>1. Resumen del mes</SectionTrigger>
            <AccordionContent className="space-y-4 text-muted-foreground">
              <p>
                Arriba ves el resumen del mes seleccionado. En el móvil, las tarjetas van en un carrusel: deslízalas o
                pulsa los puntos de debajo.
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>Balance:</strong> ingresos menos gastos del mes, en <span className="text-green-600">verde</span>{" "}
                  si es positivo y en <span className="text-red-600">rojo</span> si es negativo. Debajo, los totales y la
                  parte de gastos no computables.
                </li>
                <li>
                  <strong>Ingresos:</strong> el total del mes y lo que aporta cada uno.
                </li>
                <li>
                  <strong>Gastos:</strong> el total del mes y la parte de cada uno según el reparto de cada gasto.
                </li>
                <li>
                  <strong>Balance individual:</strong> lo que le queda a {person1Name} y a {person2Name} (sus ingresos
                  menos su parte de los gastos).
                </li>
              </ul>
              <Subtitle>Hoy y Previsto</Subtitle>
              <p>
                Mientras quedan gastos por pagar, las tarjetas muestran dos cifras: <strong>Hoy</strong>, solo con los
                gastos marcados como pagados, y <strong>Previsto</strong>, con todos, como acabará el mes. Los ingresos
                cuentan siempre. Si ya está todo pagado, o el mes aún no ha empezado, se ve una sola cifra.
              </p>
              <Subtitle>Total acumulado</Subtitle>
              <p>
                La tarjeta <strong>Total acumulado</strong> suma el balance de todos los meses desde el principio: lo
                ahorrado en total y por persona. No cuenta los gastos no computables.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* 2. Transacciones */}
          <AccordionItem value="transacciones">
            <SectionTrigger>2. Transacciones</SectionTrigger>
            <AccordionContent className="space-y-4 text-muted-foreground">
              <Subtitle>Cambiar de mes</Subtitle>
              <ul className="list-disc list-inside space-y-1">
                <li>Usa las flechas junto al mes, o pulsa su nombre para ir a cualquier mes y año.</li>
                <li>En el móvil también puedes deslizar el dedo sobre la cabecera de la lista.</li>
              </ul>
              <Subtitle>Buscar y filtrar</Subtitle>
              <ul className="list-disc list-inside space-y-1">
                <li>Busca por nombre, o filtra por tipo (ingresos o gastos) y por categoría (fijo o variable).</li>
                <li>
                  El contador (por ejemplo <strong>10/29</strong>) indica cuántas transacciones se ven de las que hay en
                  el mes, y las cajas de Ingresos, Gastos y Balance suman solo lo filtrado.
                </li>
                <li>En PC puedes ordenar la lista pulsando en las cabeceras de las columnas.</li>
                <li>La lista carga de 5 en 5 a medida que bajas.</li>
              </ul>
              <Subtitle>Marcar como pagado</Subtitle>
              <p>
                Pulsa el círculo de un gasto cuando lo pagues (se pone verde). Cuenta para la cifra de «Hoy». Al abrir la
                app en un mes nuevo, si del mes anterior quedaron gastos sin marcar, la app te pregunta cuáles se pagaron.
              </p>
              <Subtitle>Editar y borrar</Subtitle>
              <ul className="list-disc list-inside space-y-1">
                <li>En PC, con los botones del lápiz y la papelera a la derecha de cada transacción.</li>
                <li>En el móvil, desliza la transacción hacia la izquierda para que aparezcan.</li>
                <li>
                  Las transacciones de un <strong>mes pasado ya cerrado</strong> no se pueden editar, borrar ni marcar: el
                  mes es de solo lectura (ver Informes).
                </li>
              </ul>
              <Subtitle>Botones flotantes</Subtitle>
              <p>
                Abajo a la izquierda: <strong className="text-secondary">+</strong> para añadir una transacción, copiar
                gastos fijos e ingresos, modo claro u oscuro, Configuración y esta ayuda. En el móvil, todos menos el «+»
                van dentro del botón <strong>⋮</strong>.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* 3. Formulario */}
          <AccordionItem value="formulario">
            <SectionTrigger>3. Añadir una transacción</SectionTrigger>
            <AccordionContent className="space-y-4 text-muted-foreground">
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>Tipo:</strong> gasto o ingreso.
                </li>
                <li>
                  <strong>Categoría</strong> (solo gastos): <em>fijo</em> (alquiler, suscripciones…) o <em>variable</em>{" "}
                  (supermercado, ocio…). Los fijos son los que se copian de un mes a otro.
                </li>
                <li>
                  <strong>Gasto no computable:</strong> cuenta en el mes pero no en el total acumulado (ver la sección 4).
                </li>
                <li>
                  <strong>Nombre:</strong> al escribir te sugiere los nombres que ya has usado en transacciones del mismo
                  tipo; pulsa uno (o elígelo con las flechas y Enter) para no escribirlo entero.
                </li>
                <li>
                  <strong>Importe y fecha.</strong> El importe admite hasta dos decimales (por ejemplo 120,50).
                </li>
                <li>
                  <strong>Propietario:</strong> {person1Name}, {person2Name} o Ambos. Con «Ambos», el deslizador reparte
                  el importe: si {person1Name} paga el 70%, a {person2Name} le toca el 30%.
                </li>
              </ul>
              <p>En modo individual no se pide propietario ni reparto: todo es tuyo.</p>
            </AccordionContent>
          </AccordionItem>

          {/* 4. No computables */}
          <AccordionItem value="no-computables">
            <SectionTrigger>4. Gastos no computables</SectionTrigger>
            <AccordionContent className="space-y-4 text-muted-foreground">
              <p>
                Son gastos que quieres ver en el mes pero que no reducen lo ahorrado, porque el dinero lo sigues teniendo.
                Por ejemplo, apartar 50 € al mes para las vacaciones.
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Cuentan en el balance y los gastos del mes (aparecen aparte como «No computables»).</li>
                <li>No cuentan en el total acumulado.</li>
                <li>En la lista se ven en gris, con la etiqueta «No computable».</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          {/* 5. Copiar */}
          <AccordionItem value="copiar">
            <SectionTrigger>5. Copiar gastos fijos e ingresos</SectionTrigger>
            <AccordionContent className="space-y-4 text-muted-foreground">
              <p>
                El botón de copiar trae al mes que estás viendo los gastos fijos y los ingresos del mes anterior (los
                ajustes de cierre no se copian). Si el mes ya tiene gastos fijos o ingresos, ese tipo no se vuelve a
                copiar.
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Antes de copiar, <strong>Revisar importes</strong> te deja cambiar el importe de cada uno (por ejemplo,
                  una factura que este mes sube).
                </li>
                <li>
                  Para copiar a un mes futuro, el mes anterior tiene que estar cerrado: así puedes preparar el mes
                  siguiente sin esperar al día 1.
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          {/* 6. Informes */}
          <AccordionItem value="informes">
            <SectionTrigger>6. Informes y cierre de mes</SectionTrigger>
            <AccordionContent className="space-y-4 text-muted-foreground">
              <Subtitle>Cerrar el mes</Subtitle>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  En la tarjeta <strong>Informes</strong>, «Cerrar mes actual» abre el cierre. Si estás viendo un mes
                  pasado sin informe, aparece también el botón para generar el suyo.
                </li>
                <li>
                  Escribe el <strong>dinero real</strong> que tiene cada uno al final del mes. La app lo compara con el
                  balance calculado y crea una <strong>transacción de ajuste</strong> por persona con la diferencia, para
                  que las cuentas cuadren.
                </li>
                <li>
                  Si ya está cerrado, el botón pasa a «Actualizar mes actual»: los ajustes se recalculan y{" "}
                  <strong>sustituyen</strong> a los anteriores.
                </li>
                <li>
                  Los ajustes de cierre no se editan ni se borran a mano (sus botones se ven desactivados): se cambian
                  actualizando el mes o borrando el informe.
                </li>
              </ul>
              <Subtitle>Meses cerrados</Subtitle>
              <p>
                Un mes pasado con informe queda de <strong>solo lectura</strong>. Si lo cerraste sin querer, abre el{" "}
                <strong>último informe</strong> y pulsa «Borrar informe»: se borran el informe y sus ajustes, y el mes
                vuelve a quedar abierto. Solo se puede borrar el último.
              </p>
              <Subtitle>Ver los informes</Subtitle>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  La tarjeta muestra los 3 últimos. El botón <strong>Todos</strong> (el icono de lista, en PC) abre la
                  lista completa, con filtro por año.
                </li>
                <li>
                  Cada informe tiene el resumen del mes, gráficos de gastos (fijos y variables) y de ingresos por persona,
                  el detalle de cada uno (balance calculado, dinero real y ajuste) y unas estadísticas.
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          {/* 7. Configuración */}
          <AccordionItem value="configuracion">
            <SectionTrigger>7. Configuración</SectionTrigger>
            <AccordionContent className="space-y-4 text-muted-foreground">
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>Nombres:</strong> cambia «Persona 1» y «Persona 2» por vuestros nombres.
                </li>
                <li>
                  <strong>Modo individual:</strong> oculta la segunda persona (sin propietario ni reparto, y el cierre
                  pide un solo dinero real). No borra nada y se puede desactivar cuando quieras.
                </li>
                <li>
                  <strong>Exportar datos:</strong> descarga una copia en JSON, sin cifrar, con todas las transacciones,
                  informes y la configuración.
                </li>
                <li>
                  <strong>Importar datos:</strong> restaura una copia exportada antes (sustituye los datos actuales).
                </li>
                <li>
                  <strong>Eliminar todos los datos:</strong> lo borra todo, tras pedir confirmación.
                </li>
              </ul>
              <p>El modo claro u oscuro se cambia con el botón del sol o la luna, y la app lo recuerda.</p>
            </AccordionContent>
          </AccordionItem>

          {/* 8. Cuenta */}
          <AccordionItem value="cuenta">
            <SectionTrigger>8. Cuenta, nube y privacidad</SectionTrigger>
            <AccordionContent className="space-y-4 text-muted-foreground">
              <p>
                Para usar 2Budget hace falta una <strong>cuenta con el email verificado</strong>. El botón de la nube,
                arriba a la derecha, abre la ventana de <strong className="text-primary">Cuenta</strong>: desde ahí puedes
                cambiar el email o eliminar la cuenta. Si olvidas la contraseña de la cuenta, recupérala desde la
                pantalla de inicio de sesión.
              </p>
              <Subtitle>Hogar en la nube</Subtitle>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Los datos se guardan en un <strong>hogar</strong>: lo crea uno y el otro se une con un código de
                  invitación de un solo uso, que caduca en 48 horas (en modo individual es <strong>tu espacio</strong>).
                  Los cambios se sincronizan al momento entre dispositivos y entre los dos.
                </li>
                <li>
                  Al crear el hogar puedes subir los datos que ya hubiera en el navegador. Mientras no hay hogar, los
                  datos solo están en este dispositivo: lo avisa el icono amarillo junto a la nube.
                </li>
                <li>Sin conexión puedes seguir usando la app: los cambios se envían solos al volver la red.</li>
              </ul>
              <Subtitle>Cifrado y contraseña maestra</Subtitle>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Los datos se <strong>cifran en tu dispositivo</strong> antes de subirlos, con una{" "}
                  <strong>contraseña maestra</strong> distinta de la de la cuenta. Nadie más puede leerlos, ni siquiera el
                  administrador de la app. Cada miembro del hogar tiene la suya.
                </li>
                <li>
                  La contraseña maestra <strong>no se guarda en ningún sitio</strong>. Se pide una vez en cada dispositivo
                  y una vez al mes, para que no se olvide.
                </li>
                <li>
                  Al crear el hogar o unirte se muestra un <strong>código de recuperación</strong>: guárdalo en un lugar
                  seguro. Con él puedes elegir una contraseña maestra nueva si la olvidas. Desde Cuenta puedes cambiar la
                  contraseña maestra o generar un código nuevo.
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </Modal>
  )
}
