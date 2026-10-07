/**
 * @file components/cumulative-balance-card.tsx
 * @description Este archivo define el componente `CumulativeBalanceCard`,
 *              que muestra el balance total acumulado de la aplicación,
 *              así como el balance acumulado individual para cada persona.
 *              Es un Client Component (`"use client"`) porque no tiene lógica de servidor.
 */

"use client"

import { formatCurrency } from "@/lib/utils" // Utilidad para formatear moneda.
import { shouldShowPerson2 } from "@/lib/single-mode" // Visibilidad de la Persona 2 en modo individual.
import { Wallet, User } from "lucide-react" // Iconos de cartera y usuario.

/**
 * @interface CumulativeBalanceCardProps
 * @description Define las propiedades que acepta el componente `CumulativeBalanceCard`.
 * @property {number} totalBalance - Balance acumulado total de todas las transacciones.
 * @property {number} person1TotalBalance - Balance acumulado total de la Persona 1.
 * @property {number} person2TotalBalance - Balance acumulado total de la Persona 2.
 * @property {string} person1Name - Nombre de la Persona 1.
 * @property {string} person2Name - Nombre de la Persona 2.
 * @property {boolean} [singleMode] - Modo individual: solo se muestra el total si la Persona 2 no tiene saldo.
 */
interface CumulativeBalanceCardProps {
  totalBalance: number
  person1TotalBalance: number
  person2TotalBalance: number
  person1Name: string
  person2Name: string
  singleMode?: boolean
}

/**
 * @function CumulativeBalanceCard
 * @description Componente React que muestra una tarjeta con los balances acumulados.
 *              Es útil para ver la salud financiera a largo plazo.
 * @param {CumulativeBalanceCardProps} props - Propiedades del componente.
 * @returns {JSX.Element} La tarjeta de balance acumulado.
 */
export function CumulativeBalanceCard({
  totalBalance,
  person1TotalBalance,
  person2TotalBalance,
  person1Name,
  person2Name,
  singleMode,
}: CumulativeBalanceCardProps) {
  // Sin saldo de la Persona 2, el de la Persona 1 coincide con el total: basta con mostrar el total.
  const showPeople = shouldShowPerson2(singleMode, person2TotalBalance)

  return (
    <div className="bg-card rounded-2xl shadow-lg border p-6 space-y-4">
      {/* Título de la tarjeta con icono de cartera. */}
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <Wallet className="h-5 w-5" />
        Total Acumulado
      </h3>
      {/* Contenedor de los balances individuales, con espacio vertical entre ellos. */}
      <div className="space-y-4">
        {/* Tarjeta de Balance Total */}
        <div className="bg-muted rounded-xl p-3 flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total</p>
            {/* Muestra el balance total formateado, en verde si es positivo, rojo si es negativo. */}
            <p className={`text-lg font-semibold ${totalBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(totalBalance)}
            </p>
          </div>
        </div>
        {showPeople && (
          <>
            {/* Tarjeta de Balance Acumulado de Persona 1 */}
            <div className="bg-muted rounded-xl p-3 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{person1Name}</p>
                {/* Muestra el balance de Persona 1 formateado, en verde si es positivo, rojo si es negativo. */}
                <p className={`text-lg font-semibold ${person1TotalBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(person1TotalBalance)}
                </p>
              </div>
            </div>
            {/* Tarjeta de Balance Acumulado de Persona 2 */}
            <div className="bg-muted rounded-xl p-3 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{person2Name}</p>
                {/* Muestra el balance de Persona 2 formateado, en verde si es positivo, rojo si es negativo. */}
                <p className={`text-lg font-semibold ${person2TotalBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(person2TotalBalance)}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
