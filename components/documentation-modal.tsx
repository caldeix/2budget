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

        <p className="text-sm text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Instálala como una app:</strong> en Android, abre el menú de Chrome y
          pulsa «Instalar app» (o «Añadir a pantalla de inicio» &gt; «Instalar»); en iPhone, en Safari, Compartir &gt;
          «Añadir a pantalla de inicio». Se abrirá a pantalla completa, con su icono, y también sin conexión.
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
                  menos su parte de los gastos). Si el mes tiene aportaciones a la cuenta compartida, muestra la cuenta
                  de cada uno, su total debajo y una fila «Compartida» (ver la sección 6).
                </li>
              </ul>
              <p>
                En <strong>modo individual</strong> no hay desglose por persona: Ingresos y Gastos van juntos en una
                sola tarjeta, los ingresos arriba y los gastos abajo, al lado del Balance.
              </p>
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
              <Subtitle>Evolución</Subtitle>
              <p>
                La tarjeta <strong>Evolución</strong> muestra los ingresos y gastos de los últimos seis meses. Púlsala
                para ver el año completo: ingresos, gastos y ahorro de cada mes, los totales del año y un selector de
                año. Se calcula con las transacciones de cada mes, cerrado o no.
              </p>
              <p>
                En pareja, un segundo selector elige la <strong>cuenta</strong>: la tuya o la compartida (sin cuenta en la
                nube, las de los dos). En la tuya, los ingresos son los tuyos y los gastos, los individuales más lo que
                envías a la compartida; el ahorro de cada mes es la cifra de tu cuenta en el Balance individual. En la
                compartida, entran las aportaciones y los ingresos compartidos y salen los gastos compartidos. La tarjeta
                del lateral enseña la cuenta que elijas.
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
                <li>
                  <strong>Buscar:</strong> mientras hay texto en el buscador se busca en <strong>todos los meses</strong>,
                  no solo en el que ves. Las transacciones de otros meses llevan la fecha en dorado y, si su mes está
                  cerrado, no se pueden editar. Al borrar el texto vuelve el mes.
                </li>
                <li>
                  <strong>Filtrar:</strong> por tipo (ingresos, gastos fijos, gastos variables o aportaciones), por
                  categoría (Supermercado, Casa… o «Sin categoría») y por pago (solo los pagados o solo los pendientes).
                </li>
                <li>
                  El contador (por ejemplo <strong>10/29</strong>) indica cuántas transacciones se ven de las que hay en
                  el mes, y las cajas de Ingresos, Gastos y Balance suman solo lo filtrado.
                </li>
                <li>
                  En PC puedes ordenar la lista pulsando en las cabeceras de las columnas. «Pagado» pone primero los
                  gastos pendientes (púlsalo otra vez para invertir el orden).
                </li>
                <li>La lista carga de 5 en 5 a medida que bajas.</li>
              </ul>
              <Subtitle>Marcar como pagado</Subtitle>
              <p>
                Pulsa el círculo de un gasto cuando lo pagues (se pone verde). Cuenta para la cifra de «Hoy». Las
                aportaciones a la compartida se marcan igual, cuando se envían. Al abrir la app en un mes nuevo, si del
                mes anterior quedaron gastos o aportaciones sin marcar, la app te pregunta cuáles se pagaron.
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
                  <strong>Tipo:</strong> <em>gasto variable</em> (supermercado, ocio…), <em>gasto fijo</em> (alquiler,
                  suscripciones…; son los que se copian de un mes a otro), <em>ingreso</em> o, en pareja,{" "}
                  <em>aportación a la compartida</em> (sin categoría ni reparto: se elige quién aporta; ver la sección 6).
                </li>
                <li>
                  <strong>Categoría:</strong> en qué se va el dinero (Supermercado, Casa, Transporte…). Hay una lista
                  para gastos y otra para ingresos, y se cambian con el botón Categorías. Puedes dejarla en «Sin
                  categoría». La app la usa para el gráfico por categoría del informe y para filtrar la lista.
                </li>
                <li>
                  <strong>Gasto no computable:</strong> cuenta en el mes pero no en el total acumulado (ver la sección 4).
                </li>
                <li>
                  <strong>Nombre:</strong> al escribir te sugiere los nombres que ya has usado en transacciones del mismo
                  tipo; pulsa uno (o elígelo con las flechas y Enter) para no escribirlo entero. Al elegirlo, o al
                  escribir un nombre que ya existe, se rellena sola la <strong>categoría</strong> de la última vez (si
                  no has elegido ya otra a mano).
                </li>
                <li>
                  <strong>Importe y fecha.</strong> El importe admite hasta dos decimales (por ejemplo 120,50). La
                  fecha puede ser del mes actual o del anterior mientras no esté cerrado; los meses ya cerrados no
                  admiten transacciones nuevas.
                </li>
                <li>
                  <strong>Reparto:</strong> el deslizador dice qué parte es de cada uno. Si {person1Name} paga el 70%, a{" "}
                  {person2Name} le toca el 30%. Con el 100% para uno, la transacción es solo suya (y así se muestra
                  en la lista); cualquier otro reparto es compartido.
                </li>
              </ul>
              <p>En modo individual no se pide reparto: todo es tuyo.</p>
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
            <SectionTrigger>5. Copiar gastos fijos, ingresos y aportaciones</SectionTrigger>
            <AccordionContent className="space-y-4 text-muted-foreground">
              <p>
                El botón de copiar trae al mes que estás viendo los gastos fijos, los ingresos y las aportaciones a la
                compartida del mes anterior (los ajustes de cierre no se copian), cada uno con su categoría. Si el mes
                ya tiene alguno de esos tipos, ese tipo no se vuelve a copiar.
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

          {/* 6. Cuenta compartida */}
          <AccordionItem value="cuenta-compartida">
            <SectionTrigger>6. Cuenta compartida</SectionTrigger>
            <AccordionContent className="space-y-4 text-muted-foreground">
              <p>
                Si cada mes enviáis dinero a una <strong>cuenta de los dos</strong> y de ahí pagáis lo compartido, apunta
                lo que envía cada uno como <strong>aportación a la compartida</strong>. No es un gasto: el dinero sigue
                siendo de quien lo envía, solo cambia de cuenta. Se marca como enviada y se copia al mes siguiente con
                los fijos y los ingresos.
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>Lo compartido va por la compartida:</strong> todo gasto o ingreso con reparto sale o entra de
                  ella; lo que es solo de uno, de su cuenta. No hay que elegir nada más: lo decide el reparto.
                </li>
                <li>
                  En <strong>Balance individual</strong> se ve la <strong>cuenta</strong> de cada uno (lo que tiene en su
                  banco), su <strong>total previsto</strong> debajo (su cuenta más su parte en la compartida) y una
                  fila <strong>Compartida</strong> con lo que hay y de quién es. Todo en «Hoy» y «Previsto». Pulsa el
                  nombre de una fila para ver de dónde sale su cifra.
                </li>
                <li>
                  Los <strong>Gastos</strong> de cada uno no incluyen las aportaciones: son un traspaso entre cuentas, no
                  un gasto.
                </li>
                <li>
                  Lo que sobra en la compartida <strong>se queda ahí</strong> y se acumula: el Total acumulado también
                  separa las tres cuentas. Los gastos no computables compartidos se quedan en la compartida (son una
                  hucha).
                </li>
                <li>
                  Ejemplo: cobráis 1000 € cada uno y enviáis 500 € cada uno; los gastos compartidos son 600 € a medias.
                  Cada cuenta tiene 500 €, la compartida 400 € (200 € de cada uno) y el total de cada uno es 700 €.
                </li>
                <li>
                  Para repartir lo que sobra en la compartida, usa la fila <strong>Compartida</strong> (en el ejemplo,
                  400 €: 200 € para cada uno), no la cuenta de cada uno: los 500 € de cada cuenta ya son de su dueño.
                </li>
                <li>Un mes sin aportaciones se calcula como siempre. En modo individual no hay cuenta compartida.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          {/* 7. Informes */}
          <AccordionItem value="informes">
            <SectionTrigger>7. Informes y cierre de mes</SectionTrigger>
            <AccordionContent className="space-y-4 text-muted-foreground">
              <Subtitle>Cerrar el mes</Subtitle>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  En la tarjeta <strong>Informes</strong>, «Cerrar mes actual» abre el cierre. Si estás viendo un mes
                  pasado sin informe, aparece también el botón para generar el suyo. Solo se puede actualizar el
                  informe del mes actual y del anterior; los más antiguos ya no se tocan.
                </li>
                <li>
                  <strong>Pendientes:</strong> al cerrar un mes ya terminado con gastos o aportaciones sin pagar, antes
                  eliges qué pasa con cada uno: <strong>ya pagado</strong>; <strong>pasar al mes siguiente</strong> (llega
                  tarde: va al día 1, aún pendiente); o que no se pagará, y entonces un gasto fijo se{" "}
                  <strong>deja a 0 €</strong> (sigue en la lista de los meses siguientes) y un gasto variable o una
                  aportación se <strong>borra</strong>, tras confirmarlo. Así el ajuste no sale descuadrado por un cargo que
                  aún no ha llegado. «Ahora no» vuelve sin cerrar. En el mes en curso no se pregunta: lo pendiente aún es
                  normal.
                </li>
                <li>
                  Escribe el <strong>dinero real</strong> que tiene cada uno al final del mes. La app lo compara con el
                  balance calculado y crea una <strong>transacción de ajuste</strong> por persona con la diferencia, para
                  que las cuentas cuadren.
                </li>
                <li>
                  Si el mes tiene <strong>cuenta compartida</strong>, se pide lo que queda en la cuenta de cada uno y el{" "}
                  <strong>saldo de la compartida</strong> en el banco (con lo acumulado de otros meses). La app lo compara
                  con su saldo calculado y, si no cuadra, crea un ajuste <strong>a medias</strong>.
                </li>
                <li>
                  Si ya está cerrado, el botón pasa a «Actualizar mes actual»: los ajustes se recalculan y{" "}
                  <strong>sustituyen</strong> a los anteriores.
                </li>
                <li>
                  El saldo de la compartida arrastra los cierres anteriores: si actualizas el del mes anterior con el
                  actual ya cerrado, la app avisa de que actualices después también el actual.
                </li>
                <li>
                  Si un mes ha terminado y está sin cerrar, un aviso arriba te lo recuerda con un botón para cerrarlo: hasta
                  entonces su ahorro no cuenta en las metas.
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
                  Cada informe tiene el resumen del mes; los gráficos de ingresos por persona, de gastos fijos y
                  variables y de <strong>gastos por categoría</strong> (con tres vistas: Ambos, los compartidos, y los
                  individuales de cada persona); el detalle de cada uno (balance calculado, dinero real y ajuste) y unas
                  estadísticas.
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          {/* 8. Configuración */}
          <AccordionItem value="configuracion">
            <SectionTrigger>8. Configuración</SectionTrigger>
            <AccordionContent className="space-y-4 text-muted-foreground">
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>Nombres:</strong> cambia «Persona 1» y «Persona 2» por vuestros nombres.
                </li>
                <li>
                  <strong>Modo individual:</strong> oculta la segunda persona (sin reparto, y el cierre pide un solo
                  dinero real). No borra nada y se puede desactivar cuando quieras.
                </li>
                <li>
                  <strong>Categorías:</strong> tienen su propio botón (la etiqueta, en los botones de abajo a la
                  izquierda). Es la lista que sale al añadir una transacción, en orden alfabético: renombra en la propia
                  fila, quita con la papelera o añade una nueva (de gasto o de ingreso). Al quitar una, sus transacciones
                  pasan a «Sin categoría». Los cambios se aplican al pulsar «Guardar categorías».
                </li>
                <li>
                  En el ordenador, al pasar el ratón por los botones de abajo a la izquierda, cada uno muestra su nombre.
                </li>
                <li>
                  <strong>Exportar datos:</strong> descarga una copia en JSON, sin cifrar, con todas las transacciones,
                  informes y la configuración.
                </li>
                <li>
                  <strong>Importar datos:</strong> restaura una copia exportada antes. Sustituye todos los datos
                  actuales (en la nube, los de los dos miembros), así que pide confirmación.
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
            <SectionTrigger>9. Cuenta, nube y privacidad</SectionTrigger>
            <AccordionContent className="space-y-4 text-muted-foreground">
              <p>
                Para usar 2Budget hace falta una <strong>cuenta con el email verificado</strong>. El botón de la nube,
                arriba a la derecha, abre la ventana de <strong className="text-primary">Cuenta</strong>: desde ahí puedes
                cambiar el email o eliminar la cuenta. Si olvidas la contraseña de la cuenta, recupérala desde la
                pantalla de inicio de sesión.
              </p>
              <Subtitle>Entrar con Google</Subtitle>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  En la pantalla de inicio de sesión, el botón <strong>Google</strong> entra con tu cuenta de Google. La
                  primera vez se pregunta si ya tienes una cuenta de 2Budget: si es así, entra con tu email y contraseña
                  y Google quedará unido a esa cuenta, con tu hogar y tus datos.
                </li>
                <li>
                  También puedes unirlo desde Cuenta → «Vincular con Google», y quitarlo si tu cuenta tiene contraseña.
                  La contraseña maestra se sigue pidiendo igual: Google solo sustituye a la contraseña de entrar.
                </li>
                <li>
                  En el iPhone, con la app instalada, la ventana de Google a veces no vuelve a la app. Si te pasa, entra
                  con tu email y contraseña (o vincula Google desde Safari o desde el ordenador).
                </li>
              </ul>
              <Subtitle>Instalar la app</Subtitle>
              <ul className="list-disc list-inside space-y-1">
                <li>En Android y en el ordenador, Chrome ofrece «Instalar app» en la barra de direcciones o en su menú.</li>
                <li>
                  En iPhone y iPad no aparece ningún aviso: en Safari, pulsa Compartir (el cuadrado con la flecha hacia
                  arriba) y luego «Añadir a pantalla de inicio».
                </li>
              </ul>
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
              <Subtitle>Privacidad en pareja</Subtitle>
              <p>
                En Cuenta &gt; Tu hogar, cada uno puede activar <strong>«Ocultar mis transacciones individuales a mi
                pareja»</strong>. Tu pareja verá *** en lugar del importe de las transacciones que son 100% tuyas, y no
                podrá editarlas. Las aportaciones a la cuenta compartida se ven siempre, porque es dinero de los dos.
                Los totales, los balances y los informes no cambian. Solo se oculta en la app: los datos
                siguen compartidos y cifrados con la misma clave del hogar.
              </p>
              <Subtitle>Cifrado y contraseña maestra</Subtitle>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Los datos se <strong>cifran en tu dispositivo</strong> antes de subirlos, con una{" "}
                  <strong>contraseña maestra</strong> distinta de la de la cuenta. Nadie más puede leerlos, ni siquiera el
                  administrador de la app. Cada miembro del hogar tiene la suya.
                </li>
                <li>
                  La contraseña maestra <strong>no se guarda en ningún sitio</strong>. Al escribirla, el dispositivo
                  guarda la llave del hogar durante <strong>3 días</strong>; después la vuelve a pedir. También se pide
                  una vez al mes, para que no se olvide.
                </li>
                <li>
                  Al crear el hogar o unirte se muestra un <strong>código de recuperación</strong>: guárdalo en un lugar
                  seguro. Con él puedes elegir una contraseña maestra nueva si la olvidas. Desde Cuenta puedes cambiar la
                  contraseña maestra o generar un código nuevo.
                </li>
              </ul>
              <Subtitle>Seguridad: lo que conviene saber</Subtitle>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Mientras la llave del hogar está guardada (hasta 3 días), quien tenga tu móvil u ordenador
                  desbloqueado puede ver los datos. Lo que más protege es el bloqueo del propio dispositivo; en uno
                  prestado o compartido, cierra sesión al terminar.
                </li>
                <li>
                  La privacidad en pareja solo oculta importes en la pantalla: los datos están en los dispositivos de
                  los dos y una exportación incluye los importes ocultos.
                </li>
                <li>
                  Si un miembro sale del hogar, deja de poder leerlo, pero la llave del hogar no cambia: una copia de
                  los datos cifrados que hubiera guardado antes seguiría pudiendo abrirla.
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          {/* 10. Metas de ahorro */}
          <AccordionItem value="metas">
            <SectionTrigger>10. Metas de ahorro</SectionTrigger>
            <AccordionContent className="space-y-4 text-muted-foreground">
              <p>
                Pulsa el <strong>Total acumulado</strong> para abrir las metas: un viaje, el coche, un fondo para
                imprevistos... Cada uno ve las suyas, que salen de su cuenta, y las <strong>compartidas</strong>, que salen
                de la cuenta compartida. En modo individual solo están las tuyas.
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Solo se reparte el dinero de los <strong>meses terminados y con el informe cerrado</strong>: octubre se
                  puede repartir desde el 1 de noviembre, una vez cerrado. Lo que no asignas queda en{" "}
                  <strong>Sin asignar</strong>.
                </li>
                <li>
                  Cada meta tiene un objetivo opcional con su barra de progreso. Quitar dinero de una meta o borrarla lo
                  devuelve a Sin asignar.
                </li>
                <li>
                  Si el mes en curso va en <strong>negativo</strong> con lo ya pagado, primero se gasta lo sin asignar y
                  luego baja la última meta a la que añadiste dinero, después la anterior. No se pierde nada: si el mes
                  se recupera, las metas vuelven a su cifra. La ventana avisa también de lo que bajarían si se cumple lo
                  previsto.
                </li>
                <li>
                  Ejemplo: tienes 1000 € de meses cerrados, 400 € en «Viaje» y 350 € en «Coche» (la última a la que
                  añadiste), y 250 € sin asignar. Si octubre va en −300 €, se gastan los 250 € y «Coche» baja a 300 €.
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          {/* 11. Presupuestos */}
          <AccordionItem value="presupuestos">
            <SectionTrigger>11. Presupuestos por categoría</SectionTrigger>
            <AccordionContent className="space-y-4 text-muted-foreground">
              <p>
                En la tarjeta <strong>Presupuestos</strong> del lateral puedes poner un límite al mes a cada categoría de
                gasto (por ejemplo, 400 € de supermercado) en el mes que estás viendo, también con los gastos pendientes
                de pagar.
              </p>
              <p>
                En pareja hay dos tipos: <strong>los tuyos</strong>, que cuentan tus gastos individuales (los 100 % tuyos), y
                los <strong>compartidos</strong>, que cuentan los gastos «Ambos» enteros. Tu parte de un gasto compartido no
                cuenta en tus presupuestos: ya cuenta en el compartido. Cada uno ve los suyos y los compartidos. En modo
                individual solo están los tuyos y cuentan todos los gastos.
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>La barra es verde por debajo del 80 %, ámbar hasta el límite y roja si te has pasado.</li>
                <li>Al apuntar un gasto que lleva su categoría al 80 % o por encima del límite, la app te avisa.</li>
                <li>Los límites se cambian en la ventana, con «Editar límites»; sin importe, la categoría no tiene presupuesto.</li>
                <li>
                  Al editar, cada categoría propone un <strong>recomendado</strong>: la media de lo gastado en los 3 meses
                  anteriores (solo los que tuvieron gasto en ella) o, si no hay, lo gastado este mes, redondeado al euro.
                  «Usar» lo pone como límite.
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          {/* 12. Resumen anual */}
          <AccordionItem value="resumen-anual">
            <SectionTrigger>12. Resumen anual</SectionTrigger>
            <AccordionContent className="space-y-4 text-muted-foreground">
              <p>
                En la tarjeta <strong>Informes</strong>, el botón <strong>Año</strong> abre el resumen de un año: ingresos,
                gastos y ahorro, cada persona (con su parte de lo compartido y lo que envió a la compartida), los gastos
                e ingresos por categoría y cada mes. Los ajustes de cierre salen como su propia fila.
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>Excel (CSV)</strong> descarga el resumen para abrirlo en Excel o en Hojas de cálculo.
                </li>
                <li>
                  <strong>Imprimir o PDF</strong> abre el resumen solo, listo para imprimir o guardar como PDF desde el
                  diálogo de impresión. Si el navegador no deja abrir la ventana, se descarga como página.
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          {/* 13. Eventos */}
          <AccordionItem value="eventos">
            <SectionTrigger>13. Eventos y etiquetas</SectionTrigger>
            <AccordionContent className="space-y-4 text-muted-foreground">
              <p>
                Al apuntar una transacción puedes ponerle una <strong>etiqueta</strong> (opcional): por ejemplo «Lisboa
                2026». Pon la misma a todos los gastos de ese viaje u ocasión, sean individuales o compartidos: la cena
                de los dos y el desayuno al que invitas tú van juntos.
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Una etiqueta por transacción. Al escribir te sugiere las que ya existen.</li>
                <li>Los gastos fijos y las aportaciones no llevan etiqueta.</li>
                <li>
                  La tarjeta <strong>Eventos</strong> enseña cada uno con su total, sus fechas y cuánto puso cada uno (lo
                  suyo más su parte de lo compartido).
                </li>
                <li>
                  Al pulsar un evento, o la etiqueta de una transacción, la lista enseña todos sus movimientos de todos
                  los meses. La «x» del filtro vuelve a la lista normal.
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          {/* 14. Acceso rápido */}
          <AccordionItem value="acceso-rapido">
            <SectionTrigger>14. Acceso rápido</SectionTrigger>
            <AccordionContent className="space-y-4 text-muted-foreground">
              <p>
                Con la app instalada puedes apuntar un gasto sin pasar por la pantalla principal: se abre directamente
                el formulario de <strong>Nueva transacción</strong>.
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>Android:</strong> mantén pulsado el icono de 2Budget y elige <strong>Nueva transacción</strong>.
                  También puedes arrastrar esa opción a la pantalla de inicio.
                </li>
                <li>
                  <strong>Ordenador:</strong> con la app instalada, clic derecho en su icono de la barra de tareas o del
                  Dock.
                </li>
                <li>
                  <strong>iPhone:</strong> no tiene accesos rápidos para apps web, pero la app <strong>Atajos</strong> puede
                  abrir la dirección <strong className="break-all">https://caldeix.github.io/2budget/?accion=nueva</strong> y
                  ponerla en la pantalla de inicio o en el botón de acción.
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          {/* 15. Tendencias */}
          <AccordionItem value="tendencias">
            <SectionTrigger>15. Tendencias</SectionTrigger>
            <AccordionContent className="space-y-4 text-muted-foreground">
              <p>
                Bajo el resumen del mes aparece una franja cuando alguna categoría se aparta mucho de lo normal: por
                ejemplo, «Supermercado (compartido): 380 € este mes, ya un 40 % más que lo normal (270 €)».
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Lo normal es la media de los 3 meses anteriores en que esa categoría tuvo gasto.</li>
                <li>Solo avisa si la diferencia es de al menos un 25 % y 20 €, y enseña como mucho tres.</li>
                <li>
                  En el mes en curso solo avisa de lo que ya va por encima; en un mes terminado, también de lo que bajó.
                </li>
                <li>En pareja, lo tuyo y lo compartido por separado, como en los presupuestos.</li>
                <li>La «x» la oculta para ese mes; si aparece una tendencia nueva, vuelve a salir.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          {/* 16. Búsqueda avanzada */}
          <AccordionItem value="busqueda-avanzada">
            <SectionTrigger>16. Búsqueda avanzada</SectionTrigger>
            <AccordionContent className="space-y-4 text-muted-foreground">
              <p>
                Bajo los filtros de la lista, <strong>Más filtros</strong> abre la búsqueda por fechas, importes y evento.
                Con cualquiera de ellos, la lista busca en <strong>todos los meses</strong>, como al escribir en el
                buscador, y los totales de arriba son los de lo encontrado.
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>Desde</strong> y <strong>Hasta</strong>: las dos fechas cuentan. Puedes poner solo una.
                </li>
                <li>
                  <strong>Importe mínimo</strong> y <strong>máximo</strong>: por ejemplo, todo lo de más de 100 €.
                </li>
                <li>
                  <strong>Evento</strong>: todo lo de una etiqueta, como al pulsarla en la lista.
                </li>
                <li>Se combinan con el texto, el tipo, la categoría y el pago.</li>
                <li>
                  «Quitar fechas e importes» los borra de una vez. Si tu pareja te oculta sus importes, esos
                  movimientos no salen al buscar por importe.
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </Modal>
  )
}
