/**
 * @file lib/cloud/repository.ts
 * @description Acceso a Firestore: perfil de usuario, hogar compartido, invitaciones y
 *              sincronización de los datos de la app, cifrados de extremo a extremo.
 *
 *              Modelo (ver `firestore.rules`):
 *                users/{uid}                          → perfil: hogar al que pertenece y email
 *                households/{hid}                     → miembros y `enc` (configuración cifrada)
 *                households/{hid}/keys/{uid}          → clave del hogar envuelta con la contraseña maestra de ese miembro
 *                households/{hid}/transactions/{id}   → `{ enc }`: una transacción cifrada por documento
 *                households/{hid}/reports/{id}        → `{ enc }`: un informe cifrado por documento
 *                invites/{id}                         → invitación de un solo uso (48 h), con la clave
 *                                                       envuelta con un secreto que solo va en el código
 *
 *              En Firestore no hay nada de los datos en claro: ni importes, ni nombres, ni fechas
 *              de las transacciones. Ver `lib/cloud/crypto.ts`.
 */

import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
  type DocumentSnapshot,
  type Firestore,
  type QuerySnapshot,
  type Unsubscribe,
  type WriteBatch,
} from "firebase/firestore"
import type { AppConfig, AppData, MonthlyReport, Transaction } from "@/types"
import { DATA_VERSION, defaultConfig, normalizeReport, normalizeTransaction } from "@/lib/storage"
import { diffAppData, isEmptyDiff, type AppDataDiff } from "@/lib/cloud/diff"
import {
  decryptJson,
  encryptJson,
  generateDek,
  INVITE_KDF_ITERATIONS,
  MASTER_KDF_ITERATIONS,
  normalizeCode,
  randomReadable,
  toNonExtractable,
  unwrapDek,
  wrapDek,
  WrongPasswordError,
  type WrappedKey,
} from "@/lib/cloud/crypto"
import { saveCachedDek } from "@/lib/cloud/vault-cache"

/** Rol de cada miembro en el hogar: quien lo crea es la Persona 1 y quien se une, la Persona 2. */
export type MemberRole = "person1" | "person2"

/**
 * @interface UserProfile
 * @description Perfil de un usuario en `users/{uid}`.
 */
export interface UserProfile {
  householdId: string | null
  email: string
  /** Email nuevo pendiente de confirmar por enlace (ver `requestEmailChange`). */
  pendingEmail?: string | null
  createdAt: string
}

/**
 * @interface HouseholdInfo
 * @description Datos del hogar que no forman parte de `AppData`.
 */
export interface HouseholdInfo {
  members: string[]
  roles: Record<string, MemberRole>
  memberEmails: Record<string, string>
}

/** Duración de un código de invitación. */
const INVITE_TTL_MS = 48 * 60 * 60 * 1000

/** Partes del código de invitación: id del documento + secreto que nunca se guarda. */
const INVITE_ID_LENGTH = 8
const INVITE_SECRET_LENGTH = 12

/**
 * Operaciones por lote. Firestore admite 500, pero las reglas comprueban en cada escritura que
 * el usuario es miembro del hogar (una lectura del hogar), y un lote solo admite 20 de esas
 * lecturas. Con 20 operaciones nunca se supera, aunque Firestore no las agrupe.
 */
const BATCH_LIMIT = 20

/** Versión del esquema de cifrado, guardada en el hogar (permite cambiarlo en el futuro). */
const CRYPTO_VERSION = 1

const userRef = (db: Firestore, uid: string) => doc(db, "users", uid)
const householdRef = (db: Firestore, hid: string) => doc(db, "households", hid)
const transactionsCol = (db: Firestore, hid: string) => collection(db, "households", hid, "transactions")
const reportsCol = (db: Firestore, hid: string) => collection(db, "households", hid, "reports")
const keyRef = (db: Firestore, hid: string, uid: string) => doc(db, "households", hid, "keys", uid)
const inviteRef = (db: Firestore, id: string) => doc(db, "invites", id)

/** "Datos asociados" de cada documento cifrado: lo liga a su tipo e id. */
const context = {
  household: (hid: string) => `household:${hid}`,
  transaction: (id: string) => `transaction:${id}`,
  report: (id: string) => `report:${id}`,
}

type BatchOp = (batch: WriteBatch) => void

/**
 * @function commitInChunks
 * @description Ejecuta operaciones en lotes de como mucho `BATCH_LIMIT`, uno detrás de otro,
 *              esperando la confirmación del servidor. Cada lote es atómico.
 */
async function commitInChunks(db: Firestore, ops: BatchOp[]): Promise<void> {
  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db)
    ops.slice(i, i + BATCH_LIMIT).forEach((op) => op(batch))
    await batch.commit()
  }
}

/** Ordena como en local: lo más reciente primero. */
function byCreatedAtDesc<T extends { createdAt: string }>(a: T, b: T): number {
  return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0
}

/** Error con mensaje para mostrar tal cual al usuario. */
export class HouseholdError extends Error {
  name = "HouseholdError"
}

// ---------------------------------------------------------------------------
// Perfil de usuario
// ---------------------------------------------------------------------------

/**
 * @function subscribeUserProfile
 * @description Escucha el perfil del usuario. Devuelve `null` si aún no existe.
 */
export function subscribeUserProfile(
  db: Firestore,
  uid: string,
  onProfile: (profile: UserProfile | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    userRef(db, uid),
    (snap) => onProfile(snap.exists() ? (snap.data() as UserProfile) : null),
    onError,
  )
}

/**
 * @function ensureUserProfile
 * @description Crea el perfil si no existe y lo mantiene al día con el email de la sesión.
 *              Tras confirmar un cambio de email, el nuevo se copia al perfil y al hogar.
 */
export async function ensureUserProfile(db: Firestore, uid: string, email: string): Promise<void> {
  const snap = await getDoc(userRef(db, uid))
  if (!snap.exists()) {
    const profile: UserProfile = { householdId: null, email, pendingEmail: null, createdAt: new Date().toISOString() }
    await setDoc(userRef(db, uid), profile)
    return
  }

  const profile = snap.data() as UserProfile
  if (profile.email === email) return

  const ops: BatchOp[] = [
    (batch) =>
      batch.update(userRef(db, uid), {
        email,
        // El cambio pendiente ya se confirmó: el email de la sesión es el nuevo.
        pendingEmail: profile.pendingEmail === email ? null : (profile.pendingEmail ?? null),
      }),
  ]
  if (profile.householdId) {
    const hid = profile.householdId
    ops.push((batch) => batch.update(householdRef(db, hid), { [`memberEmails.${uid}`]: email }))
  }
  await commitInChunks(db, ops)
}

/**
 * @function setPendingEmail
 * @description Guarda (o borra) el email nuevo pendiente de confirmar.
 */
export async function setPendingEmail(db: Firestore, uid: string, pendingEmail: string | null): Promise<void> {
  await updateDoc(userRef(db, uid), { pendingEmail })
}

// ---------------------------------------------------------------------------
// Clave del hogar (contraseña maestra)
// ---------------------------------------------------------------------------

/**
 * @function getOwnWrappedKey
 * @description Copia de la clave del hogar de este miembro, envuelta con su contraseña maestra.
 */
export async function getOwnWrappedKey(db: Firestore, hid: string, uid: string): Promise<WrappedKey> {
  const snap = await getDoc(keyRef(db, hid, uid))
  if (!snap.exists()) {
    throw new HouseholdError("No se encuentra tu clave de este hogar. Sal del hogar y vuelve a unirte con una invitación.")
  }
  return snap.data() as WrappedKey
}

/**
 * @function unlockHousehold
 * @description Desbloquea el hogar con la contraseña maestra: recupera la clave del hogar y
 *              guarda una copia no extraíble en este dispositivo.
 * @returns {Promise<CryptoKey>} La clave (no extraíble) para cifrar y descifrar.
 */
export async function unlockHousehold(db: Firestore, hid: string, uid: string, masterPassword: string): Promise<CryptoKey> {
  const dek = await unwrapDek(await getOwnWrappedKey(db, hid, uid), masterPassword, false)
  await saveCachedDek(uid, hid, dek)
  return dek
}

/**
 * @function unlockExtractableDek
 * @description Recupera la clave del hogar en versión extraíble, para volver a envolverla
 *              (invitar, cambiar la contraseña maestra). Exige la contraseña maestra.
 */
export async function unlockExtractableDek(db: Firestore, hid: string, uid: string, masterPassword: string): Promise<CryptoKey> {
  return unwrapDek(await getOwnWrappedKey(db, hid, uid), masterPassword, true)
}

/**
 * @function changeMasterPassword
 * @description Cambia la contraseña maestra: solo se vuelve a envolver la clave del hogar con
 *              la nueva. Los datos no se tocan.
 */
export async function changeMasterPassword(
  db: Firestore,
  hid: string,
  uid: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const dek = await unlockExtractableDek(db, hid, uid, currentPassword)
  await setDoc(keyRef(db, hid, uid), await wrapDek(dek, newPassword, MASTER_KDF_ITERATIONS))
}

// ---------------------------------------------------------------------------
// Datos del hogar
// ---------------------------------------------------------------------------

/**
 * @function createDecryptingCache
 * @description Descifra los documentos de un snapshot reutilizando los que no han cambiado
 *              (mismo `enc`): en cada cambio solo se descifra lo nuevo.
 */
function createDecryptingCache<T>(dek: CryptoKey, contextFor: (id: string) => string) {
  let cache = new Map<string, { enc: string; value: T }>()
  return async (snap: QuerySnapshot): Promise<T[]> => {
    const next = new Map<string, { enc: string; value: T }>()
    for (const d of snap.docs) {
      const raw = d.data()
      // Documentos de antes del cifrado (solo en pruebas): se leen tal cual y se cifran al reescribirlos.
      if (typeof raw.enc !== "string") {
        next.set(d.id, { enc: "", value: raw as T })
        continue
      }
      const cached = cache.get(d.id)
      const value = cached && cached.enc === raw.enc ? cached.value : await decryptJson<T>(dek, raw.enc, contextFor(d.id))
      next.set(d.id, { enc: raw.enc, value })
    }
    cache = next
    return [...next.values()].map((entry) => entry.value)
  }
}

/**
 * @function readHouseholdDoc
 * @description Descifra la configuración del hogar y extrae sus miembros.
 */
async function readHouseholdDoc(
  dek: CryptoKey,
  hid: string,
  snap: DocumentSnapshot,
): Promise<{ config: AppConfig; version: number; info: HouseholdInfo }> {
  const raw = snap.data() ?? {}
  const payload =
    typeof raw.enc === "string"
      ? await decryptJson<{ config: AppConfig; version: number }>(dek, raw.enc, context.household(hid))
      : { config: raw.config ?? {}, version: raw.version }
  return {
    config: { ...defaultConfig, ...(payload.config ?? {}) },
    version: typeof payload.version === "number" ? payload.version : DATA_VERSION,
    info: { members: raw.members ?? [], roles: raw.roles ?? {}, memberEmails: raw.memberEmails ?? {} },
  }
}

/**
 * @function subscribeHousehold
 * @description Escucha el hogar (documento + transacciones + informes), lo descifra y entrega
 *              un `AppData` completo cuando han llegado los tres. Con la caché local de
 *              Firestore, los cambios propios llegan al instante, aunque no haya conexión.
 * @param onLost - Se llama si el hogar deja de existir o ya no se tiene acceso.
 * @returns {Unsubscribe} Función para dejar de escuchar.
 */
export function subscribeHousehold(
  db: Firestore,
  hid: string,
  dek: CryptoKey,
  onData: (data: AppData, info: HouseholdInfo) => void,
  onLost: () => void,
  onError: (error: Error) => void,
): Unsubscribe {
  let household: { config: AppConfig; version: number; info: HouseholdInfo } | null = null
  let transactions: Transaction[] | null = null
  let reports: MonthlyReport[] | null = null
  let active = true
  // Descifrar es asíncrono: una cola mantiene el orden de los snapshots.
  let queue = Promise.resolve()

  const emit = () => {
    if (!active || !household || !transactions || !reports) return
    onData({ transactions, reports, config: household.config, version: household.version }, household.info)
  }

  const handleError = (error: Error & { code?: string }) => {
    if (!active) return
    if (error.code === "permission-denied") onLost()
    else if (error.name === "OperationError") {
      onError(new HouseholdError("No se pueden descifrar los datos del hogar con tu clave."))
    } else onError(error)
  }

  const enqueue = (work: () => Promise<void>) => {
    queue = queue.then(work).catch(handleError)
  }

  const decryptTransactions = createDecryptingCache<Transaction>(dek, context.transaction)
  const decryptReports = createDecryptingCache<MonthlyReport>(dek, context.report)

  const unsubscribers = [
    onSnapshot(
      householdRef(db, hid),
      (snap) => {
        if (!snap.exists()) {
          onLost()
          return
        }
        enqueue(async () => {
          household = await readHouseholdDoc(dek, hid, snap)
          emit()
        })
      },
      handleError,
    ),
    onSnapshot(
      transactionsCol(db, hid),
      (snap) =>
        enqueue(async () => {
          transactions = (await decryptTransactions(snap)).map(normalizeTransaction).sort(byCreatedAtDesc)
          emit()
        }),
      handleError,
    ),
    onSnapshot(
      reportsCol(db, hid),
      (snap) =>
        enqueue(async () => {
          reports = (await decryptReports(snap)).map(normalizeReport).sort(byCreatedAtDesc)
          emit()
        }),
      handleError,
    ),
  ]

  return () => {
    active = false
    unsubscribers.forEach((unsubscribe) => unsubscribe())
  }
}

/**
 * @function diffToOps
 * @description Convierte una diferencia en operaciones de escritura cifradas sobre el hogar.
 */
async function diffToOps(db: Firestore, hid: string, dek: CryptoKey, diff: AppDataDiff, next: AppData): Promise<BatchOp[]> {
  const ops: BatchOp[] = []
  if (diff.householdChanged) {
    const enc = await encryptJson(dek, { config: next.config, version: next.version ?? DATA_VERSION }, context.household(hid))
    // Se borran los campos en claro de los hogares de antes del cifrado (solo en pruebas).
    ops.push((batch) => batch.update(householdRef(db, hid), { enc, config: deleteField(), version: deleteField() }))
  }
  for (const t of diff.transactionsToSet) {
    const enc = await encryptJson(dek, t, context.transaction(t.id))
    ops.push((batch) => batch.set(doc(transactionsCol(db, hid), t.id), { enc }))
  }
  for (const id of diff.transactionIdsToDelete) ops.push((batch) => batch.delete(doc(transactionsCol(db, hid), id)))
  for (const r of diff.reportsToSet) {
    const enc = await encryptJson(dek, r, context.report(r.id))
    ops.push((batch) => batch.set(doc(reportsCol(db, hid), r.id), { enc }))
  }
  for (const id of diff.reportIdsToDelete) ops.push((batch) => batch.delete(doc(reportsCol(db, hid), id)))
  return ops
}

/**
 * @function writeChanges
 * @description Cifra y escribe en la nube la diferencia entre dos estados.
 *              La promesa se resuelve en cuanto el cambio está en la caché local de Firestore
 *              (al momento, también sin conexión); `acknowledged` se resuelve cuando lo confirma
 *              el servidor. Separarlo permite encadenar cambios sin esperar a la red.
 *              `changed` indica si había algo que escribir (si no, no llegará ningún snapshot nuevo).
 */
export async function writeChanges(
  db: Firestore,
  hid: string,
  dek: CryptoKey,
  prev: AppData,
  next: AppData,
): Promise<{ acknowledged: Promise<void>; changed: boolean }> {
  const diff = diffAppData(prev, next)
  if (isEmptyDiff(diff)) return { acknowledged: Promise.resolve(), changed: false }

  const ops = await diffToOps(db, hid, dek, diff, next)
  const commits: Promise<void>[] = []
  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db)
    ops.slice(i, i + BATCH_LIMIT).forEach((op) => op(batch))
    commits.push(batch.commit())
  }
  return { acknowledged: Promise.all(commits).then(() => undefined), changed: true }
}

// ---------------------------------------------------------------------------
// Hogar e invitaciones
// ---------------------------------------------------------------------------

/**
 * @function createHousehold
 * @description Crea un hogar con el usuario como único miembro (Persona 1): genera la clave del
 *              hogar, la envuelve con su contraseña maestra y sube los datos iniciales cifrados
 *              (vacíos o los que había en este dispositivo).
 * @returns {Promise<string>} El id del hogar.
 */
export async function createHousehold(
  db: Firestore,
  uid: string,
  email: string,
  initial: AppData,
  masterPassword: string,
): Promise<string> {
  const hid = doc(collection(db, "households")).id
  const dek = await generateDek()
  const ownKey = await wrapDek(dek, masterPassword, MASTER_KDF_ITERATIONS)
  const enc = await encryptJson(dek, { config: initial.config, version: initial.version ?? DATA_VERSION }, context.household(hid))

  // La clave queda guardada en el dispositivo ANTES de apuntar el perfil al hogar: así, al
  // cambiar de hogar, la app la encuentra y no pide la contraseña que se acaba de escribir.
  await saveCachedDek(uid, hid, await toNonExtractable(dek))

  // 1. Hogar, clave del miembro y perfil, juntos: nunca queda un hogar a medias.
  const batch = writeBatch(db)
  batch.set(householdRef(db, hid), {
    members: [uid],
    roles: { [uid]: "person1" },
    memberEmails: { [uid]: email },
    enc,
    cryptoVersion: CRYPTO_VERSION,
    createdBy: uid,
    createdAt: new Date().toISOString(),
  })
  batch.set(keyRef(db, hid, uid), ownKey)
  batch.set(userRef(db, uid), { householdId: hid }, { merge: true })
  await batch.commit()

  // 2. Los datos, cifrados y en lotes (pueden ser cientos de transacciones).
  const empty: AppData = { transactions: [], reports: [], config: initial.config, version: initial.version }
  const { acknowledged } = await writeChanges(db, hid, dek, empty, initial)
  await acknowledged
  return hid
}

/**
 * @function createInvite
 * @description Genera un código de invitación de un solo uso, válido 48 horas.
 *              El código tiene dos partes: el id del documento y un secreto con el que se
 *              envuelve la clave del hogar. El secreto NO se guarda en Firestore: solo lo tiene
 *              quien recibe el código, así que nadie más puede usar la invitación para leer los datos.
 * @param {CryptoKey} extractableDek - Clave del hogar extraíble (ver `unlockExtractableDek`).
 * @returns El código completo (20 caracteres) y su caducidad.
 */
export async function createInvite(
  db: Firestore,
  hid: string,
  uid: string,
  extractableDek: CryptoKey,
): Promise<{ code: string; expiresAt: Date }> {
  const id = randomReadable(INVITE_ID_LENGTH)
  const secret = randomReadable(INVITE_SECRET_LENGTH)
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS)
  await setDoc(inviteRef(db, id), {
    householdId: hid,
    createdBy: uid,
    expiresAt: Timestamp.fromDate(expiresAt),
    ...(await wrapDek(extractableDek, secret, INVITE_KDF_ITERATIONS)),
  })
  return { code: id + secret, expiresAt }
}

/**
 * @function joinHousehold
 * @description Une al usuario a un hogar con un código de invitación (pasa a ser la Persona 2):
 *              recupera la clave del hogar con el secreto del código y la vuelve a envolver con
 *              su propia contraseña maestra. Las reglas solo permiten añadir el propio uid, a un
 *              hogar de un miembro y con una invitación vigente de ese hogar.
 * @returns {Promise<string>} El id del hogar.
 */
export async function joinHousehold(
  db: Firestore,
  rawCode: string,
  uid: string,
  email: string,
  masterPassword: string,
): Promise<string> {
  const code = normalizeCode(rawCode)
  if (code.length !== INVITE_ID_LENGTH + INVITE_SECRET_LENGTH) {
    throw new HouseholdError("El código debe tener 20 caracteres. Revisa que esté completo.")
  }
  const id = code.slice(0, INVITE_ID_LENGTH)
  const secret = code.slice(INVITE_ID_LENGTH)

  const invite = await getDoc(inviteRef(db, id))
  if (!invite.exists()) throw new HouseholdError("El código no existe. Revisa que esté bien escrito.")

  const data = invite.data() as WrappedKey & { householdId: string; expiresAt: Timestamp }
  if (data.expiresAt.toMillis() < Date.now()) throw new HouseholdError("El código ha caducado. Pide uno nuevo.")

  let dek: CryptoKey
  try {
    dek = await unwrapDek(data, secret, true)
  } catch (error) {
    if (error instanceof WrongPasswordError) throw new HouseholdError("El código no es correcto. Revisa que esté bien escrito.")
    throw error
  }

  const householdId = data.householdId
  try {
    await updateDoc(householdRef(db, householdId), {
      members: arrayUnion(uid),
      [`roles.${uid}`]: "person2",
      [`memberEmails.${uid}`]: email,
      joinCode: id,
    })
  } catch (error) {
    if ((error as { code?: string }).code === "permission-denied") {
      throw new HouseholdError("No puedes unirte a este hogar: ya tiene dos miembros o el código no es válido.")
    }
    throw error
  }

  // Ya es miembro: su clave, guardada en el dispositivo y envuelta con su contraseña maestra;
  // después se apunta su perfil al hogar y se gasta la invitación.
  await saveCachedDek(uid, householdId, await toNonExtractable(dek))
  const batch = writeBatch(db)
  batch.set(keyRef(db, householdId, uid), await wrapDek(dek, masterPassword, MASTER_KDF_ITERATIONS))
  batch.set(userRef(db, uid), { householdId }, { merge: true })
  batch.delete(inviteRef(db, id))
  await batch.commit()
  return householdId
}

/**
 * @function leaveHousehold
 * @description Saca al usuario del hogar (y borra su clave). Si era el último miembro, borra el
 *              hogar y todos sus datos.
 */
export async function leaveHousehold(db: Firestore, hid: string, uid: string): Promise<void> {
  const snap = await getDoc(householdRef(db, hid))
  const members: string[] = snap.exists() ? (snap.data().members ?? []) : []

  if (members.length > 1) {
    // Queda el otro miembro: solo se sale este. Su clave, el hogar y su perfil en el mismo lote.
    const batch = writeBatch(db)
    batch.delete(keyRef(db, hid, uid))
    batch.update(householdRef(db, hid), {
      members: arrayRemove(uid),
      [`roles.${uid}`]: deleteField(),
      [`memberEmails.${uid}`]: deleteField(),
    })
    batch.set(userRef(db, uid), { householdId: null }, { merge: true })
    await batch.commit()
    return
  }

  if (snap.exists()) {
    // Último miembro: primero los datos y su clave (las reglas comprueban que aún es miembro)
    // y luego el hogar.
    const [transactions, reports] = await Promise.all([getDocs(transactionsCol(db, hid)), getDocs(reportsCol(db, hid))])
    await commitInChunks(db, [
      ...[...transactions.docs, ...reports.docs].map((d) => (batch: WriteBatch) => batch.delete(d.ref)),
      (batch: WriteBatch) => batch.delete(keyRef(db, hid, uid)),
    ])
  }
  const batch = writeBatch(db)
  if (snap.exists()) batch.delete(householdRef(db, hid))
  batch.set(userRef(db, uid), { householdId: null }, { merge: true })
  await batch.commit()
}

/**
 * @function deleteUserProfile
 * @description Borra el perfil del usuario (paso previo a eliminar su cuenta).
 */
export async function deleteUserProfile(db: Firestore, uid: string): Promise<void> {
  const batch = writeBatch(db)
  batch.delete(userRef(db, uid))
  await batch.commit()
}
