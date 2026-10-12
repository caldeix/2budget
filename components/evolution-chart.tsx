/**
 * @file components/evolution-chart.tsx
 * @description Gráfico SVG de evolución mensual: barras de ingresos y gastos por mes y, en la
 *              versión completa, la línea del ahorro, los importes del eje y una tabla debajo
 *              (en el móvil no hay "pasar el ratón", así que las cifras van siempre a la vista).
 */

"use client"

import { formatCurrency } from "@/lib/utils"
import { shortMonthName, type MonthPoint } from "@/lib/evolution"

const INCOME = "hsl(var(--green-600))"
const EXPENSES = "hsl(var(--red-600))"
const SAVINGS = "hsl(var(--primary))"

interface EvolutionChartProps {
  points: MonthPoint[]
  /** Versión reducida para la tarjeta del lateral: solo barras y las iniciales de los meses. */
  compact?: boolean
}

/** Tope del eje: un número redondo por encima del máximo (p. ej. 4.000 para 3.950). */
function niceMax(value: number): number {
  if (value <= 0) return 100
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const steps = [1, 2, 2.5, 5, 10]
  for (const step of steps) if (value <= step * magnitude) return step * magnitude
  return 10 * magnitude
}

/** Importe del eje, corto: 0, 500, 1,3k, 2,5k, 5k. */
function axisLabel(value: number): string {
  if (value < 1000) return String(Math.round(value))
  const k = value / 1000
  return `${(Number.isInteger(k) ? k : k.toFixed(1)).toString().replace(".", ",")}k`
}

export function EvolutionChart({ points, compact = false }: EvolutionChartProps) {
  const width = compact ? 260 : 640
  const height = compact ? 90 : 260
  const padLeft = compact ? 4 : 56
  const padRight = 4
  const padTop = 8
  const padBottom = compact ? 16 : 24
  const innerW = width - padLeft - padRight
  const innerH = height - padTop - padBottom

  const max = niceMax(Math.max(...points.map((p) => Math.max(p.income, p.expenses)), 0))
  const slot = innerW / Math.max(points.length, 1)
  const barW = Math.max(2, Math.min(compact ? 8 : 18, slot * 0.3))
  const y = (value: number) => padTop + innerH - (Math.max(value, 0) / max) * innerH
  const xCenter = (i: number) => padLeft + slot * i + slot / 2
  const ticks = compact ? [] : [0, 0.25, 0.5, 0.75, 1].map((f) => f * max)

  // Línea del ahorro: puede ser negativo; se dibuja desde el 0 hacia abajo si hace falta.
  const savingsMin = Math.min(0, ...points.map((p) => p.savings))
  const ySavings = (value: number) => {
    const range = max - savingsMin
    return padTop + innerH - ((value - savingsMin) / range) * innerH
  }
  const savingsPath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xCenter(i)} ${ySavings(p.savings)}`).join(" ")

  return (
    <div className="space-y-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="Evolución mensual">
        {/* Rejilla e importes del eje (solo en la versión completa) */}
        {ticks.map((v) => (
          <g key={v}>
            <line x1={padLeft} x2={width - padRight} y1={y(v)} y2={y(v)} stroke="hsl(var(--border))" strokeWidth="1" />
            <text x={padLeft - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="hsl(var(--muted-foreground))">
              {axisLabel(v)}
            </text>
          </g>
        ))}
        {/* Barras: ingresos y gastos */}
        {points.map((p, i) => (
          <g key={p.key}>
            <rect x={xCenter(i) - barW - 1} y={y(p.income)} width={barW} height={y(0) - y(p.income)} rx="2" fill={INCOME} />
            <rect x={xCenter(i) + 1} y={y(p.expenses)} width={barW} height={y(0) - y(p.expenses)} rx="2" fill={EXPENSES} />
            <text
              x={xCenter(i)}
              y={height - 4}
              textAnchor="middle"
              fontSize={compact ? 10 : 11}
              fill="hsl(var(--muted-foreground))"
            >
              {compact ? shortMonthName(p.month).charAt(0).toUpperCase() : shortMonthName(p.month)}
            </text>
          </g>
        ))}
        {/* Línea del ahorro (versión completa) */}
        {!compact && points.length > 1 && (
          <>
            <path d={savingsPath} fill="none" stroke={SAVINGS} strokeWidth="2" />
            {points.map((p, i) => (
              <circle key={p.key} cx={xCenter(i)} cy={ySavings(p.savings)} r="3" fill={SAVINGS} />
            ))}
          </>
        )}
      </svg>

      {!compact && (
        <>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: INCOME }} /> Ingresos
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: EXPENSES }} /> Gastos
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded" style={{ backgroundColor: SAVINGS }} /> Ahorro
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm tabular-nums">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th className="text-left font-medium py-1">Mes</th>
                  <th className="text-right font-medium py-1">Ingresos</th>
                  <th className="text-right font-medium py-1">Gastos</th>
                  <th className="text-right font-medium py-1">Ahorro</th>
                </tr>
              </thead>
              <tbody>
                {points.map((p) => (
                  <tr key={p.key} className="border-t border-border">
                    <td className="py-1 capitalize text-foreground">{shortMonthName(p.month)}</td>
                    <td className="py-1 text-right text-green-600">{formatCurrency(p.income)}</td>
                    <td className="py-1 text-right text-red-600">{formatCurrency(p.expenses)}</td>
                    <td className={`py-1 text-right font-medium ${p.savings >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(p.savings)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
