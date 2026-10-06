/**
 * @file lib/cloud/crypto.ts
 * @description Cifrado de extremo a extremo con la Web Crypto API del navegador (sin librerías).
 *
 *              Esquema:
 *              - **DEK** (clave del hogar): AES-256-GCM aleatoria. Cifra cada transacción,
 *                informe y la configuración. Es la misma para todos los miembros del hogar.
 *              - **KEK** (clave de cada usuario): sale de su contraseña maestra con PBKDF2-SHA256
 *                y una sal aleatoria. Solo sirve para cifrar ("envolver") su copia de la DEK.
 *              - La contraseña maestra NUNCA se guarda, ni cifrada: en Firestore solo hay la sal y
 *                la DEK envuelta. Si la contraseña no es la correcta, desenvolver la DEK falla
 *                (AES-GCM verifica la integridad), y así se comprueba sin guardar ningún hash.
 *              - Cada documento cifrado lleva como "datos asociados" su tipo e id: un documento
 *                cifrado no se puede hacer pasar por otro.
 */

/** Iteraciones de PBKDF2 para la contraseña maestra (recomendación OWASP para SHA-256). */
export const MASTER_KDF_ITERATIONS = 600_000

/** Iteraciones para el secreto aleatorio de las invitaciones (ya tiene mucha entropía). */
export const INVITE_KDF_ITERATIONS = 100_000

/** Longitud mínima de la contraseña maestra. */
export const MIN_MASTER_PASSWORD_LENGTH = 8

const encoder = new TextEncoder()
const decoder = new TextDecoder()

// ---------------------------------------------------------------------------
// Base64
// ---------------------------------------------------------------------------

export function toBase64(bytes: Uint8Array): string {
  let binary = ""
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

export function fromBase64(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes
}

// ---------------------------------------------------------------------------
// Claves
// ---------------------------------------------------------------------------

/**
 * @function generateDek
 * @description Genera la clave del hogar. Es extraíble para poder envolverla (para cada
 *              miembro, la invitación y el código de recuperación).
 */
export function generateDek(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"])
}

/**
 * @function deriveKek
 * @description Deriva una clave para envolver la DEK a partir de una contraseña (o secreto) y su sal.
 * @param {string} password - Contraseña maestra o secreto de la invitación.
 * @param {Uint8Array} salt - Sal aleatoria (16 bytes) guardada junto a la DEK envuelta.
 * @param {number} iterations - Iteraciones de PBKDF2.
 */
export async function deriveKek(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"])
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["wrapKey", "unwrapKey"],
  )
}

/**
 * @interface WrappedKey
 * @description DEK envuelta con una KEK, tal como se guarda en Firestore.
 */
export interface WrappedKey {
  /** Sal de PBKDF2 (base64). */
  salt: string
  /** Vector de inicialización del envoltorio (base64). */
  iv: string
  /** DEK cifrada (base64). */
  wrappedKey: string
  /** Iteraciones de PBKDF2 usadas: permite subirlas en el futuro sin romper lo existente. */
  iterations: number
}

/**
 * @function wrapDek
 * @description Envuelve la DEK con una contraseña o secreto. Genera sal e IV nuevos.
 */
export async function wrapDek(dek: CryptoKey, password: string, iterations: number): Promise<WrappedKey> {
  const salt = randomBytes(16)
  const iv = randomBytes(12)
  const kek = await deriveKek(password, salt, iterations)
  const wrapped = await crypto.subtle.wrapKey("raw", dek, kek, { name: "AES-GCM", iv })
  return { salt: toBase64(salt), iv: toBase64(iv), wrappedKey: toBase64(new Uint8Array(wrapped)), iterations }
}

/** Error al desenvolver: contraseña o secreto incorrectos. */
export class WrongPasswordError extends Error {
  name = "WrongPasswordError"
  constructor() {
    super("La contraseña maestra no es correcta.")
  }
}

/**
 * @function unwrapDek
 * @description Recupera la DEK con la contraseña o secreto. Si no es el correcto, lanza
 *              `WrongPasswordError` (AES-GCM detecta que el envoltorio no corresponde).
 * @param {boolean} extractable - `true` solo si hay que volver a envolverla (invitar, cambiar
 *              la contraseña, recuperación). La copia que se guarda en el dispositivo no lo es.
 */
export async function unwrapDek(stored: WrappedKey, password: string, extractable: boolean): Promise<CryptoKey> {
  const kek = await deriveKek(password, fromBase64(stored.salt), stored.iterations)
  try {
    return await crypto.subtle.unwrapKey(
      "raw",
      fromBase64(stored.wrappedKey),
      kek,
      { name: "AES-GCM", iv: fromBase64(stored.iv) },
      { name: "AES-GCM", length: 256 },
      extractable,
      ["encrypt", "decrypt"],
    )
  } catch {
    throw new WrongPasswordError()
  }
}

/**
 * @function toNonExtractable
 * @description Copia no extraíble de la DEK, para guardarla en el dispositivo: se puede usar
 *              para cifrar y descifrar, pero nadie puede leer sus bytes.
 */
export async function toNonExtractable(dek: CryptoKey): Promise<CryptoKey> {
  const raw = await crypto.subtle.exportKey("raw", dek)
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"])
}

// ---------------------------------------------------------------------------
// Datos
// ---------------------------------------------------------------------------

/**
 * @function encryptJson
 * @description Cifra un valor JSON con la DEK. Resultado: base64 de IV (12 bytes) + texto cifrado.
 * @param {string} context - Tipo e id del documento (p. ej. "transaction:abc123"), ligado al cifrado.
 */
export async function encryptJson(dek: CryptoKey, value: unknown, context: string): Promise<string> {
  const iv = randomBytes(12)
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode(context) },
    dek,
    encoder.encode(JSON.stringify(value)),
  )
  const out = new Uint8Array(iv.length + cipher.byteLength)
  out.set(iv, 0)
  out.set(new Uint8Array(cipher), iv.length)
  return toBase64(out)
}

/**
 * @function decryptJson
 * @description Descifra un valor cifrado con `encryptJson`. Falla si la clave o el contexto no coinciden.
 */
export async function decryptJson<T>(dek: CryptoKey, encrypted: string, context: string): Promise<T> {
  const bytes = fromBase64(encrypted)
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: bytes.slice(0, 12), additionalData: encoder.encode(context) },
    dek,
    bytes.slice(12),
  )
  return JSON.parse(decoder.decode(plain)) as T
}

// ---------------------------------------------------------------------------
// Secretos legibles (invitaciones y, en el paso 16, el código de recuperación)
// ---------------------------------------------------------------------------

/** Letras y números sin los que se confunden (0/O, 1/I/L). */
export const READABLE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

/**
 * @function randomReadable
 * @description Cadena aleatoria con el alfabeto legible. Usa muestreo por rechazo para que
 *              todos los caracteres sean igual de probables.
 */
export function randomReadable(length: number): string {
  const max = 256 - (256 % READABLE_ALPHABET.length)
  let out = ""
  while (out.length < length) {
    for (const b of randomBytes(length * 2)) {
      if (b < max && out.length < length) out += READABLE_ALPHABET[b % READABLE_ALPHABET.length]
    }
  }
  return out
}

/** Agrupa un código en bloques de 4 para leerlo y dictarlo mejor (p. ej. "K7M2-QX9P-…"). */
export function formatCode(code: string): string {
  return code.match(/.{1,4}/g)?.join("-") ?? code
}

/** Normaliza un código escrito por el usuario: sin guiones ni espacios y en mayúsculas. */
export function normalizeCode(input: string): string {
  return input.replace(/[\s-]/g, "").toUpperCase()
}
