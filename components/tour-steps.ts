/**
 * @file components/tour-steps.ts
 * @description Pasos del tour de bienvenida (ver `AppTour`). Cada uno apunta a un elemento con
 *              `data-tour="…"`. Algunos abren una ventana (`open`) para enseñarla por dentro: el
 *              formulario de nueva transacción y el cierre de mes. En móvil, los botones
 *              secundarios van dentro del menú "⋮", así que se explican en un solo paso.
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
      text: "«Hoy» cuenta solo los gastos ya marcados como pagados; «Previsto» los cuenta todos, como acabará el mes. Si no queda nada por pagar, verás una sola cifra.",
    },
    !singleMode && {
      target: "card-individual",
      title: "Balance por persona",
      text: `Lo que le queda a ${person1Name} y a ${person2Name}: sus ingresos menos su parte de cada gasto, según el reparto.`,
    },
    // ---- Lateral
    {
      target: "cumulative",
      title: "Total acumulado",
      text: "La suma de todos los meses desde el principio: lo ahorrado en total y por persona. No cuenta los gastos no computables.",
    },
    {
      target: "evolution",
      title: "Evolución",
      text: "Ingresos y gastos de los últimos seis meses de un vistazo. Pulsa la tarjeta para ver el año completo, con el ahorro de cada mes y un selector de año.",
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
        ? "Cada transacción con su fecha, nombre, tipo y categoría, a quién pertenece e importe. A la derecha, los botones para editarla o borrarla."
        : "Cada transacción con su fecha, importe, tipo y categoría. Deslízala a la izquierda para editarla o borrarla.",
    },
    {
      target: "paid",
      title: "Marcar como pagado",
      text: "Pulsa el círculo al pagar un gasto: cuenta para la cifra de «Hoy». Al empezar un mes nuevo, la app te pregunta por los que hayan quedado pendientes.",
    },
    // ---- Nueva transacción, por dentro
    {
      target: "fab-add",
      title: "Añadir",
      text: "Con este botón creas un ingreso o un gasto. Vamos a verlo por dentro.",
    },
    {
      target: "form-type",
      open: "transaction-form",
      title: "Tipo y categoría",
      text: "El tipo es gasto variable, gasto fijo (los que se copian de un mes a otro) o ingreso. La categoría (Supermercado, Casa, Ocio…) sirve para ver en qué se va el dinero; la lista se cambia en Configuración.",
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
      text: `El deslizador dice qué parte es de cada uno. Al 100% para ${person1Name} o para ${person2Name}, la transacción es solo suya; cualquier otro reparto es compartido.`,
    },
    // ---- Cierre de mes, por dentro
    {
      target: "close-real-money",
      open: "close-month",
      title: "Cerrar el mes",
      text: "Al acabar el mes, escribe el dinero real que tiene cada uno. La app lo compara con el balance calculado.",
    },
    {
      target: "close-adjustments",
      open: "close-month",
      title: "Ajustes de cierre",
      text: "La diferencia se convierte en una transacción de ajuste por persona, para que las cuentas cuadren, y se guarda el informe. El mes queda cerrado; si hace falta, el del mes anterior se puede actualizar.",
    },
    // ---- Botones flotantes y cuenta
    isDesktop && {
      target: "fab-copy",
      title: "Copiar fijos e ingresos",
      text: "Copia los gastos fijos y los ingresos del mes anterior al que estás viendo. Antes puedes revisar los importes uno a uno.",
    },
    isDesktop && {
      target: "fab-theme",
      title: "Modo claro u oscuro",
      text: "Cambia el aspecto de la app; se recuerda.",
    },
    isDesktop && {
      target: "fab-settings",
      title: "Configuración",
      text: "Nombres, modo individual, la lista de categorías y las copias de seguridad (exportar e importar).",
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
          text: "Aquí están copiar fijos e ingresos, el modo claro u oscuro, la configuración y la ayuda. Desde el menú del navegador puedes instalar 2Budget como una app más. ¡Ya puedes empezar!",
        },
  ]
  return steps.filter((step): step is TourStep => step !== false)
}
