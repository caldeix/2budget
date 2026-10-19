/**
 * @file components/tour-steps.ts
 * @description Pasos del tour de bienvenida (ver `AppTour`). Cada uno apunta a un elemento con
 *              `data-tour="…"`. Algunos abren una ventana (`open`) para enseñarla por dentro: el
 *              formulario de nueva transacción y el cierre de mes. En móvil, los botones
 *              secundarios van dentro del menú "⋮", así que se explican en un solo paso.
 *              En pareja, los datos de ejemplo llevan aportaciones a la cuenta compartida (ver
 *              `lib/tour-data.ts`) y los pasos la explican; en modo individual no hay compartida.
 */

import type { TourStep } from "@/components/app-tour"

interface TourStepsOptions {
  person1Name: string
  person2Name: string
  singleMode: boolean
  /** Si la app usa cuenta y nube (si no, no hay botón de cuenta que enseñar). */
  cloud: boolean
  /** Pantalla de PC (desde 640 px); si no, móvil. */
  isDesktop: boolean
}

export function getTourSteps({ person1Name, person2Name, singleMode, cloud, isDesktop }: TourStepsOptions): TourStep[] {
  const steps: (TourStep | false)[] = [
    // ---- Resumen
    {
      target: "summary",
      title: "¡Bienvenido a 2Budget!",
      text:
        "Te enseñamos la app paso a paso, con datos de ejemplo (los tuyos no se tocan). Arriba tienes el resumen del mes: balance, ingresos y gastos." +
        (isDesktop ? "" : " Desliza las tarjetas para verlas todas."),
    },
    {
      target: "card-expenses",
      title: "Hoy y Previsto",
      text: singleMode
        ? "«Hoy» cuenta solo los gastos ya marcados como pagados; «Previsto» los cuenta todos, como acabará el mes. Si no queda nada por pagar, verás una sola cifra."
        : "«Hoy» cuenta solo los gastos ya pagados y las aportaciones ya enviadas; «Previsto» lo cuenta todo, como acabará el mes. Si no queda nada pendiente, verás una sola cifra.",
    },
    !singleMode && {
      target: "card-individual",
      title: "Balance por cuenta",
      text: `Lo que tiene ${person1Name} en su cuenta y lo que tiene ${person2Name} en la suya (lo que veríais en el banco). Debajo, en pequeño, el total de cada uno: su cuenta más su parte en la compartida.`,
    },
    !singleMode && {
      target: "card-individual",
      title: "Cuenta compartida",
      text: "Si enviáis dinero a una cuenta de los dos, apúntalo como «aportación»: no es un gasto, el dinero sigue siendo de quien lo envía. Todo lo compartido sale de ella, y la fila «Compartida» dice cuánto queda y de quién es. En «Hoy» la compartida tiene más porque aún quedan gastos compartidos por pagar.",
    },
    // ---- Lateral
    {
      target: "cumulative",
      title: "Total acumulado",
      text: singleMode
        ? "La suma de todos los meses desde el principio: lo ahorrado en total. No cuenta los gastos no computables."
        : "La suma de todos los meses desde el principio: lo ahorrado en total, en la cuenta de cada uno y en la compartida (lo que sobra en ella se queda ahí). No cuenta los gastos no computables.",
    },
    {
      target: "cumulative",
      title: "Metas de ahorro",
      text: singleMode
        ? "Pulsa el Total acumulado para repartir lo ahorrado en metas (un viaje, el coche...). Solo se reparte el dinero de los meses terminados y cerrados; lo que no asignes queda «Sin asignar». Si el mes en curso va en negativo, baja primero la última meta a la que añadiste dinero."
        : "Pulsa el Total acumulado para repartir lo ahorrado en metas: las tuyas, sobre tu cuenta, y las compartidas, sobre la compartida. Solo se reparte el dinero de los meses terminados y cerrados; lo que no asignes queda «Sin asignar». Si el mes en curso va en negativo, baja primero la última meta a la que añadiste dinero.",
    },
    {
      target: "evolution",
      title: "Evolución",
      text: singleMode
        ? "Ingresos y gastos de los últimos seis meses de un vistazo. Pulsa la tarjeta para ver el año completo, con el ahorro de cada mes y un selector de año."
        : "Ingresos y gastos de los últimos seis meses de un vistazo. Pulsa la tarjeta para ver el año completo, con el ahorro de cada mes, un selector de año y otro de cuenta: la tuya o la compartida.",
    },
    {
      target: "budgets",
      title: "Presupuestos",
      text: singleMode
        ? "Pon un límite al mes a las categorías que quieras vigilar y verás cuánto llevas del mes que estás viendo: verde, bien; ámbar, cerca del límite; rojo, pasado. Al apuntar un gasto que te acerca al límite, te avisa."
        : "Pon un límite al mes a las categorías que quieras vigilar: los tuyos cuentan tus gastos individuales y los compartidos, los gastos «Ambos». Verde, bien; ámbar, cerca del límite; rojo, pasado. Al apuntar un gasto que te acerca al límite, te avisa.",
    },
    {
      target: "reports",
      title: "Informes",
      text: "Aquí se ven los tres últimos informes. Cada uno guarda el resumen del mes, gráficos por persona, por tipo y por categoría, y los ajustes. Si cerraste un mes sin querer, desde el último informe puedes borrarlo.",
    },
    {
      target: "reports-all",
      title: "Todos los informes",
      text: "Abre la lista completa, con un filtro por año.",
    },
    {
      target: "annual-summary",
      title: "Resumen anual",
      text: "Todo un año de un vistazo: totales, por persona, por categoría y por mes. Se puede descargar para Excel o imprimir y guardar en PDF (por ejemplo, para la renta).",
    },
    // ---- Lista
    {
      target: "month-nav",
      title: "Cambiar de mes",
      text: isDesktop
        ? "Muévete entre meses con las flechas, o pulsa el nombre del mes para ir a cualquiera. Un mes pasado ya cerrado es de solo lectura."
        : "Muévete entre meses con las flechas o deslizando aquí; pulsa el nombre del mes para ir a cualquiera. Un mes pasado ya cerrado es de solo lectura.",
    },
    {
      target: "filters",
      title: "Buscar y filtrar",
      text: "Mientras escribes en el buscador se busca en todos los meses (las fechas de otros meses salen en dorado). Debajo, filtros por tipo, por categoría y por pagados o pendientes; las cajas de totales suman solo lo filtrado.",
    },
    {
      target: "tx-row",
      title: "Tus movimientos",
      text: isDesktop
        ? "Cada transacción con su fecha, nombre, tipo y categoría, a quién pertenece e importe. A la derecha, los botones para editarla o borrarla." +
          (singleMode ? "" : " Las aportaciones llevan una flecha: no suman ni restan, solo cambian el dinero de cuenta.")
        : "Cada transacción con su fecha, importe, tipo y categoría. Deslízala a la izquierda para editarla o borrarla." +
          (singleMode ? "" : " Las aportaciones llevan una flecha: no suman ni restan."),
    },
    {
      target: "paid",
      title: "Marcar como pagado",
      text: singleMode
        ? "Pulsa el círculo al pagar un gasto: cuenta para la cifra de «Hoy». Al empezar un mes nuevo, la app te pregunta por los que hayan quedado pendientes."
        : "Pulsa el círculo al pagar un gasto o al enviar una aportación: cuenta para la cifra de «Hoy». Al empezar un mes nuevo, la app te pregunta por lo que haya quedado pendiente.",
    },
    // ---- Nueva transacción, por dentro
    {
      target: "fab-add",
      title: "Añadir",
      text: singleMode
        ? "Con este botón creas un ingreso o un gasto. Vamos a verlo por dentro."
        : "Con este botón creas un ingreso, un gasto o una aportación a la compartida. Vamos a verlo por dentro.",
    },
    {
      target: "form-type",
      open: "transaction-form",
      title: "Tipo y categoría",
      text:
        "El tipo es gasto variable, gasto fijo (los que se copian de un mes a otro) o ingreso" +
        (singleMode ? "" : ", o aportación a la compartida (lo que cada uno envía a la cuenta de los dos)") +
        ". La categoría (Supermercado, Casa, Ocio…) sirve para ver en qué se va el dinero; la lista se cambia en Configuración.",
    },
    {
      target: "form-name",
      open: "transaction-form",
      title: "Nombre",
      text: "Al escribir te sugiere los nombres que ya has usado. Al elegir uno, se rellena sola la categoría de la última vez.",
    },
    {
      target: "form-amount-date",
      open: "transaction-form",
      title: "Importe y fecha",
      text: "El importe admite dos decimales. La fecha se elige en el calendario: los meses ya cerrados quedan bloqueados.",
    },
    !singleMode && {
      target: "form-share",
      open: "transaction-form",
      title: "Reparto",
      text: `El deslizador dice qué parte es de cada uno. Al 100% para ${person1Name} o para ${person2Name}, la transacción es solo suya; cualquier otro reparto es compartido y sale de la cuenta compartida. En una aportación, en vez del deslizador, se elige quién aporta.`,
    },
    // ---- Cierre de mes, por dentro
    {
      target: "close-real-money",
      open: "close-month",
      title: "Cerrar el mes",
      text: singleMode
        ? "Al acabar el mes, escribe el dinero real que tienes. La app lo compara con el balance calculado."
        : "Al acabar el mes, escribe lo que le queda a cada uno en su cuenta y el saldo de la compartida en el banco. La app lo compara con lo calculado.",
    },
    {
      target: "close-adjustments",
      open: "close-month",
      title: "Ajustes de cierre",
      text:
        "La diferencia se convierte en una transacción de ajuste por persona" +
        (singleMode ? "" : " (y en la compartida, un ajuste a medias)") +
        ", para que las cuentas cuadren, y se guarda el informe. El mes queda cerrado; si hace falta, el del mes anterior se puede actualizar.",
    },
    // ---- Botones flotantes y cuenta
    isDesktop && {
      target: "fab-copy",
      title: singleMode ? "Copiar fijos e ingresos" : "Copiar fijos, ingresos y aportaciones",
      text: singleMode
        ? "Copia los gastos fijos y los ingresos del mes anterior al que estás viendo. Antes puedes revisar los importes uno a uno."
        : "Copia los gastos fijos, los ingresos y las aportaciones del mes anterior al que estás viendo. Antes puedes revisar los importes uno a uno.",
    },
    isDesktop && {
      target: "fab-theme",
      title: "Modo claro u oscuro",
      text: "Cambia el aspecto de la app; se recuerda.",
    },
    isDesktop && {
      target: "fab-settings",
      title: "Configuración",
      text: "Nombres, modo individual y las copias de seguridad (exportar e importar).",
    },
    isDesktop && {
      target: "fab-categories",
      title: "Categorías",
      text: "La lista de categorías de gastos e ingresos: añade, renombra o quita las que quieras.",
    },
    cloud && {
      target: "account",
      title: "Tu cuenta",
      text: singleMode
        ? "Tu cuenta y tu espacio en la nube: los datos se guardan cifrados y se sincronizan entre tus dispositivos."
        : "Tu cuenta y vuestro hogar: los datos se guardan cifrados en la nube y se sincronizan entre vuestros dispositivos. Aquí también puedes ocultar a tu pareja el importe de tus transacciones individuales.",
    },
    isDesktop
      ? {
          target: "fab-info",
          title: "Ayuda",
          text: "Si tienes dudas, aquí está todo explicado y puedes repetir este tour. Y si quieres la app en el móvil como una app más, instálala desde el menú del navegador. ¡Ya puedes empezar!",
        }
      : {
          target: "fab-menu",
          title: "Más opciones",
          text:
            (singleMode ? "Aquí están copiar fijos e ingresos" : "Aquí están copiar fijos, ingresos y aportaciones") +
            ", el modo claro u oscuro, la configuración, las categorías y la ayuda. Desde el menú del navegador puedes instalar 2Budget como una app más. ¡Ya puedes empezar!",
        },
  ]
  return steps.filter((step): step is TourStep => step !== false)
}
