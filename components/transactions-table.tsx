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
import { formatCurrency, formatDate, cn, getPreviousMonthYear, getNextMonthYear } from "@/lib/utils" // Utilidades.
import { Button } from "@/components/ui/button" // Componente de botón.
import {
  Edit,
  Trash2,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
} from "lucide-react" // Iconos.
import { TransactionMonthNavigator } from "@/components/transaction-month-navigator" // Navegador de mes.

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
 */
interface TransactionsTableProps {
  transactions: Transaction[]
  person1Name: string
  person2Name: string
  onEdit: (transaction: Transaction) => void
  onDelete: (id: string) => void
  selectedMonth: number
  selectedYear: number
  onMonthChange: (month: number) => void
  onYearChange: (year: number) => void
  transactionsToShowCount: number
  onLoadMore: () => void
  hasMore: boolean
}

/**
 * @typedef {'date' | 'name' | 'amount' | 'type'} SortField
 * @description Tipo para los campos por los que se puede ordenar la tabla.
 */
type SortField = "date" | "name" | "amount" | "type"
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
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  transactionsToShowCount, // Cuántas transacciones mostrar actualmente.
  onLoadMore, // Función para cargar más.
  hasMore, // Si hay más transacciones para cargar.
}: TransactionsTableProps) {
  // Estado para el término de búsqueda.
  const [searchTerm, setSearchTerm] = useState("")
  // Estado para el campo de ordenación.
  const [sortField, setSortField] = useState<SortField>("date")
  // Estado para la dirección de ordenación.
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  // Estado para el filtro por tipo de transacción ('all', 'income', 'expense').
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all")
  // Estado para el filtro por categoría de gasto ('all', 'fixed', 'variable').
  const [filterCategory, setFilterCategory] = useState<"all" | "fixed" | "variable">("all")
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
  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const matchesSearch = transaction.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = filterType === "all" || transaction.type === filterType
      const matchesCategory = filterCategory === "all" || transaction.category === filterCategory

      return matchesSearch && matchesType && matchesCategory
    })
  }, [transactions, searchTerm, filterType, filterCategory])

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
          aValue = a.amount // Compara por cantidad.
          bValue = b.amount
          break
        case "type":
          aValue = a.type // Compara por tipo (ingreso/gasto).
          bValue = b.type
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
  }, [filteredTransactions, sortField, sortDirection, transactionsToShowCount]) // Dependencias.

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
   * @returns {string} La cadena formateada del propietario.
   */
  const getOwnerDisplay = (transaction: Transaction) => {
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
  const getCategoryBadge = (transaction: Transaction) => {
    if (transaction.nonComputable) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          No computable
        </span>
      )
    }

    if (transaction.type === "income") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600">
          <TrendingUp className="h-3 w-3" />
          Ingreso
        </span>
      )
    }

    if (transaction.category === "fixed") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600">
          <Calendar className="h-3 w-3" />
          fijo
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-600">
        <TrendingDown className="h-3 w-3" />
        variable
      </span>
    )
  }

  // Calcula ingresos y gastos del conjunto FILTRADO (búsqueda/tipo/categoría), no de la lista completa,
  // para que las tarjetas "Filtradas" reflejen realmente los filtros activos.
  const totalIncome = filteredTransactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0)
  const totalExpenses = filteredTransactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0)

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
        <TransactionMonthNavigator
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onMonthChange={onMonthChange}
          onYearChange={onYearChange}
        />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mt-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Transacciones</h2>
            <p className="text-sm text-muted-foreground">
              {filteredAndSortedTransactions.length} de {transactions.length} transacciones
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Campo de búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar transacciones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64 bg-input text-foreground border-border"
              />
            </div>

            {/* Selector de filtro por tipo */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-input text-foreground"
            >
              <option value="all">Todos los tipos</option>
              <option value="income">Ingresos</option>
              <option value="expense">Gastos</option>
            </select>

            {/* Selector de filtro por categoría */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as any)}
              className="px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-input text-foreground"
            >
              <option value="all">Todas las categorías</option>
              <option value="fixed">fijo</option>
              <option value="variable">variable</option>
            </select>
          </div>
        </div>

        {/* Tarjetas de resumen de ingresos/gastos/balance filtrados */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-card rounded-2xl p-4 border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ingresos Filtrados</p>
                <p className="text-lg font-semibold text-green-600">{formatCurrency(totalIncome)}</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl p-4 border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gastos Filtrados</p>
                <p className="text-lg font-semibold text-red-600">{formatCurrency(totalExpenses)}</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl p-4 border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Balance Filtrado</p>
                <p
                  className={`text-lg font-semibold ${(totalIncome - totalExpenses) >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {formatCurrency(totalIncome - totalExpenses)}
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
            <div className="hidden sm:grid grid-cols-[1fr_2fr_1.2fr_1.5fr_1fr_0.8fr] gap-4 px-6 py-4 bg-muted border-b border-border text-sm font-medium text-muted-foreground">
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
              <span className="text-left">Propietario</span>
              <button
                onClick={() => handleSort("amount")}
                className="flex items-center gap-2 text-right hover:text-foreground justify-end"
              >
                Importe
                {getSortIcon("amount")}
              </button>
              <span className="text-right">Acciones</span>
            </div>

            {/* Lista de Transacciones (renderiza filas para escritorio y móvil) */}
            <div className="divide-y divide-border">
              {filteredAndSortedTransactions.map((transaction) => (
                <React.Fragment key={transaction.id}>
                  {/* Fila de escritorio (diseño de tarjeta, visible solo en pantallas grandes) */}
                  <div className={cn(
                    "hidden sm:grid grid-cols-[1fr_2fr_1.2fr_1.5fr_1fr_0.8fr] items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors",
                    transaction.nonComputable && "opacity-70"
                  )}>
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          transaction.type === "income" 
                            ? "bg-green-600" 
                            : transaction.nonComputable 
                              ? "bg-gray-500" 
                              : "bg-red-600"
                        }`}
                      />
                      <div>
                        <div className={cn("text-sm font-medium", transaction.nonComputable ? "text-muted-foreground" : "text-foreground")}>
                          {formatDate(transaction.date)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-sm font-medium", transaction.nonComputable && "text-muted-foreground")}>
                        {transaction.name}
                      </span>
                    </div>
                    <div>{getCategoryBadge(transaction)}</div>
                    <div className={cn("text-sm", transaction.nonComputable ? "text-muted-foreground" : "text-foreground")}>
                      {getOwnerDisplay(transaction)}
                    </div>
                    <div
                      className={cn(
                        "text-lg font-semibold text-right",
                        transaction.type === "income" 
                          ? "text-green-600" 
                          : transaction.nonComputable 
                            ? "text-gray-500" 
                            : "text-red-600",
                        transaction.nonComputable && "italic"
                      )}
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEdit(transaction)}
                        className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete(transaction.id)}
                        className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Fila móvil (diseño con swipe, visible solo en pantallas pequeñas) */}
                  <div className="sm:hidden">
                    <div className="p-0 relative overflow-hidden">
                      <div
                        className={cn(
                          "flex flex-col gap-2 p-4 transition-transform duration-300 ease-out",
                          openSwipeId === transaction.id ? "-translate-x-[120px]" : "translate-x-0", // Mueve la fila para revelar acciones.
                        )}
                        onTouchStart={handleTouchStartRow}
                        onTouchEnd={(e) => handleTouchEndRow(e, transaction.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                transaction.type === "income" 
                                  ? "bg-green-600" 
                                  : transaction.nonComputable 
                                    ? "bg-gray-500" 
                                    : "bg-red-600"
                              }`}
                            />
                            <div>
                              <span className={cn("text-sm font-medium", transaction.nonComputable ? "text-muted-foreground" : "text-foreground")}>
                                {formatDate(transaction.date)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <span
                              className={cn(
                                "text-lg font-semibold",
                                transaction.type === "income" 
                                  ? "text-green-600" 
                                  : transaction.nonComputable 
                                    ? "text-gray-500" 
                                    : "text-red-600",
                                transaction.nonComputable && "italic"
                              )}
                            >
                              {transaction.type === "income" ? "+" : "-"}
                              {formatCurrency(transaction.amount)}
                            </span>
                            {transaction.nonComputable && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                                NC
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span className={cn("font-medium", transaction.nonComputable ? "text-muted-foreground" : "text-foreground")}>
                              {transaction.name}
                            </span>
                          </div>
                          <span className={transaction.nonComputable ? "text-muted-foreground" : ""}>
                            {getOwnerDisplay(transaction)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                          {getCategoryBadge(transaction)}
                        </div>
                      </div>
                      {/* Contenedor de acciones de swipe (oculto por defecto, visible con swipe) */}
                      <div
                        className={cn(
                          "absolute inset-y-0 right-0 flex items-center gap-2 pr-4 transition-transform duration-300 ease-out",
                          openSwipeId === transaction.id ? "translate-x-0" : "translate-x-full", // Mueve las acciones.
                        )}
                        style={{ width: "120px" }} // Ancho fijo para las acciones.
                      >
                        <Button
                          size="sm"
                          className="flex-1 bg-amber-600 text-primary-foreground hover:bg-amber-700"
                          onClick={() => {
                            onEdit(transaction)
                            setOpenSwipeId(null) // Cierra el swipe después de la acción.
                          }}
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Editar</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          onClick={() => {
                            onDelete(transaction.id)
                            setOpenSwipeId(null) // Cierra el swipe después de la acción.
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Eliminar</span>
                        </Button>
                      </div>
                    </div>
                  </div>
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
