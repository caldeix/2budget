/**
 * @file components/trends-strip.tsx
 * @description Tendencias (3.12.0): franja bajo el resumen con las categorías que más se apartan de lo
 *              normal en el mes que se está viendo (ver `lib/trends.ts`). La «x» la oculta para ese mes en
 *              este dispositivo; si después sale una tendencia distinta, vuelve a aparecer.
 */

"use client"

import { useEffect, useState } from "react"
import { TrendingDown, TrendingUp, X } from "lucide-react"
import type { Trend } from "@/lib/trends"
import type { BudgetOwner } from "@/lib/budgets"
import { cn, formatCurrency, getMonthName } from "@/lib/utils"

interface TrendsStripProps {
  trends: Trend[]
  month: number
  year: number
  /** Si el mes está en curso («este mes») o terminado («en octubre»). */
  isCurrentMonth: boolean
  /** Nombre de cada cuenta junto a la categoría («tuyo», «compartido», el nombre…); sin él, nada. */
  ownerLabel: (owner: BudgetOwner) => string | null
}

const dismissKey = (month: number, year: number) => `2budget:trends-dismissed:${year}-${month}`
/** Qué se ocultó: si cambian las tendencias del mes, se vuelven a enseñar. */
const signatureOf = (trends: Trend[]) => trends.map((t) => `${t.owner}:${t.category.id}:${t.direction}`).join("|")

export function TrendsStrip({ trends, month, year, isCurrentMonth, ownerLabel }: TrendsStripProps) {
  // Oculta hasta leer si ya se cerró (sin destello al cargar).
  const [dismissedSignature, setDismissedSignature] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    try {
      setDismissedSignature(localStorage.getItem(dismissKey(month, year)))
    } catch {
      setDismissedSignature(null)
    }
  }, [month, year])

  const signature = signatureOf(trends)
  if (trends.length === 0 || dismissedSignature === undefined || dismissedSignature === signature) return null

  const dismiss = () => {
    setDismissedSignature(signature)
    try {
      localStorage.setItem(dismissKey(month, year), signature)
    } catch {
      // Se vuelve a enseñar al recargar: no es grave.
    }
  }

  const when = isCurrentMonth ? "este mes" : `en ${getMonthName(month).toLowerCase()}`
  return (
    <div className="mt-8 rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <ul className="flex-1 space-y-2 text-sm">
          {trends.map((trend) => {
            const isUp = trend.direction === "up"
            const Icon = isUp ? TrendingUp : TrendingDown
            const percent = Math.round(Math.abs(trend.change) * 100)
            const label = ownerLabel(trend.owner)
            return (
              <li key={`${trend.owner}:${trend.category.id}`} className="flex items-start gap-2">
                <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", isUp ? "text-amber-600" : "text-green-600")} />
                <span className="text-foreground">
                  <strong>{trend.category.name}</strong>
                  {label && <span className="text-muted-foreground"> ({label})</span>}:{" "}
                  {trend.spent === 0 ? (
                    <>nada {when}, cuando lo normal es {formatCurrency(trend.average)}.</>
                  ) : (
                    <>
                      {formatCurrency(trend.spent)} {when}, {isCurrentMonth && isUp ? "ya " : ""}un {percent} %{" "}
                      {isUp ? "más" : "menos"} que lo normal ({formatCurrency(trend.average)}).
                    </>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
        <button
          type="button"
          onClick={dismiss}
          className="text-muted-foreground hover:text-foreground p-1 -m-1"
          aria-label="Ocultar las tendencias de este mes"
          title="Ocultar las tendencias de este mes"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Lo normal: la media de los 3 meses anteriores con gasto.</p>
    </div>
  )
}
