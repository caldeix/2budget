/**
 * @file components/transactions-table.tsx
 * @description Este archivo define el componente `TransactionsTable`, que muestra
 *              una lista de transacciones con funcionalidades de búsqueda, filtrado,
 *              ordenación y carga infinita (scroll).
 *              Adapta su diseño para escritorio (tabla) y móvil (tarjetas con swipe para acciones).
 *              Es un Client Component (`"use client"`) debido al uso de estados, refs y eventos táctiles.
 */

"use client"

import React from "react"

import { Input } from "@/components/ui/input" // Componente de input de Shadcn UI.

import { useState, useMemo, useRef, useEffect } from "react" // Hooks de React.
import type { Transaction } from "@/types" // Tipo de transacción.
import { formatCurrency, cn, getPreviousMonthYear, getNextMonthYear } from "@/lib/utils" // Utilidades.
import { aggregateTransactions, isClosingAdjustment, isContribution, isSettled } from "@/lib/aggregations" // Núcleo único de agregación.
import { HIDDEN_AMOUNT } from "@/lib/privacy" // Importe oculto por la pareja.
import { UNCATEGORIZED_LABEL, type Category } from "@/lib/categories" // Categorías.
import { subtractMoney } from "@/lib/money" // Resta monetaria exacta.
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  ArrowRightLeft,
  X,
  SlidersHorizontal,
} from "lucide-react" // Iconos.
import { hasTag, tagsInUse } from "@/lib/tags" // Etiquetas de evento.
import { normalizeName } from "@/lib/categories" // Comparar nombres sin mayúsculas ni tildes.
import {
  EMPTY_ADVANCED_FILTERS,
  activeAdvancedCount,
  matchesAdvancedFilters,
  type AdvancedFilters,
} from "@/lib/search" // Búsqueda avanzada.
import { TransactionMonthNavigator } from "@/components/transaction-month-navigator" // Navegador de mes.
import { TransactionRowDesktop, TransactionRowMobile, type RowContext } from "@/components/transaction-rows" // Filas de PC y móvil.

/**
 * @interface TransactionsTableProps
 * @description Define las propiedades que acepta el componente `TransactionsTable`.
 * @property {Transaction[]} transactions - La lista COMPLETA de transacciones para el mes seleccionado.
 * @property {string} person1Name - Nombre de la Persona 1.
 * @property {string} person2Name - Nombre de la Persona 2.
 * @property {(transaction: Transaction) => void} onEdit - Función de callback para editar una transacción.
 * @property {(id: string) => void} onDelete - Función de callback para eliminar una transacción.
 * @property {number} selectedMonth - El mes actualmente seleccionado.
 * @property {number} selectedYear - El año actualmente seleccionado.
 * @property {(month: number) => void} onMonthChange - Función de callback para cambiar el mes.
 * @property {(year: number) => void} onYearChange - Función de callback para cambiar el año.
 * @property {number} transactionsToShowCount - Número de transacciones a mostrar actualmente (para carga infinita).
 * @property {() => void} onLoadMore - Función de callback para cargar más transacciones.
 * @property {boolean} hasMore - Indica si hay más transacciones disponibles para cargar.
 * @property {boolean} [singleMode] - Modo individual: oculta la columna de propietario.
 * @property {boolean} [locked] - Mes pasado ya cerrado con informe: solo lectura (sin acciones).
 * @property {Transaction[]} [allTransactions] - Todas las transacciones: con texto en el buscador se
 *           busca en todos los meses, no solo en el seleccionado.
 * @property {(t: Transaction) => boolean} [isTransactionLocked] - Si la transacción es de un mes cerrado
 *           (solo lectura), para las filas de otros meses al buscar.
 * @property {(t: Transaction) => boolean} [isAmountHidden] - Si el importe está oculto por la pareja (ver `lib/privacy.ts`).
 * @property {Category[]} categories - Categorías del hogar, para mostrarlas y filtrar.
 */
interface TransactionsTableProps {
  transactions: Transaction[]
  person1Name: string
  person2Name: string
  onEdit: (transaction: Transaction) => void
  onDelete: (id: string) => void
  onTogglePaid: (id: string, paid: boolean) => void
  selectedMonth: number
  selectedYear: number
  onMonthChange: (month: number) => void
  onYearChange: (year: number) => void
  transactionsToShowCount: number
  onLoadMore: () => void
  hasMore: boolean
  singleMode?: boolean
  locked?: boolean
  allTransactions?: Transaction[]
  isTransactionLocked?: (t: Transaction) => boolean
  isAmountHidden?: (t: Transaction) => boolean
  categories: Category[]
  /** Evento por el que se filtra (3.10.0): con él, la lista busca en todos los meses. */
  tagFilter: string | null
  onTagFilterChange: (tag: string | null) => void
}

/** Sin privacidad activada, nada se oculta. */
const neverHidden = () => false

/**
 * @typedef {'date' | 'name' | 'amount' | 'type'} SortField
 * @description Tipo para los campos por los que se puede ordenar la tabla.
 */
type SortField = "date" | "name" | "amount" | "type" | "paid"

/**
 * Orden por pago. El primer clic ordena de mayor a menor: primero los gastos (y aportaciones)
 * pendientes, luego los pagados y al final los ingresos (que no se marcan). El segundo clic, al revés.
 */
const paidRank = (t: Transaction) => (t.type === "income" ? 0 : isSettled(t) ? 1 : 2)

/**
 * @typedef {'asc' | 'desc'} SortDirection
 * @description Tipo para la dirección de ordenación (ascendente o descendente).
 */
type SortDirection = "asc" | "desc"

/**
 * @function TransactionsTable
 * @description Componente React que muestra una tabla/lista de transacciones.
 *              Incluye filtros, búsqueda, ordenación y carga infinita.
 *              Se adapta a diferentes tamaños de pantalla.
 * @param {TransactionsTableProps} props - Propiedades del componente.
 * @returns {JSX.Element} La tabla/lista de transacciones.
 */
export function TransactionsTable({
  transactions, // Lista COMPLETA de transacciones para el mes.
  person1Name,
  person2Name,
  onEdit,
  onDelete,
  onTogglePaid,
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  transactionsToShowCount, // Cuántas transacciones mostrar actualmente.
  onLoadMore, // Función para cargar más.
  hasMore, // Si hay más transacciones para cargar.
  singleMode = false,
  locked = false,
  allTransactions,
  isTransactionLocked,
  isAmountHidden = neverHidden,
  categories,
  tagFilter,
  onTagFilterChange,
}: TransactionsTableProps) {
  // Nombre de la categoría de una transacción ("Sin categoría" si no tiene o se borró).
  const categoryName = (t: Transaction) =>
    (t.categoryId && categories.find((c) => c.id === t.categoryId)?.name) || UNCATEGORIZED_LABEL
  // Una aportación no tiene categoría: en su lugar se dice de quién es.
  const categoryText = (t: Transaction) =>
    isContribution(t) ? `Aportación de ${t.owner === "person2" ? person2Name : person1Name}` : categoryName(t)
  // Columnas de la vista de escritorio: en modo individual desaparece la de propietario.
  // Las dos clases van completas para que Tailwind las genere.
  const desktopGridCols = singleMode
    ? "grid-cols-[1fr_2fr_1.2fr_1fr_0.8fr]"
    : "grid-cols-[1fr_2fr_1.2fr_1.5fr_1fr_0.8fr]"

  // Estado para el término de búsqueda.
  const [searchTerm, setSearchTerm] = useState("")
  // Estado para el campo de ordenación.
  const [sortField, setSortField] = useState<SortField>("date")
  // Estado para la dirección de ordenación.
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  // Estado para el filtro por tipo de transacción ('all', 'income', 'expense').
  // Tipo: ingresos, gastos fijos o gastos variables (como el selector "Tipo" del formulario).
  const [filterType, setFilterType] = useState<"all" | "income" | "fixed" | "variable" | "contribution">("all")
  // Categoría (Supermercado, Casa…): un id, "none" (sin categoría) o todas.
  const [filterCategory, setFilterCategory] = useState<string>("all")
  // Estado para el filtro por pago: solo gastos pagados o solo pendientes (los ingresos no se marcan).
  const [filterPaid, setFilterPaid] = useState<"all" | "paid" | "pending">("all")
  // «Más filtros» (3.13.0): fechas e importes, en todos los meses.
  const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState(false)
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(EMPTY_ADVANCED_FILTERS)
  const setAdvancedFilter = (key: keyof AdvancedFilters, value: string) =>
    setAdvancedFilters((current) => ({ ...current, [key]: value }))
  // Estado para el ID de la transacción con el menú de swipe abierto (en móvil).
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null)

  // --- Lógica de Swipe para acciones en filas (móvil/tablet) ---
  // Estado para la posición inicial del toque en el eje X.
  const [touchStartXRow, setTouchStartXRow] = useState(0)
  // Umbral de píxeles para detectar un swipe horizontal y revelar acciones.
  const SWIPE_THRESHOLD_ACTIONS = 40

  /**
   * @function handleTouchStartRow
   * @description Manejador para el evento `onTouchStart` en una fila de transacción.
   *              Guarda la coordenada X inicial del toque.
   * @param {React.TouchEvent} e - El evento táctil.
   * @returns {void}
   */
  const handleTouchStartRow = (e: React.TouchEvent) => {
    setTouchStartXRow(e.touches[0].clientX)
  }

  /**
   * @function handleTouchEndRow
   * @description Manejador para el evento `onTouchEnd` en una fila de transacción.
   *              Calcula la distancia del swipe y abre/cierra el menú de acciones.
   * @param {React.TouchEvent} e - El evento táctil.
   * @param {string} transactionId - El ID de la transacción asociada a la fila.
   * @returns {void}
   */
  const handleTouchEndRow = (e: React.TouchEvent, transactionId: string) => {
    const row = filteredAndSortedTransactions.find((t) => t.id === transactionId)
    if (row && isRowLocked(row)) return // Mes cerrado: no hay acciones que mostrar.
    const touchEndX = e.changedTouches[0].clientX
    const deltaX = touchEndX - touchStartXRow // Distancia horizontal del swipe.

    if (deltaX < -SWIPE_THRESHOLD_ACTIONS) {
      // Swipe hacia la izquierda: abre el menú de acciones para esta transacción.
      setOpenSwipeId(transactionId)
    } else if (deltaX > SWIPE_THRESHOLD_ACTIONS) {
      // Swipe hacia la derecha: cierra el menú si está abierto para esta transacción.
      if (openSwipeId === transactionId) {
        setOpenSwipeId(null)
      }
    } else {
      // Si es un toque o movimiento pequeño, cierra cualquier otro menú de swipe abierto.
      if (openSwipeId && openSwipeId !== transactionId) {
        setOpenSwipeId(null)
      }
    }
  }

  // --- Lógica de Swipe para navegación de mes (aplicada al encabezado de la tabla) ---
  // Estado para la posición inicial del toque en el eje X para la navegación de mes.
  const [touchStartXMonthNav, setTouchStartXMonthNav] = useState(0)
  // Umbral de píxeles para detectar un swipe horizontal para la navegación de mes.
  const SWIPE_THRESHOLD_MONTH_NAV = 50

  /**
   * @function handleTouchStartMonthNav
   * @description Manejador para el evento `onTouchStart` en el navegador de mes.
   *              Guarda la coordenada X inicial del toque.
   * @param {React.TouchEvent} e - El evento táctil.
   * @returns {void}
   */
  const handleTouchStartMonthNav = (e: React.TouchEvent) => {
    setTouchStartXMonthNav(e.touches[0].clientX)
  }

  /**
   * @function handleTouchEndMonthNav
   * @description Manejador para el evento `onTouchEnd` en el navegador de mes.
   *              Calcula la distancia del swipe y cambia el mes.
   * @param {React.TouchEvent} e - El evento táctil.
   * @returns {void}
   */
  const handleTouchEndMonthNav = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX
    const deltaX = touchEndX - touchStartXMonthNav // Distancia horizontal del swipe.

    if (deltaX > SWIPE_THRESHOLD_MONTH_NAV) {
      // Swipe hacia la derecha: va al mes anterior.
      const { month, year } = getPreviousMonthYear(selectedMonth, selectedYear)
      onMonthChange(month)
      onYearChange(year)
    } else if (deltaX < -SWIPE_THRESHOLD_MONTH_NAV) {
      // Swipe hacia la izquierda: va al mes siguiente.
      const { month, year } = getNextMonthYear(selectedMonth, selectedYear)
      onMonthChange(month)
      onYearChange(year)
    }
  }

  // Ref para el contenedor de la tabla, utilizado para detectar clics fuera.
  const tableRef = useRef<HTMLDivElement>(null)
  /**
   * `useEffect` para cerrar los menús de swipe cuando se hace clic fuera de una fila de transacción.
   * Añade un event listener global al documento.
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Si el clic no fue dentro de la tabla, cierra cualquier menú de swipe abierto.
      if (tableRef.current && !tableRef.current.contains(event.target as Node)) {
        setOpenSwipeId(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside) // Añade el listener.
    // Función de limpieza: elimina el event listener al desmontar el componente.
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [openSwipeId]) // Dependencia: se ejecuta cuando `openSwipeId` cambia.

  // Ref para el elemento de carga (para el Intersection Observer).
  const loadMoreRef = useRef<HTMLDivElement>(null)

  /**
   * `useEffect` para implementar la carga infinita de transacciones usando `IntersectionObserver`.
   * Detecta cuando el usuario se desplaza hasta el final de la lista visible.
   */
  useEffect(() => {
    // Si no hay un elemento de referencia o no hay más transacciones, no hace nada.
    if (!loadMoreRef.current || !hasMore) return

    // Crea un nuevo IntersectionObserver.
    const observer = new IntersectionObserver(
      (entries) => {
        // Si el elemento de carga es visible (intersecting), llama a `onLoadMore`.
        if (entries[0].isIntersecting) {
          onLoadMore()
        }
      },
      { threshold: 0.1 }, // El callback se activa cuando el 10% del elemento es visible.
    )

    observer.observe(loadMoreRef.current) // Empieza a observar el elemento.

    // Función de limpieza: desconecta el observador al desmontar el componente.
    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current)
      }
    }
  }, [hasMore, onLoadMore]) // Dependencias: se ejecuta cuando `hasMore` o `onLoadMore` cambian.

  /**
   * `useMemo` que filtra las transacciones por búsqueda, tipo y categoría (SIN paginar).
   * Es la base tanto de la lista como de las tarjetas de resumen "Filtradas".
   */
  // Con texto en el buscador, un evento o «Más filtros» se busca en TODOS los meses (si se han pasado);
  // si no, en el mes.
  const advancedCount = activeAdvancedCount(advancedFilters)
  const isSearchingAll =
    (searchTerm.trim() !== "" || tagFilter !== null || advancedCount > 0) && allTransactions !== undefined
  // Eventos para elegir en «Más filtros», y el elegido tal como sale en la lista.
  const tagOptions = useMemo(() => tagsInUse(allTransactions ?? transactions), [allTransactions, transactions])
  const selectedTagOption =
    tagFilter === null ? "" : (tagOptions.find((tag) => normalizeName(tag) === normalizeName(tagFilter)) ?? tagFilter)
  const searchBase = isSearchingAll ? allTransactions : transactions
  const selectedMonthKey = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`
  const isOtherMonth = (t: Transaction) => isSearchingAll && t.date.slice(0, 7) !== selectedMonthKey
  // Solo lectura por fila: el mes seleccionado si está cerrado, o el mes de la fila al buscar.
  const isRowLocked = (t: Transaction) => (isOtherMonth(t) ? Boolean(isTransactionLocked?.(t)) : locked)

  const filteredTransactions = useMemo(() => {
    return searchBase.filter((transaction) => {
      const matchesSearch = transaction.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType =
        filterType === "all" ||
        (filterType === "income" || filterType === "contribution"
          ? transaction.type === filterType
          : transaction.type === "expense" && transaction.category === filterType)
      // "Sin categoría" no incluye las aportaciones (no llevan categoría porque no aplica).
      const matchesCategory =
        filterCategory === "all" ||
        (filterCategory === "none"
          ? !isContribution(transaction) && categoryName(transaction) === UNCATEGORIZED_LABEL
          : transaction.categoryId === filterCategory)
      // "Pagados" incluye los ajustes de cierre, que nunca quedan pendientes (ver `isSettled`), y las
      // aportaciones enviadas.
      const matchesPaid =
        filterPaid === "all" ||
        (transaction.type !== "income" && (filterPaid === "paid") === isSettled(transaction))

      const matchesTag = tagFilter === null || hasTag(transaction, tagFilter)

      return (
        matchesSearch &&
        matchesType &&
        matchesCategory &&
        matchesPaid &&
        matchesTag &&
        matchesAdvancedFilters(transaction, advancedFilters, isAmountHidden)
      )
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchBase, searchTerm, filterType, filterCategory, filterPaid, tagFilter, advancedFilters, isAmountHidden])

  /**
   * `useMemo` que ordena el conjunto filtrado y aplica la paginación (carga infinita).
   * Este es el listado que realmente se renderiza.
   */
  const filteredAndSortedTransactions = useMemo(() => {
    // Ordena una copia del conjunto filtrado según el campo y la dirección seleccionados.
    const sorted = [...filteredTransactions].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case "date":
          aValue = new Date(a.date).getTime() // Compara por timestamp de fecha.
          bValue = new Date(b.date).getTime()
          break
        case "name":
          aValue = a.name.toLowerCase() // Compara por nombre (sin distinguir mayúsculas/minúsculas).
          bValue = b.name.toLowerCase()
          break
        case "amount":
          // Los importes ocultos no revelan su posición: van como si fueran los más bajos.
          aValue = isAmountHidden(a) ? -1 : a.amount // Compara por cantidad.
          bValue = isAmountHidden(b) ? -1 : b.amount
          break
        case "type":
          aValue = a.type // Compara por tipo (ingreso/gasto).
          bValue = b.type
          break
        case "paid":
          aValue = paidRank(a) // Pendientes, pagados e ingresos.
          bValue = paidRank(b)
          break
        default:
          return 0 // No hay ordenación por defecto.
      }

      // Lógica de comparación para orden ascendente/descendente.
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
      return 0
    })

    // Limita al número de transacciones a mostrar actualmente (clave para la carga infinita).
    return sorted.slice(0, transactionsToShowCount)
  }, [filteredTransactions, sortField, sortDirection, transactionsToShowCount, isAmountHidden]) // Dependencias.

  /**
   * @function handleSort
   * @description Manejador para cambiar el campo y la dirección de ordenación.
   * @param {SortField} field - El campo por el que se desea ordenar.
   * @returns {void}
   */
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Si se hace clic en el mismo campo, invierte la dirección.
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      // Si se hace clic en un nuevo campo, ordena por ese campo en dirección descendente por defecto.
      setSortField(field)
      setSortDirection("desc")
    }
  }

  /**
   * @function getSortIcon
   * @description Devuelve el icono de ordenación adecuado para un campo dado.
   * @param {SortField} field - El campo de ordenación.
   * @returns {JSX.Element} El icono de flecha arriba, abajo o bidireccional.
   */
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 text-muted-foreground" /> // Icono por defecto.
    return sortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4 text-primary" />
    ) : (
      <ArrowDown className="h-4 w-4 text-primary" />
    ) // Iconos de dirección.
  }

  /**
   * @function getOwnerDisplay
   * @description Formatea la visualización del propietario de una transacción.
   *              Para transacciones compartidas, muestra los nombres y porcentajes.
   * @param {Transaction} transaction - La transacción.
   * @returns {string | null} La cadena formateada del propietario, o `null` si no hay que mostrarla
   *          (en modo individual, las transacciones de la Persona 1 no llevan etiqueta).
   */
  const getOwnerDisplay = (transaction: Transaction) => {
    if (singleMode && transaction.owner === "person1") return null
    if (transaction.owner === "person1") return person1Name
    if (transaction.owner === "person2") return person2Name
    if (transaction.owner === "both") {
      // Muestra los nombres y porcentajes redondeados a 0 decimales.
      return `${person1Name} (${(transaction.person1Percentage ?? 0).toFixed(0)}%) \n ${person2Name} (${(transaction.person2Percentage ?? 0).toFixed(0)}%)`
    }
    return "Desconocido"
  }

  /**
   * @function getCategoryBadge
   * @description Devuelve un "badge" (etiqueta visual) para la categoría de una transacción.
   *              Incluye un icono y un color según el tipo/categoría.
   * @param {Transaction} transaction - La transacción.
   * @returns {JSX.Element} El elemento `<span>` del badge.
   */
  /**
   * Tipo y categoría de una fila: un icono redondo para el tipo (ingreso, gasto fijo o variable;
   * se explica al pasar el ratón) y, al lado, el nombre de la categoría. En PC, los no computables
   * llevan además la marca "NC" (en el móvil ya va junto al importe).
   */
  const getCategoryBadge = (transaction: Transaction, showNonComputable = false) => (
    <span className="inline-flex items-center gap-1.5">
      {getTypeIcon(transaction)}
      {!isClosingAdjustment(transaction) && (
        <span className="text-xs text-muted-foreground">{categoryText(transaction)}</span>
      )}
      {showNonComputable && transaction.nonComputable && (
        <span className="text-[10px] font-medium bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full" title="No computable">
          NC
        </span>
      )}
    </span>
  )

  /** Icono del tipo: ingreso (verde), aportación (violeta, flechas), gasto fijo (rojo, calendario) o gasto variable (naranja). */
  const getTypeIcon = (transaction: Transaction) => {
    const base = "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
    if (isContribution(transaction)) {
      return (
        <span className={`${base} bg-primary/10 text-primary`} title="Aportación a la compartida">
          <ArrowRightLeft className="h-3.5 w-3.5" />
          <span className="sr-only">Aportación a la compartida</span>
        </span>
      )
    }
    if (transaction.type === "income") {
      return (
        <span className={`${base} bg-green-100 text-green-600`} title="Ingreso">
          <TrendingUp className="h-3.5 w-3.5" />
          <span className="sr-only">Ingreso</span>
        </span>
      )
    }
    if (transaction.category === "fixed") {
      return (
        <span className={`${base} bg-red-100 text-red-600`} title="Gasto fijo">
          <Calendar className="h-3.5 w-3.5" />
          <span className="sr-only">Gasto fijo</span>
        </span>
      )
    }
    return (
      <span className={`${base} bg-orange-100 text-orange-600`} title="Gasto variable">
        <TrendingDown className="h-3.5 w-3.5" />
        <span className="sr-only">Gasto variable</span>
      </span>
    )
  }

  // Lo que necesitan las filas (ver `components/transaction-rows.tsx`).
  const rowContext: RowContext = {
    singleMode,
    desktopGridCols,
    isOtherMonth,
    isRowLocked,
    isAmountHidden,
    getOwnerDisplay,
    getCategoryBadge,
    onEdit,
    onDelete,
    onTogglePaid,
    onTagClick: onTagFilterChange,
  }

  // Calcula ingresos y gastos del conjunto FILTRADO (búsqueda/tipo/categoría), no de la lista completa,
  // para que las tarjetas "Filtradas" reflejen realmente los filtros activos.
  const filteredTotals = useMemo(() => aggregateTransactions(filteredTransactions), [filteredTransactions])
  const totalIncome = filteredTotals.totalIncome
  const totalExpenses = filteredTotals.totalExpenses
  const filteredBalance = subtractMoney(totalIncome, totalExpenses)
  // Con un filtro activo, un total que incluye importes ocultos los delataría (p. ej. buscando
  // una transacción concreta): ese total también se oculta. Sin filtros es el del mes, que se ve.
  const isFiltering = filteredTransactions.length !== transactions.length
  const hidesIncome = isFiltering && filteredTransactions.some((t) => t.type === "income" && isAmountHidden(t))
  const hidesExpenses = isFiltering && filteredTransactions.some((t) => t.type === "expense" && isAmountHidden(t))

  return (
    <div className="bg-card rounded-2xl shadow-lg border">
      {/* Cabecera de la tabla con filtros y búsqueda */}
      <div
        className="p-6 border-b bg-muted rounded-t-2xl"
        // Eventos táctiles para la navegación de mes por swipe.
        onTouchStart={handleTouchStartMonthNav}
        onTouchEnd={handleTouchEndMonthNav}
      >
        {/* Navegador de Mes/Año */}
        <div data-tour="month-nav">
          <TransactionMonthNavigator
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onMonthChange={onMonthChange}
            onYearChange={onYearChange}
          />
        </div>

        {/* Título y, debajo, los filtros: la búsqueda en una línea y los tres selectores en la siguiente. */}
        <div className="flex flex-col gap-4 mt-4">
          {/* Título con el contador en la misma línea: las que se ven de las que hay en el mes */}
          <h2 className="text-xl font-semibold text-foreground">
            Transacciones{" "}
            <span className="text-sm font-normal text-muted-foreground">
              {filteredAndSortedTransactions.length}/{searchBase.length}
              {isSearchingAll && " · todos los meses"}
            </span>
          </h2>

          <div data-tour="filters" className="space-y-3">
            {/* Campo de búsqueda, a todo el ancho */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar transacciones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full bg-input text-foreground border-border"
              />
            </div>

            {/* Evento elegido (al pulsar una etiqueta o desde Eventos): todos sus movimientos. */}
            {tagFilter !== null && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Evento:</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-3 py-1 font-medium text-secondary">
                  {tagFilter}
                  <button type="button" onClick={() => onTagFilterChange(null)} aria-label="Quitar el filtro del evento" className="ml-1 hover:opacity-70">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
            )}

            {/* Tipo, categoría y pago en una línea (en móvil, uno debajo de otro: no caben) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Selector de filtro por tipo */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-input text-foreground"
              >
                <option value="all">Todos los tipos</option>
                <option value="income">Ingresos</option>
                <option value="fixed">Gastos fijos</option>
                <option value="variable">Gastos variables</option>
                {!singleMode && <option value="contribution">Aportaciones</option>}
              </select>

              {/* Selector de filtro por categoría */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as any)}
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-input text-foreground"
              >
                <option value="all">Todas las categorías</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value="none">{UNCATEGORIZED_LABEL}</option>
              </select>

              {/* Selector de filtro por pago (solo gastos) */}
              <select
                value={filterPaid}
                onChange={(e) => setFilterPaid(e.target.value as "all" | "paid" | "pending")}
                aria-label="Filtrar por pago"
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-input text-foreground"
              >
                <option value="all">Pagados y pendientes</option>
                <option value="paid">Pagados</option>
                <option value="pending">Pendientes de pago</option>
              </select>
            </div>

            {/* Más filtros (3.13.0): fechas, importes y evento, buscando en todos los meses. */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <button
                type="button"
                onClick={() => setIsMoreFiltersOpen((open) => !open)}
                aria-expanded={isMoreFiltersOpen}
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {isMoreFiltersOpen ? "Menos filtros" : "Más filtros"}
                {advancedCount > 0 && ` (${advancedCount})`}
              </button>
              {advancedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setAdvancedFilters(EMPTY_ADVANCED_FILTERS)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Quitar fechas e importes
                </button>
              )}
            </div>
            {isMoreFiltersOpen && (
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <label className="space-y-1 text-xs text-muted-foreground">
                  Desde
                  <Input
                    type="date"
                    value={advancedFilters.from}
                    onChange={(e) => setAdvancedFilter("from", e.target.value)}
                    className="bg-input text-foreground border-border"
                  />
                </label>
                <label className="space-y-1 text-xs text-muted-foreground">
                  Hasta
                  <Input
                    type="date"
                    value={advancedFilters.to}
                    min={advancedFilters.from || undefined}
                    onChange={(e) => setAdvancedFilter("to", e.target.value)}
                    className="bg-input text-foreground border-border"
                  />
                </label>
                <label className="space-y-1 text-xs text-muted-foreground">
                  Importe mínimo (€)
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={advancedFilters.min}
                    onChange={(e) => setAdvancedFilter("min", e.target.value)}
                    className="bg-input text-foreground border-border"
                  />
                </label>
                <label className="space-y-1 text-xs text-muted-foreground">
                  Importe máximo (€)
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="Sin límite"
                    value={advancedFilters.max}
                    onChange={(e) => setAdvancedFilter("max", e.target.value)}
                    className="bg-input text-foreground border-border"
                  />
                </label>
                <label className="col-span-2 lg:col-span-1 space-y-1 text-xs text-muted-foreground">
                  Evento
                  <select
                    value={selectedTagOption}
                    onChange={(e) => onTagFilterChange(e.target.value || null)}
                    disabled={tagOptions.length === 0 && tagFilter === null}
                    className="w-full h-10 px-3 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-input text-sm text-foreground disabled:opacity-50"
                  >
                    <option value="">{tagOptions.length === 0 ? "Sin eventos" : "Todos"}</option>
                    {tagFilter !== null && !tagOptions.includes(selectedTagOption) && (
                      <option value={selectedTagOption}>{selectedTagOption}</option>
                    )}
                    {tagOptions.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Totales de lo filtrado (búsqueda/tipo/categoría). En móvil, ingresos y gastos en una
            línea y el balance debajo, a todo el ancho. */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mt-6">
          <div className="bg-card rounded-2xl p-3 md:p-4 border">
            <div className="flex items-center gap-3">
              <div className="hidden sm:block p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ingresos</p>
                <p className="text-base sm:text-lg font-semibold text-green-600">{hidesIncome ? HIDDEN_AMOUNT : formatCurrency(totalIncome)}</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl p-3 md:p-4 border">
            <div className="flex items-center gap-3">
              <div className="hidden sm:block p-2 bg-red-100 rounded-lg">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gastos</p>
                <p className="text-base sm:text-lg font-semibold text-red-600">{hidesExpenses ? HIDDEN_AMOUNT : formatCurrency(totalExpenses)}</p>
              </div>
            </div>
          </div>

          <div className="col-span-2 md:col-span-1 bg-card rounded-2xl p-3 md:p-4 border">
            <div className="flex items-center gap-3">
              <div className="hidden sm:block p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Balance</p>
                <p
                  className={`text-base sm:text-lg font-semibold ${filteredBalance >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {hidesIncome || hidesExpenses ? HIDDEN_AMOUNT : formatCurrency(filteredBalance)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenedor de la tabla / lista de transacciones */}
      <div className="overflow-x-auto" ref={tableRef}>
        {filteredAndSortedTransactions.length === 0 ? (
          // Mensaje si no se encuentran transacciones.
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No se encontraron transacciones</h3>
            <p className="text-muted-foreground">
              {searchTerm || filterType !== "all" || filterCategory !== "all"
                ? "Intenta ajustar los filtros de búsqueda"
                : "Comienza agregando tu primera transacción"}
            </p>
          </div>
        ) : (
          <>
            {/* Encabezado de la tabla para escritorio (oculto en móvil) */}
            <div className={cn("hidden sm:grid gap-4 px-6 py-4 bg-muted border-b border-border text-sm font-medium text-muted-foreground", desktopGridCols)}>
              <button
                onClick={() => handleSort("date")}
                className="flex items-center gap-2 text-left hover:text-foreground"
              >
                Fecha
                {getSortIcon("date")}
              </button>
              <button
                onClick={() => handleSort("name")}
                className="flex items-center gap-2 text-left hover:text-foreground"
              >
                Descripción
                {getSortIcon("name")}
              </button>
              <button
                onClick={() => handleSort("type")}
                className="flex items-center gap-2 text-left hover:text-foreground"
              >
                Categoría
                {getSortIcon("type")}
              </button>
              {!singleMode && <span className="text-left">Propietario</span>}
              <button
                onClick={() => handleSort("amount")}
                className="flex items-center gap-2 text-right hover:text-foreground justify-end"
              >
                Importe
                {getSortIcon("amount")}
              </button>
              {/* Ordena por pago: el círculo de pagado es la primera acción de cada fila. */}
              <button
                onClick={() => handleSort("paid")}
                className="flex items-center gap-2 hover:text-foreground justify-end"
                title="Ordenar por pagados y pendientes"
              >
                Pagado
                {getSortIcon("paid")}
              </button>
            </div>

            {/* Lista de Transacciones (renderiza filas para escritorio y móvil) */}
            <div className="divide-y divide-border">
              {filteredAndSortedTransactions.map((transaction, index) => (
                <React.Fragment key={transaction.id}>
                  <TransactionRowDesktop transaction={transaction} index={index} ctx={rowContext} />
                  <TransactionRowMobile
                    transaction={transaction}
                    index={index}
                    ctx={rowContext}
                    isActionsOpen={openSwipeId === transaction.id}
                    onToggleActions={() => setOpenSwipeId(openSwipeId === transaction.id ? null : transaction.id)}
                    onCloseActions={() => setOpenSwipeId(null)}
                    onTouchStart={handleTouchStartRow}
                    onTouchEnd={(e) => handleTouchEndRow(e, transaction.id)}
                  />
                </React.Fragment>
              ))}
              {/* Mensaje de carga para el scroll infinito */}
              {hasMore && (
                <div ref={loadMoreRef} className="py-4 text-center text-muted-foreground">
                  Cargando más transacciones...
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
