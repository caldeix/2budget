/**
 * @file lib/validate-data.ts
 * @description Comprobación de un archivo importado (3.1.0). Antes solo se miraba que fuera un objeto:
 *              una transacción sin fecha rompía la app en cada arranque, y un importe en texto
 *              pasaba a 0 sin avisar. Ahora un archivo con algún dato que la app no sabe leer se
 *              rechaza entero, diciendo qué falla, y no se sustituye nada.
 */

const TYPES = new Set(["income", "expense", "contribution"])
const OWNERS = new Set(["person1", "person2", "both"])
const DATE = /^\d{4}-\d{2}-\d{2}/
// Problemas que se enseñan como ejemplo (el resto se cuentan).
const MAX_EXAMPLES = 3

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null
const isAmount = (value: unknown) => typeof value === "number" && Number.isFinite(value)

/** Qué le falta a una transacción, o `null` si se puede usar. */
function transactionProblem(t: unknown): string | null {
  if (!isObject(t)) return "no es una transacción"
  if (typeof t.id !== "string" || !t.id) return "no tiene id"
  if (typeof t.type !== "string" || !TYPES.has(t.type)) return "tiene un tipo desconocido"
  if (typeof t.date !== "string" || !DATE.test(t.date)) return "no tiene una fecha válida"
  if (!isAmount(t.amount)) return "no tiene un importe numérico"
  if (typeof t.owner !== "string" || !OWNERS.has(t.owner)) return "no tiene a quién corresponde"
  if (t.tag !== undefined && typeof t.tag !== "string") return "tiene una etiqueta que no es texto"
  return null
}

/** Qué le falta a un informe, o `null` si se puede usar. */
function reportProblem(r: unknown): string | null {
  if (!isObject(r)) return "no es un informe"
  if (!Number.isInteger(r.month) || (r.month as number) < 1 || (r.month as number) > 12) return "no tiene un mes válido"
  if (!Number.isInteger(r.year)) return "no tiene un año válido"
  for (const field of ["person1RealMoney", "person2RealMoney", "person1Adjustment", "person2Adjustment"]) {
    if (r[field] !== undefined && !isAmount(r[field])) return `tiene "${field}" no numérico`
  }
  if (r.transactions !== undefined && !Array.isArray(r.transactions)) return "tiene las transacciones mal"
  const archived = Array.isArray(r.transactions) ? r.transactions.find((t) => transactionProblem(t)) : undefined
  if (archived !== undefined) return `guarda una transacción que ${transactionProblem(archived)}`
  return null
}

const GOAL_OWNERS = new Set(["person1", "person2", "shared"])

/** Qué le falta a una meta de ahorro (3.3.0), o `null` si se puede usar. */
function goalProblem(g: unknown): string | null {
  if (!isObject(g)) return "no es una meta"
  if (typeof g.id !== "string" || !g.id) return "no tiene id"
  if (typeof g.name !== "string" || !g.name.trim()) return "no tiene nombre"
  if (typeof g.owner !== "string" || !GOAL_OWNERS.has(g.owner)) return "no tiene de quién es"
  if (!isAmount(g.allocated) || (g.allocated as number) < 0) return "no tiene un importe asignado válido"
  if (g.target !== undefined && !isAmount(g.target)) return "tiene un objetivo no numérico"
  if (typeof g.createdAt !== "string") return "no tiene fecha de creación"
  return null
}

/** Nombre para enseñar en el mensaje. */
function label(item: unknown, fallback: string): string {
  if (isObject(item) && typeof item.name === "string" && item.name) return `"${item.name}"`
  if (isObject(item) && Number.isInteger(item.month) && Number.isInteger(item.year)) return `${item.month}/${item.year}`
  return fallback
}

/**
 * @function validateImportedData
 * @description Revisa el JSON ya leído de un archivo exportado.
 * @param {unknown} raw - El contenido del archivo.
 * @returns {string | null} Por qué no se puede importar, o `null` si es válido.
 */
export function validateImportedData(raw: unknown): string | null {
  if (!isObject(raw)) return "El archivo no contiene datos de 2Budget."
  if (raw.transactions !== undefined && !Array.isArray(raw.transactions)) return "Las transacciones del archivo no son una lista."
  if (raw.reports !== undefined && !Array.isArray(raw.reports)) return "Los informes del archivo no son una lista."
  if (raw.config !== undefined && !isObject(raw.config)) return "La configuración del archivo no es válida."
  if (raw.goals !== undefined && !Array.isArray(raw.goals)) return "Las metas del archivo no son una lista."
  if (raw.transactions === undefined && raw.reports === undefined) return "El archivo no contiene transacciones ni informes."

  const problems: string[] = []
  const transactions = (raw.transactions as unknown[] | undefined) ?? []
  transactions.forEach((t, i) => {
    const problem = transactionProblem(t)
    if (problem) problems.push(`la transacción ${label(t, `nº ${i + 1}`)} ${problem}`)
  })
  const reports = (raw.reports as unknown[] | undefined) ?? []
  reports.forEach((r, i) => {
    const problem = reportProblem(r)
    if (problem) problems.push(`el informe ${label(r, `nº ${i + 1}`)} ${problem}`)
  })
  const goals = (raw.goals as unknown[] | undefined) ?? []
  goals.forEach((g, i) => {
    const problem = goalProblem(g)
    if (problem) problems.push(`la meta ${label(g, `nº ${i + 1}`)} ${problem}`)
  })
  if (problems.length === 0) return null

  const examples = problems.slice(0, MAX_EXAMPLES).join("; ")
  const more = problems.length > MAX_EXAMPLES ? ` y ${problems.length - MAX_EXAMPLES} más` : ""
  return `No se ha importado nada: ${examples}${more}.`
}
