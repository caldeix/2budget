/**
 * @file components/tour-steps.ts
 * @description Pasos del tour de bienvenida (ver `AppTour`). Cada uno apunta a un elemento con
 *              `data-tour="…"`. En móvil, los botones secundarios van dentro del menú "⋮", así
 *              que se explican en un solo paso.
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
    {
      target: "summary",
      title: "¡Bienvenido a 2Budget!",
      text:
        "Te enseñamos la app en unos pasos, con datos de ejemplo (los tuyos no se tocan). Arriba tienes el resumen del mes: balance, ingresos y gastos." +
        (isDesktop ? "" : " Desliza las tarjetas para verlas todas."),
    },
    {
      target: "card-expenses",
      title: "Hoy y Previsto",
      text: "«Hoy» cuenta solo los gastos que ya están marcados como pagados; «Previsto» los cuenta todos, como acabará el mes.",
    },
    !singleMode && {
      target: "card-individual",
      title: "Balance por persona",
      text: `Lo que le queda a ${person1Name} y a ${person2Name} según quién paga cada cosa y en qué porcentaje.`,
    },
    {
      target: "cumulative",
      title: "Total acumulado",
      text: "La suma de todos los meses: lo ahorrado desde el principio. No cuenta los gastos no computables.",
    },
    {
      target: "reports",
      title: "Informes",
      text: "Al acabar el mes, ciérralo con el dinero real que hay: la app crea los ajustes para cuadrar y guarda un informe con gráficos. Aquí se ven los 3 últimos.",
    },
    {
      target: "reports-all",
      title: "Todos los informes",
      text: "Abre la lista completa de informes, con un filtro por año.",
    },
    {
      target: "month-nav",
      title: "Cambiar de mes",
      text: isDesktop
        ? "Muévete entre meses con las flechas, o pulsa el nombre del mes para ir a cualquiera."
        : "Muévete entre meses con las flechas o deslizando aquí; pulsa el nombre del mes para ir a cualquiera.",
    },
    {
      target: "filters",
      title: "Buscar y filtrar",
      text: "Busca por nombre o filtra por tipo y categoría. Debajo verás los totales de lo filtrado.",
    },
    {
      target: "tx-row",
      title: "Tus movimientos",
      text: isDesktop
        ? "Cada transacción con su fecha, categoría, a quién pertenece e importe. A la derecha, los botones para editarla o borrarla."
        : "Cada transacción con su fecha, importe y categoría. Deslízala a la izquierda para editarla o borrarla.",
    },
    {
      target: "paid",
      title: "Marcar como pagado",
      text: "Pulsa el círculo al pagar un gasto: cuenta para la cifra de «Hoy». Al empezar el mes siguiente, la app pregunta por los que hayan quedado pendientes.",
    },
    {
      target: "fab-add",
      title: "Añadir",
      text: "Crea un ingreso o un gasto. Al escribir el nombre te sugiere los que ya has usado.",
    },
    isDesktop && {
      target: "fab-copy",
      title: "Copiar fijos e ingresos",
      text: "Copia los gastos fijos y los ingresos del mes anterior al que estás viendo. Antes puedes revisar sus importes.",
    },
    isDesktop && {
      target: "fab-theme",
      title: "Modo claro u oscuro",
      text: "Cambia el aspecto de la app.",
    },
    isDesktop && {
      target: "fab-settings",
      title: "Configuración",
      text: "Nombres, modo individual y copias de seguridad (exportar e importar).",
    },
    cloud && {
      target: "account",
      title: "Tu cuenta",
      text: "Tu cuenta y tu hogar: los datos se guardan cifrados en la nube y se sincronizan entre vuestros dispositivos.",
    },
    isDesktop
      ? {
          target: "fab-info",
          title: "Ayuda",
          text: "Si tienes alguna duda, aquí está todo explicado, y puedes repetir este tour. ¡Ya puedes empezar!",
        }
      : {
          target: "fab-menu",
          title: "Más opciones",
          text: "Aquí están copiar fijos e ingresos, el modo claro u oscuro, la configuración y la ayuda, por si tienes dudas. ¡Ya puedes empezar!",
        },
  ]
  return steps.filter((step): step is TourStep => step !== false)
}
