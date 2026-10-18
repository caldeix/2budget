/**
 * @file components/evolution-card.tsx
 * @description Tarjeta del lateral con la evolución de los últimos seis meses (barras de ingresos y
 *              gastos). Toda la tarjeta es un botón: abre el modal con el gráfico completo. En pareja
 *              (3.4.0) enseña la cuenta elegida en el modal (la tuya o la compartida).
 */

"use client"

import { ChevronRight, LineChart } from "lucide-react"
import { EvolutionChart } from "@/components/evolution-chart"
import type { MonthPoint } from "@/lib/evolution"

interface EvolutionCardProps {
  /** Los últimos meses (ver `lastMonths`). */
  points: MonthPoint[]
  onOpen: () => void
  /** De quién es la serie (p. ej. «Mi cuenta»); sin él, todo el hogar. */
  viewLabel?: string
}

export function EvolutionCard({ points, onOpen, viewLabel }: EvolutionCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      data-tour="evolution"
      className="w-full text-left bg-card rounded-2xl shadow-lg border p-6 space-y-4 hover:bg-muted/40 transition-colors"
    >
      <span className="flex items-center justify-between">
        <span className="text-lg font-semibold text-foreground flex items-center gap-2">
          <LineChart className="h-5 w-5" />
          Evolución
        </span>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </span>
      <EvolutionChart points={points} compact />
      <span className="block text-xs text-muted-foreground">
        {viewLabel ? `${viewLabel} · ` : ""}Últimos 6 meses · pulsa para ver el detalle
      </span>
    </button>
  )
}
