/**
 * @file components/summary-cards.tsx
 * @description Este archivo define el componente `SummaryCards`, que muestra
 *              un resumen visual de los ingresos, gastos y balances del mes seleccionado.
 *              Incluye tarjetas individuales para el balance total, ingresos, gastos y balance individual.
 *              Es un Client Component (`"use client"`) porque no tiene lógica de servidor.
 */

"use client"

import { formatCurrency, formatMonthYear } from "@/lib/utils" // Utilidades para formatear moneda y fecha.
import { shouldShowPerson2 } from "@/lib/single-mode" // Visibilidad de la Persona 2 en modo individual.
import { TrendingUp, TrendingDown, DollarSign, Users } from "lucide-react" // Iconos.
import type { TodayFigures } from "@/hooks/use-calculations" // Cifras "a día de hoy".

/**
 * @interface SummaryCardsProps
 * @description Define las propiedades que acepta el componente `SummaryCards`.
 * @property {number} totalIncome - Suma total de ingresos del mes.
 * @property {number} totalExpenses - Suma total de gastos del mes.
 * @property {number} balance - Balance total del mes (ingresos - gastos).
 * @property {number} person1Income - Ingresos de la Persona 1.
 * @property {number} person2Income - Ingresos de la Persona 2.
 * @property {number} person1Expenses - Gastos de la Persona 1.
 * @property {number} person2Expenses - Gastos de la Persona 2.
 * @property {number} person1Balance - Balance de la Persona 1.
 * @property {number} person2Balance - Balance de la Persona 2.
 * @property {string} person1Name - Nombre de la Persona 1.
 * @property {string} person2Name - Nombre de la Persona 2.
 * @property {number} selectedMonth - El mes actualmente seleccionado para el resumen.
 * @property {number} selectedYear - El año actualmente seleccionado para el resumen.
 * @property {boolean} [singleMode] - Modo individual: oculta el desglose por persona si la Persona 2 no tiene cifras.
 * @property {TodayFigures} today - Gastos y balances solo con lo ya pagado ("Hoy").
 * @property {boolean} showToday - Si se muestran las dos cifras ("Hoy" y "Previsto"); si no, solo la prevista.
 */
interface SummaryCardsProps {
  totalIncome: number
  totalExpenses: number
  balance: number
  person1Income: number
  person2Income: number
  person1Expenses: number
  person2Expenses: number
  person1Balance: number
  person2Balance: number
  person1Name: string
  person2Name: string
  selectedMonth: number
  selectedYear: number
  nonComputableExpenses: number
  singleMode?: boolean
  today: TodayFigures
  showToday: boolean
}

/** Color de un balance: verde si es positivo o cero, rojo si es negativo. */
const balanceColor = (value: number) => (value >= 0 ? "text-green-600" : "text-red-600")

/**
 * @function TodayLine
 * @description Línea pequeña bajo la cifra grande de una tarjeta con su valor "a día de hoy".
 */
function TodayLine({ value, className }: { value: number; className?: string }) {
  return (
    <p className="text-xs text-muted-foreground">
      Hoy: <span className={`font-medium ${className ?? "text-foreground"}`}>{formatCurrency(value)}</span>
    </p>
  )
}

/**
 * @function TodaySpacer
 * @description Hueco invisible del alto de la línea "Hoy", para las tarjetas que no la tienen:
 *              así las filas de todas las tarjetas quedan a la misma altura en PC.
 */
function TodaySpacer() {
  return (
    <p aria-hidden className="hidden md:block text-xs invisible">
      Hoy
    </p>
  )
}

/**
 * Margen de las filas de una tarjeta. Con "Hoy", las tarjetas sin la cabecera "Hoy / Previsto"
 * dejan su hueco en PC (16 px de margen + 20 px de cabecera) para alinear las filas.
 */
const rowsMargin = (showToday: boolean) => (showToday ? "mt-4 md:mt-9" : "mt-4")

/**
 * @function PersonFigures
 * @description Cifras por persona. Con `showToday`, dos columnas ("Hoy" y "Previsto");
 *              si no, una sola, como siempre.
 */
function PersonFigures({
  rows,
  showToday,
  colored = false,
}: {
  rows: { name: string; today: number; expected: number }[]
  showToday: boolean
  colored?: boolean
}) {
  const color = (value: number) => (colored ? balanceColor(value) : "text-foreground")

  if (!showToday) {
    return (
      <div className="mt-4 space-y-1">
        {rows.map((row, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{row.name}:</span>
            <span className={`font-medium ${color(row.expected)}`}>{formatCurrency(row.expected)}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-x-2 gap-y-1 text-sm tabular-nums">
      <span />
      <span className="text-right text-xs text-muted-foreground">Hoy</span>
      <span className="text-right text-xs text-muted-foreground">Previsto</span>
      {rows.map((row, i) => (
        <div key={i} className="contents">
          <span className="text-muted-foreground truncate">{row.name}</span>
          <span className={`text-right font-medium ${color(row.today)}`}>{formatCurrency(row.today)}</span>
          <span className={`text-right font-medium ${color(row.expected)}`}>{formatCurrency(row.expected)}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * @function SummaryCards
 * @description Componente React que muestra un conjunto de tarjetas de resumen financiero.
 *              Adapta el título del resumen para vistas de escritorio y móvil.
 * @param {SummaryCardsProps} props - Propiedades del componente.
 * @returns {JSX.Element} Un contenedor con las tarjetas de resumen.
 */
export function SummaryCards({
  totalIncome,
  totalExpenses,
  balance,
  person1Income,
  person2Income,
  person1Expenses,
  person2Expenses,
  person1Balance,
  person2Balance,
  person1Name,
  person2Name,
  selectedMonth,
  selectedYear,
  nonComputableExpenses,
  singleMode,
  today,
  showToday,
}: SummaryCardsProps) {
  // En modo individual, el desglose por persona sobra salvo que la Persona 2 tenga cifras este mes.
  const showPerson2 = shouldShowPerson2(singleMode, person2Income, person2Expenses)

  return (
    <div className="space-y-6">
      {/* Título del resumen para la vista de escritorio (oculto en móvil) */}
      <h2 className="text-2xl font-bold text-foreground hidden sm:block">
        Resumen del mes de {formatMonthYear(selectedMonth, selectedYear)}
      </h2>
      {/* Título del resumen para la vista móvil (oculto en escritorio)
          Solo muestra el mes y año para ser más conciso. */}
      <h2 className="text-xl font-bold text-foreground block sm:hidden">
        {formatMonthYear(selectedMonth, selectedYear)}
      </h2>
      {/* Contenedor de las tarjetas, con diseño de cuadrícula responsivo. */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${showPerson2 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        {/* Tarjeta de Balance General */}
        <div className="relative bg-card-balance-bg rounded-2xl shadow-lg border p-6 overflow-hidden">
          {/* Icono de fondo (TrendingUp si balance positivo, TrendingDown si negativo) */}
          <div className="absolute bottom-4 right-4 text-muted-foreground opacity-10">
            {balance >= 0 ? <TrendingUp className="h-24 w-24" /> : <TrendingDown className="h-24 w-24" />}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Balance</p>
              {/* Muestra el balance formateado, en verde si es positivo, rojo si es negativo. */}
              <p className={`text-2xl font-bold ${balanceColor(balance)}`}>{formatCurrency(balance)}</p>
              {showToday && <TodayLine value={today.balance} className={balanceColor(today.balance)} />}
            </div>
          </div>
          <div className={`${rowsMargin(showToday)} space-y-1`}>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ingresos:</span>
              <span className="text-green-600 font-medium">{formatCurrency(totalIncome)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Gastos:</span>
              <span className="text-red-600 font-medium">{formatCurrency(totalExpenses)}</span>
            </div>
            {nonComputableExpenses > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground text-xs opacity-70">De los cuales no computables:</span>
                <span className="text-gray-500 font-medium">{formatCurrency(nonComputableExpenses)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tarjeta de Ingresos Totales */}
        <div className="relative bg-card-income-bg rounded-2xl shadow-lg border p-6 overflow-hidden">
          {/* Icono de fondo (DollarSign) */}
          <div className="absolute bottom-4 right-4 text-muted-foreground opacity-10">
            <DollarSign className="h-24 w-24" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ingresos</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
              {showToday && <TodaySpacer />}
            </div>
          </div>
          {showPerson2 && (
            <div className={`${rowsMargin(showToday)} space-y-1`}>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{person1Name}:</span>
                <span className="font-medium text-foreground">{formatCurrency(person1Income)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{person2Name}:</span>
                <span className="font-medium text-foreground">{formatCurrency(person2Income)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Tarjeta de Gastos Totales */}
        <div className="relative bg-card-expense-bg rounded-2xl shadow-lg border p-6 overflow-hidden">
          {/* Icono de fondo (TrendingDown) */}
          <div className="absolute bottom-4 right-4 text-muted-foreground opacity-10">
            <TrendingDown className="h-24 w-24" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Gastos</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
              {showToday && <TodayLine value={today.totalExpenses} />}
            </div>
          </div>
          {showPerson2 && (
            <PersonFigures
              showToday={showToday}
              rows={[
                { name: person1Name, today: today.person1Expenses, expected: person1Expenses },
                { name: person2Name, today: today.person2Expenses, expected: person2Expenses },
              ]}
            />
          )}
        </div>

        {/* Tarjeta de Balance Individual (oculta en modo individual si la Persona 2 no tiene cifras) */}
        {showPerson2 && (
          <div className="relative bg-card-balance-bg rounded-2xl shadow-lg border p-6 overflow-hidden">
            {/* Icono de fondo (Users) */}
            <div className="absolute bottom-4 right-4 text-muted-foreground opacity-10">
              <Users className="h-24 w-24" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Balance Individual</p>
                {/* Mismo alto de línea que las cifras grandes de las otras tarjetas. */}
                <p className="text-lg leading-8 font-bold text-foreground">Por persona</p>
                {showToday && <TodaySpacer />}
              </div>
            </div>
            <PersonFigures
              showToday={showToday}
              colored
              rows={[
                { name: person1Name, today: today.person1Balance, expected: person1Balance },
                { name: person2Name, today: today.person2Balance, expected: person2Balance },
              ]}
            />
          </div>
        )}
      </div>
    </div>
  )
}
