/**
 * @file components/cumulative-balance-card.tsx
 * @description Este archivo define el componente `CumulativeBalanceCard`,
 *              que muestra el balance total acumulado de la aplicación,
 *              así como el balance acumulado individual para cada persona.
 *              Con la cuenta compartida (v3.0.0), cada persona muestra su cuenta (con su total
 *              debajo) y una fila más muestra lo acumulado en la compartida y de quién es.
 *              Es un Client Component (`"use client"`) porque no tiene lógica de servidor.
 */

"use client"

import type React from "react"
import { formatCurrency } from "@/lib/utils" // Utilidad para formatear moneda.
import { shouldShowPerson2 } from "@/lib/single-mode" // Visibilidad de la Persona 2 en modo individual.
import type { AccountSplit } from "@/lib/shared-account" // Reparto entre cuentas.
import { Wallet, User, Landmark, ChevronRight } from "lucide-react" // Iconos de cartera, usuario y cuenta compartida.

/**
 * @interface CumulativeBalanceCardProps
 * @description Define las propiedades que acepta el componente `CumulativeBalanceCard`.
 * @property {number} totalBalance - Balance acumulado total de todas las transacciones.
 * @property {number} person1TotalBalance - Balance acumulado total de la Persona 1.
 * @property {number} person2TotalBalance - Balance acumulado total de la Persona 2.
 * @property {string} person1Name - Nombre de la Persona 1.
 * @property {string} person2Name - Nombre de la Persona 2.
 * @property {boolean} [singleMode] - Modo individual: solo se muestra el total si la Persona 2 no tiene saldo.
 * @property {AccountSplit} [accounts] - Reparto acumulado entre cuentas (si se ha usado la compartida).
 * @property {() => void} onOpen - Abre las metas de ahorro (3.3.0): toda la tarjeta se puede pulsar.
 */
interface CumulativeBalanceCardProps {
  totalBalance: number
  person1TotalBalance: number
  person2TotalBalance: number
  person1Name: string
  person2Name: string
  singleMode?: boolean
  accounts?: AccountSplit
  onOpen: () => void
}

/** Color de un saldo: verde si es positivo o cero, rojo si es negativo. */
const balanceColor = (value: number) => (value >= 0 ? "text-green-600" : "text-red-600")

/**
 * @function BalanceRow
 * @description Una fila de la tarjeta: icono, nombre, saldo y, si la hay, una línea pequeña debajo.
 */
function BalanceRow({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: number; detail?: string }) {
  // Solo `span`: va dentro del botón de la tarjeta.
  return (
    <span className="bg-muted rounded-xl p-3 flex items-center gap-3">
      <span className="p-2 bg-primary/10 rounded-lg">{icon}</span>
      <span className="min-w-0 block">
        <span className="block text-sm text-muted-foreground">{label}</span>
        <span className={`block text-lg font-semibold ${balanceColor(value)}`}>{formatCurrency(value)}</span>
        {detail && <span className="block text-xs text-muted-foreground truncate">{detail}</span>}
      </span>
    </span>
  )
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
  accounts,
  onOpen,
}: CumulativeBalanceCardProps) {
  // Sin saldo de la Persona 2, el de la Persona 1 coincide con el total: basta con mostrar el total.
  const showPeople = shouldShowPerson2(singleMode, person2TotalBalance)
  // Con la compartida, cada persona muestra su cuenta (lo que tiene en su banco) y su total debajo.
  const usesShared = Boolean(accounts?.usesShared)
  const userIcon = <User className="h-5 w-5 text-primary" />

  return (
    <button
      type="button"
      onClick={onOpen}
      data-tour="cumulative"
      className="w-full text-left bg-card rounded-2xl shadow-lg border p-6 space-y-4 hover:bg-muted/40 transition-colors"
    >
      {/* Título de la tarjeta con icono de cartera. */}
      <span className="flex items-center justify-between">
        <span className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Total Acumulado
        </span>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </span>
      {/* Contenedor de los balances individuales, con espacio vertical entre ellos. */}
      <span className="flex flex-col gap-4">
        <BalanceRow icon={<Wallet className="h-5 w-5 text-primary" />} label="Total" value={totalBalance} />
        {showPeople &&
          (usesShared && accounts ? (
            <>
              <BalanceRow
                icon={userIcon}
                label={`Cuenta de ${person1Name}`}
                value={accounts.person1Account}
                detail={`Total: ${formatCurrency(person1TotalBalance)}`}
              />
              <BalanceRow
                icon={userIcon}
                label={`Cuenta de ${person2Name}`}
                value={accounts.person2Account}
                detail={`Total: ${formatCurrency(person2TotalBalance)}`}
              />
              <BalanceRow
                icon={<Landmark className="h-5 w-5 text-primary" />}
                label="Compartida"
                value={accounts.shared}
                detail={`${person1Name} ${formatCurrency(accounts.sharedPerson1)} · ${person2Name} ${formatCurrency(accounts.sharedPerson2)}`}
              />
            </>
          ) : (
            <>
              <BalanceRow icon={userIcon} label={person1Name} value={person1TotalBalance} />
              <BalanceRow icon={userIcon} label={person2Name} value={person2TotalBalance} />
            </>
          ))}
      </span>
      <span className="block text-xs text-muted-foreground">Metas de ahorro · pulsa para verlas</span>
    </button>
  )
}
