/**
 * @file components/summary-cards.tsx
 * @description Este archivo define el componente `SummaryCards`, que muestra
 *              un resumen visual de los ingresos, gastos y balances del mes seleccionado.
 *              Incluye tarjetas individuales para el balance total, ingresos, gastos y balance individual.
 *              Es un Client Component (`"use client"`) porque no tiene lógica de servidor.
 */

"use client"

import { formatCurrency, formatMonthYear } from "@/lib/utils" // Utilidades para formatear moneda y fecha.
import { TrendingUp, TrendingDown, DollarSign, Users } from "lucide-react" // Iconos.

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
}: SummaryCardsProps) {
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              <p className={`text-2xl font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(balance)}
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-1">
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
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{person1Name}:</span>
              <span className="font-medium text-foreground">{formatCurrency(person1Income)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{person2Name}:</span>
              <span className="font-medium text-foreground">{formatCurrency(person2Income)}</span>
            </div>
          </div>
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
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{person1Name}:</span>
              <span className="font-medium text-foreground">{formatCurrency(person1Expenses)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{person2Name}:</span>
              <span className="font-medium text-foreground">{formatCurrency(person2Expenses)}</span>
            </div>
          </div>
        </div>

        {/* Tarjeta de Balance Individual */}
        <div className="relative bg-card-balance-bg rounded-2xl shadow-lg border p-6 overflow-hidden">
          {/* Icono de fondo (Users) */}
          <div className="absolute bottom-4 right-4 text-muted-foreground opacity-10">
            <Users className="h-24 w-24" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Balance Individual</p>
              <p className="text-lg font-bold text-foreground">Por persona</p>
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{person1Name}:</span>
              <span className={`font-medium ${person1Balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(person1Balance)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{person2Name}:</span>
              <span className={`font-medium ${person2Balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(person2Balance)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
