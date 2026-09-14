/**
 * @file lib/money.ts
 * @description Aritmética monetaria canónica de la aplicación. Todo importe se normaliza
 *              a céntimos enteros antes de operar y vuelve a euros ya redondeado a 2 decimales.
 *
 *              REGLA GENERAL: comparar es seguro; sumar y restar NO lo es.
 *              La coma flotante no rompe el orden de dos valores redondeados, pero sí el
 *              resultado de operar con ellos: `1234.57 - 1000` da `234.56999999999994`
 *              aunque ambos operandos tengan solo 2 decimales. Por eso ninguna otra parte
 *              del código debe sumar, restar ni repartir dinero con los operadores nativos.
 */

/** Número de céntimos por unidad monetaria. */
const CENTS = 100

/**
 * @function toCents
 * @description Convierte un importe en euros a céntimos enteros. Redondea el medio céntimo
 *              "alejándose de cero" (0,005 -> 1 céntimo; -0,005 -> -1), que es el convenio
 *              monetario y el que usa `Intl.NumberFormat`.
 *
 *              El factor `(1 + Number.EPSILON)` compensa el error de representación binaria.
 *              Tiene que ser MULTIPLICATIVO, no aditivo: `Number.EPSILON` es un ULP *de 1.0*,
 *              así que sumarlo a un valor de magnitud 8 no corrige nada. Ejemplo real:
 *              `8.165 * 100` vale `816.4999999999999` en IEEE-754 y sin la corrección se
 *              redondearía a 816 (8,16 €) mientras `formatCurrency` imprimiría "8,17 €".
 * @param {number} value - Importe en euros.
 * @returns {number} El importe en céntimos enteros. 0 si el valor no es finito.
 */
export function toCents(value: number): number {
  if (!Number.isFinite(value)) return 0
  const sign = value < 0 ? -1 : 1
  return sign * Math.round(Math.abs(value) * CENTS * (1 + Number.EPSILON))
}

/**
 * @function fromCents
 * @description Convierte céntimos enteros a euros. Normaliza el cero negativo para que
 *              `formatCurrency` nunca imprima "-0,00 €" (ni se pinte en rojo un balance
 *              que en realidad es cero).
 * @param {number} cents - Importe en céntimos.
 * @returns {number} El importe en euros con 2 decimales.
 */
export function fromCents(cents: number): number {
  if (!Number.isFinite(cents)) return 0
  const rounded = Math.round(cents)
  return rounded === 0 ? 0 : rounded / CENTS
}

/**
 * @function roundMoney
 * @description Redondea un importe a 2 decimales. Es idempotente:
 *              `roundMoney(roundMoney(x)) === roundMoney(x)`.
 * @param {number} value - Importe en euros.
 * @returns {number} El importe redondeado.
 */
export function roundMoney(value: number): number {
  return fromCents(toCents(value))
}

/**
 * @function addMoney
 * @description Suma exacta de importes. `addMoney(0.1, 0.2)` devuelve `0.3`, no
 *              `0.30000000000000004`.
 * @param {...number} values - Importes en euros.
 * @returns {number} La suma redondeada a 2 decimales.
 */
export function addMoney(...values: number[]): number {
  return fromCents(values.reduce((acc, v) => acc + toCents(v), 0))
}

/**
 * @function subtractMoney
 * @description Resta exacta. `subtractMoney(1234.57, 1000)` devuelve `234.57`; con el
 *              operador `-` nativo saldría `234.56999999999994`.
 * @param {number} a - Minuendo en euros.
 * @param {number} b - Sustraendo en euros.
 * @returns {number} La diferencia redondeada a 2 decimales.
 */
export function subtractMoney(a: number, b: number): number {
  return fromCents(toCents(a) - toCents(b))
}

/**
 * @function sumMoney
 * @description Suma exacta de una lista de importes.
 * @param {number[]} values - Importes en euros.
 * @returns {number} La suma redondeada a 2 decimales.
 */
export function sumMoney(values: number[]): number {
  return addMoney(...values)
}

/**
 * @function isZeroMoney
 * @description Indica si un importe es exactamente cero tras redondear a céntimos.
 *              Sustituye a los umbrales del tipo `Math.abs(x) < 0.01`.
 * @param {number} value - Importe en euros.
 * @returns {boolean} `true` si el importe es cero al céntimo.
 */
export function isZeroMoney(value: number): boolean {
  return toCents(value) === 0
}

/**
 * @function normalizePercentage
 * @description Normaliza un porcentaje a entero 0-100. Los sliders del formulario ya lo
 *              garantizan; esto blinda los datos importados o editados a mano.
 * @param {number | undefined | null} value - Porcentaje a normalizar.
 * @returns {number} Un entero entre 0 y 100. 50 si el valor no es utilizable.
 */
export function normalizePercentage(value: number | undefined | null): number {
  if (!Number.isFinite(value as number)) return 50
  return Math.min(100, Math.max(0, Math.round(value as number)))
}

/**
 * @function splitCentsByPercentage
 * @description Reparte un importe en céntimos entre dos personas según el porcentaje de la
 *              Persona 1. El porcentaje de la Persona 2 se DERIVA como `100 - p1`: así el
 *              reparto cuadra aunque los datos almacenados tengan porcentajes incoherentes.
 *
 *              GARANTÍA: `parte1 + parte2 === cents`, siempre, para cualquier entrada.
 *
 *              El céntimo sobrante (siempre 0 o 1) se asigna por el método del resto mayor
 *              (Hamilton), determinista y sin depender del orden de iteración:
 *                1. A quien tenga el resto fraccionario mayor.
 *                2. Si empatan, a quien tenga el porcentaje mayor.
 *                3. Si también empata (50/50), a la Persona 1.
 *
 *              Se usa el resto mayor y no una regla fija ("siempre a P1") porque una regla
 *              fija sesga sistemáticamente en todos los repartos impares y, en un 90/10, le
 *              regalaría el céntimo a quien menos paga.
 * @param {number} cents - Importe total en céntimos.
 * @param {number} person1Percentage - Porcentaje de la Persona 1 (0-100).
 * @returns {[number, number]} Las dos partes en céntimos.
 */
export function splitCentsByPercentage(cents: number, person1Percentage: number): [number, number] {
  const sign = cents < 0 ? -1 : 1
  const abs = Math.abs(Math.round(cents))

  const p1 = normalizePercentage(person1Percentage)
  const p2 = 100 - p1

  // Numeradores exactos (enteros): la parte de la persona 1 es (abs * p1) / 100.
  const exact1 = abs * p1
  const exact2 = abs * p2

  let c1 = Math.floor(exact1 / 100)
  let c2 = Math.floor(exact2 / 100)

  // El sobrante siempre es 0 o 1, porque exact1 + exact2 = abs * 100.
  const leftover = abs - c1 - c2
  if (leftover === 1) {
    const rest1 = exact1 % 100
    const rest2 = exact2 % 100
    if (rest1 > rest2) c1 += 1
    else if (rest2 > rest1) c2 += 1
    else if (p1 >= p2) c1 += 1
    else c2 += 1
  }

  return [sign * c1, sign * c2]
}

/**
 * @function splitMoneyByPercentage
 * @description Igual que `splitCentsByPercentage`, con entrada y salida en euros.
 * @param {number} amount - Importe total en euros.
 * @param {number} person1Percentage - Porcentaje de la Persona 1 (0-100).
 * @returns {[number, number]} Las dos partes en euros, que suman exactamente el total.
 */
export function splitMoneyByPercentage(amount: number, person1Percentage: number): [number, number] {
  const [c1, c2] = splitCentsByPercentage(toCents(amount), person1Percentage)
  return [fromCents(c1), fromCents(c2)]
}

/**
 * @function isAmountDraft
 * @description Valida un BORRADOR de importe mientras se teclea. Acepta coma o punto como
 *              separador decimal (el teclado numérico español emite coma), permite estados
 *              intermedios ("" y "12,") y RECHAZA cualquier tercer decimal.
 *
 *                ""        -> true (borrador válido, vale 0)
 *                "12"      -> true
 *                "12,"     -> true
 *                "12,34"   -> true
 *                "12,345"  -> false  <- el tercer decimal nunca llega a pintarse
 *                "12.34.5" -> false
 * @param {string} raw - El texto completo que quedaría en el input.
 * @param {{ allowNegative?: boolean }} [options] - Permitir el signo negativo.
 * @returns {boolean} `true` si el borrador es aceptable.
 */
export function isAmountDraft(raw: string, options: { allowNegative?: boolean } = {}): boolean {
  const pattern = options.allowNegative ? /^-?\d{0,9}(?:[.,]\d{0,2})?$/ : /^\d{0,9}(?:[.,]\d{0,2})?$/
  return pattern.test(raw)
}

/**
 * @function parseAmountInput
 * @description Convierte un borrador de input ("12,34") en número (12.34).
 * @param {string} raw - El texto del input.
 * @returns {number} El importe redondeado. 0 si está vacío o no es parseable.
 */
export function parseAmountInput(raw: string): number {
  const parsed = Number.parseFloat(raw.replace(",", "."))
  return Number.isFinite(parsed) ? roundMoney(parsed) : 0
}

/**
 * @function formatAmountForInput
 * @description Representación canónica de un importe para el input: coma decimal y
 *              2 decimales. Se aplica al salir del campo para normalizar "12," -> "12,00".
 * @param {number} value - Importe en euros.
 * @param {{ emptyWhenZero?: boolean }} [options] - Mostrar el campo vacío cuando vale 0.
 * @returns {string} El texto a mostrar en el input.
 */
export function formatAmountForInput(value: number, options: { emptyWhenZero?: boolean } = {}): string {
  if (options.emptyWhenZero && toCents(value) === 0) return ""
  return roundMoney(value).toFixed(2).replace(".", ",")
}

/**
 * @function formatCurrency
 * @description Formatea un importe como moneda en euros (es-ES). Redondea antes de formatear
 *              para que el número calculado y el mostrado nunca diverjan, y para que un
 *              residuo negativo diminuto salga como "0,00 €" y no como "-0,00 €".
 * @param {number} amount - La cantidad numérica a formatear.
 * @returns {string} La cantidad formateada (ej. "1.234,56 €").
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(roundMoney(amount))
}
