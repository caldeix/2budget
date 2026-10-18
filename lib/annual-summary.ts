/**
 * @file lib/annual-summary.ts
 * @description Resumen de un año (3.6.0): totales, por persona, por categoría y por mes, para tener a
 *              mano lo del año (p. ej. para la declaración de la renta) y exportarlo a Excel (CSV) o
 *              imprimirlo. Se calcula igual que las tarjetas del resumen (con los gastos no
 *              computables). Las aportaciones a la compartida no son ingreso ni gasto: van aparte.
 *              Los ajustes de cierre cuentan en los totales y salen como su propia fila.
 */

import type { AppConfig, Transaction } from "@/types"
import { aggregateTransactions, isClosingAdjustment, isContribution } from "@/lib/aggregations"
import { categoryNameOf } from "@/lib/categories"
import { addMoney, subtractMoney } from "@/lib/money"
import { formatCurrency, getMonthName } from "@/lib/utils"

/** Nombre de la fila de los ajustes de cierre en las tablas por categoría. */
export const ADJUSTMENTS_LABEL = "Ajustes de cierre"

export interface CategoryRow {
  name: string
  amount: number
  /** Parte del total (0-100). */
  share: number
}

export interface MonthRow {
  month: number
  income: number
  expenses: number
  savings: number
}

export interface AnnualSummary {
  year: number
  income: number
  expenses: number
  savings: number
  nonComputable: number
  /** Por persona (ingresos y gastos con su parte de lo compartido, como las tarjetas del resumen). */
  people: { name: string; income: number; expenses: number; balance: number; contributed: number }[]
  expensesByCategory: CategoryRow[]
  incomeByCategory: CategoryRow[]
  months: MonthRow[]
}

/** Años con transacciones, del más reciente al más antiguo. */
export function summaryYears(transactions: Transaction[]): number[] {
  return [...new Set(transactions.map((t) => Number(t.date.slice(0, 4))))].sort((a, b) => b - a)
}

/** Agrupa por nombre de categoría (los ajustes de cierre, en su fila) y calcula la parte de cada uno. */
function byCategory(list: Transaction[], config: AppConfig, total: number): CategoryRow[] {
  const sums = new Map<string, number[]>()
  for (const t of list) {
    const name = isClosingAdjustment(t) ? ADJUSTMENTS_LABEL : categoryNameOf(config, t)
    const amounts = sums.get(name)
    if (amounts) amounts.push(t.amount)
    else sums.set(name, [t.amount])
  }
  return [...sums.entries()]
    .map(([name, amounts]) => {
      const amount = addMoney(...amounts)
      return { name, amount, share: total > 0 ? (amount / total) * 100 : 0 }
    })
    .sort((a, b) => b.amount - a.amount)
}

/**
 * @function annualSummary
 * @description Resumen del año `year`.
 */
export function annualSummary(transactions: Transaction[], config: AppConfig, year: number): AnnualSummary {
  const ofYear = transactions.filter((t) => t.date.startsWith(`${year}-`))
  const totals = aggregateTransactions(ofYear)
  const contributed = (owner: "person1" | "person2") =>
    addMoney(...ofYear.filter((t) => isContribution(t) && t.owner === owner).map((t) => t.amount))

  const people = [
    { name: config.person1Name, income: totals.person1Income, expenses: totals.person1Expenses, contributed: contributed("person1") },
    ...(config.singleMode
      ? []
      : [{ name: config.person2Name, income: totals.person2Income, expenses: totals.person2Expenses, contributed: contributed("person2") }]),
  ].map((p) => ({ ...p, balance: subtractMoney(p.income, p.expenses) }))

  const months: MonthRow[] = []
  for (let month = 1; month <= 12; month++) {
    const key = `${year}-${String(month).padStart(2, "0")}`
    const list = ofYear.filter((t) => t.date.startsWith(key))
    if (list.length === 0) continue
    const m = aggregateTransactions(list)
    months.push({ month, income: m.totalIncome, expenses: m.totalExpenses, savings: subtractMoney(m.totalIncome, m.totalExpenses) })
  }

  return {
    year,
    income: totals.totalIncome,
    expenses: totals.totalExpenses,
    savings: subtractMoney(totals.totalIncome, totals.totalExpenses),
    nonComputable: totals.nonComputableExpenses,
    people,
    expensesByCategory: byCategory(ofYear.filter((t) => t.type === "expense"), config, totals.totalExpenses),
    incomeByCategory: byCategory(ofYear.filter((t) => t.type === "income"), config, totals.totalIncome),
    months,
  }
}

// --- Exportar -----------------------------------------------------------------------------

/** Importe con coma decimal y sin símbolo (lo que Excel en español reconoce como número). */
const csvAmount = (value: number) => value.toFixed(2).replace(".", ",")
const csvCell = (value: string) => (/[;"\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value)
const csvRow = (cells: (string | number)[]) => cells.map((c) => (typeof c === "number" ? csvAmount(c) : csvCell(c))).join(";")

/**
 * @function annualSummaryCsv
 * @description El resumen en CSV para Excel en español: separado por punto y coma, coma decimal y
 *              con BOM para que respete las tildes.
 */
export function annualSummaryCsv(summary: AnnualSummary): string {
  const lines: string[] = [
    csvRow([`Resumen de ${summary.year}`]),
    "",
    csvRow(["Ingresos", summary.income]),
    csvRow(["Gastos", summary.expenses]),
    csvRow(["Ahorro", summary.savings]),
    csvRow(["De los gastos, no computables", summary.nonComputable]),
    "",
    csvRow(["Persona", "Ingresos", "Gastos", "Balance", "Aportado a la compartida"]),
    ...summary.people.map((p) => csvRow([p.name, p.income, p.expenses, p.balance, p.contributed])),
    "",
    csvRow(["Gastos por categoría", "Importe", "% del total"]),
    ...summary.expensesByCategory.map((c) => csvRow([c.name, c.amount, c.share])),
    "",
    csvRow(["Ingresos por categoría", "Importe", "% del total"]),
    ...summary.incomeByCategory.map((c) => csvRow([c.name, c.amount, c.share])),
    "",
    csvRow(["Mes", "Ingresos", "Gastos", "Ahorro"]),
    ...summary.months.map((m) => csvRow([getMonthName(m.month), m.income, m.expenses, m.savings])),
  ]
  return `﻿${lines.join("\r\n")}\r\n`
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

/**
 * @function annualSummaryHtml
 * @description El resumen como documento HTML sencillo para imprimirlo o guardarlo en PDF desde el
 *              diálogo de impresión del navegador.
 */
export function annualSummaryHtml(summary: AnnualSummary): string {
  const money = (v: number) => escapeHtml(formatCurrency(v))
  const pct = (v: number) => `${v.toFixed(1).replace(".", ",")} %`
  const table = (head: string[], rows: string[][]) =>
    `<table><thead><tr>${head.map((h, i) => `<th${i ? ' class="n"' : ""}>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${rows
      .map((r) => `<tr>${r.map((c, i) => `<td${i ? ' class="n"' : ""}>${c}</td>`).join("")}</tr>`)
      .join("")}</tbody></table>`
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Resumen de ${summary.year} · 2Budget</title>
<style>
body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#1a1a1a;margin:32px;font-size:13px}
h1{font-size:22px;margin:0 0 4px}h2{font-size:15px;margin:24px 0 8px}p{margin:0;color:#555}
table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #ddd}
th{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#666}.n{text-align:right;font-variant-numeric:tabular-nums}
.totals{display:flex;gap:24px;margin-top:16px}.totals div{border:1px solid #ddd;border-radius:8px;padding:8px 12px}
.totals b{display:block;font-size:16px}@media print{body{margin:16px}}
</style></head><body>
<h1>Resumen de ${summary.year}</h1><p>2Budget · ${escapeHtml(new Date().toLocaleDateString("es-ES"))}</p>
<div class="totals"><div>Ingresos<b>${money(summary.income)}</b></div><div>Gastos<b>${money(summary.expenses)}</b></div><div>Ahorro<b>${money(summary.savings)}</b></div></div>
<p style="margin-top:8px">De los gastos, no computables: ${money(summary.nonComputable)}</p>
<h2>Por persona</h2>${table(["Persona", "Ingresos", "Gastos", "Balance", "Aportado a la compartida"], summary.people.map((p) => [escapeHtml(p.name), money(p.income), money(p.expenses), money(p.balance), money(p.contributed)]))}
<h2>Gastos por categoría</h2>${table(["Categoría", "Importe", "% del total"], summary.expensesByCategory.map((c) => [escapeHtml(c.name), money(c.amount), pct(c.share)]))}
<h2>Ingresos por categoría</h2>${table(["Categoría", "Importe", "% del total"], summary.incomeByCategory.map((c) => [escapeHtml(c.name), money(c.amount), pct(c.share)]))}
<h2>Por mes</h2>${table(["Mes", "Ingresos", "Gastos", "Ahorro"], summary.months.map((m) => [escapeHtml(getMonthName(m.month)), money(m.income), money(m.expenses), money(m.savings)]))}
</body></html>`
}
