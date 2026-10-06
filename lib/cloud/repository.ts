/**
 * @file lib/cloud/repository.ts
 * @description Acceso a Firestore: perfil de usuario, hogar compartido, invitaciones y
 *              sincronización de los datos de la app.
 *
 *              Modelo (ver `firestore.rules`):
 *                users/{uid}                          → perfil: hogar al que pertenece y email
 *                households/{hid}                     → miembros, configuración y versión del esquema
 *                households/{hid}/transactions/{id}   → una transacción por documento
 *                households/{hid}/reports/{id}        → un informe por documento (con sus transacciones)
 *                invites/{code}                       → código de invitación de un solo uso (48 h)
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
  type DocumentReference,
  type Firestore,
  type Unsubscribe,
  type WriteBatch,
} from "firebase/firestore"
import type { AppConfig, AppData, MonthlyReport, Transaction } from "@/types"
import { DATA_VERSION, defaultConfig, normalizeReport, normalizeTransaction } from "@/lib/storage"
import { diffAppData, isEmptyDiff, type AppDataDiff } from "@/lib/cloud/diff"

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

/** Firestore admite como mucho 500 operaciones por lote; se deja margen. */
const BATCH_LIMIT = 450

const userRef = (db: Firestore, uid: string) => doc(db, "users", uid)
const householdRef = (db: Firestore, hid: string) => doc(db, "households", hid)
const transactionsCol = (db: Firestore, hid: string) => collection(db, "households", hid, "transactions")
const reportsCol = (db: Firestore, hid: string) => collection(db, "households", hid, "reports")
const inviteRef = (db: Firestore, code: string) => doc(db, "invites", code)

type BatchOp = (batch: WriteBatch) => void

/**
 * @function commitInChunks
 * @description Ejecuta operaciones en lotes de como mucho `BATCH_LIMIT`, uno detrás de otro.
 *              Cada lote es atómico; un cambio normal (incluido un cierre de mes) cabe en uno.
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
// Datos del hogar
// ---------------------------------------------------------------------------

/**
 * @function subscribeHousehold
 * @description Escucha el hogar (documento + transacciones + informes) y entrega un `AppData`
 *              completo cuando han llegado los tres. Con la caché local, los cambios propios
 *              llegan al instante, aunque no haya conexión.
 * @param onLost - Se llama si el hogar deja de existir o ya no se tiene acceso.
 * @returns {Unsubscribe} Función para dejar de escuchar.
 */
export function subscribeHousehold(
  db: Firestore,
  hid: string,
  onData: (data: AppData, info: HouseholdInfo) => void,
  onLost: () => void,
  onError: (error: Error) => void,
): Unsubscribe {
  let household: { config: AppConfig; version: number; info: HouseholdInfo } | null = null
  let transactions: Transaction[] | null = null
  let reports: MonthlyReport[] | null = null

  const emit = () => {
    if (!household || !transactions || !reports) return
    onData(
      { transactions, reports, config: household.config, version: household.version },
      household.info,
    )
  }

  const handleError = (error: Error & { code?: string }) => {
    if (error.code === "permission-denied") onLost()
    else onError(error)
  }

  const unsubscribers = [
    onSnapshot(
      householdRef(db, hid),
      (snap) => {
        if (!snap.exists()) {
          onLost()
          return
        }
        const raw = snap.data()
        household = {
          config: { ...defaultConfig, ...(raw.config ?? {}) },
          version: typeof raw.version === "number" ? raw.version : DATA_VERSION,
          info: {
            members: raw.members ?? [],
            roles: raw.roles ?? {},
            memberEmails: raw.memberEmails ?? {},
          },
        }
        emit()
      },
      handleError,
    ),
    onSnapshot(
      transactionsCol(db, hid),
      (snap) => {
        transactions = snap.docs.map((d) => normalizeTransaction(d.data() as Transaction)).sort(byCreatedAtDesc)
        emit()
      },
      handleError,
    ),
    onSnapshot(
      reportsCol(db, hid),
      (snap) => {
        reports = snap.docs.map((d) => normalizeReport(d.data() as MonthlyReport)).sort(byCreatedAtDesc)
        emit()
      },
      handleError,
    ),
  ]

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
}

/**
 * @function diffToOps
 * @description Convierte una diferencia en operaciones de escritura sobre el hogar.
 */
function diffToOps(db: Firestore, hid: string, diff: AppDataDiff, next: AppData): BatchOp[] {
  const ops: BatchOp[] = []
  if (diff.householdChanged) {
    ops.push((batch) =>
      batch.update(householdRef(db, hid), { config: next.config, version: next.version ?? DATA_VERSION }),
    )
  }
  for (const t of diff.transactionsToSet) ops.push((batch) => batch.set(doc(transactionsCol(db, hid), t.id), t))
  for (const id of diff.transactionIdsToDelete) ops.push((batch) => batch.delete(doc(transactionsCol(db, hid), id)))
  for (const r of diff.reportsToSet) ops.push((batch) => batch.set(doc(reportsCol(db, hid), r.id), r))
  for (const id of diff.reportIdsToDelete) ops.push((batch) => batch.delete(doc(reportsCol(db, hid), id)))
  return ops
}

/**
 * @function writeChanges
 * @description Escribe en la nube la diferencia entre dos estados. La promesa se resuelve
 *              cuando el servidor confirma; sin conexión, el cambio ya está en la caché local
 *              y se envía al volver la red.
 */
export async function writeChanges(db: Firestore, hid: string, prev: AppData, next: AppData): Promise<void> {
  const diff = diffAppData(prev, next)
  if (isEmptyDiff(diff)) return
  await commitInChunks(db, diffToOps(db, hid, diff, next))
}

// ---------------------------------------------------------------------------
// Hogar e invitaciones
// ---------------------------------------------------------------------------

/**
 * @function createHousehold
 * @description Crea un hogar con el usuario como único miembro (Persona 1) y sube los datos
 *              iniciales (vacíos o los que había en este dispositivo).
 * @returns {Promise<string>} El id del hogar.
 */
export async function createHousehold(db: Firestore, uid: string, email: string, initial: AppData): Promise<string> {
  const ref = doc(collection(db, "households")) as DocumentReference
  const hid = ref.id

  // 1. El hogar y el perfil, juntos: el usuario no puede quedar apuntando a un hogar a medias.
  const batch = writeBatch(db)
  batch.set(ref, {
    members: [uid],
    roles: { [uid]: "person1" },
    memberEmails: { [uid]: email },
    config: initial.config,
    version: initial.version ?? DATA_VERSION,
    createdBy: uid,
    createdAt: new Date().toISOString(),
  })
  batch.set(userRef(db, uid), { householdId: hid }, { merge: true })
  await batch.commit()

  // 2. Los datos, en lotes (pueden ser cientos de transacciones).
  const empty: AppData = { transactions: [], reports: [], config: initial.config, version: initial.version }
  await writeChanges(db, hid, empty, initial)
  return hid
}

/** Letras y números sin los que se confunden (0/O, 1/I/L). */
const INVITE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

function generateInviteCode(): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => INVITE_ALPHABET[b % INVITE_ALPHABET.length]).join("")
}

/**
 * @function createInvite
 * @description Genera un código de invitación de un solo uso, válido 48 horas.
 */
export async function createInvite(db: Firestore, hid: string, uid: string): Promise<{ code: string; expiresAt: Date }> {
  const code = generateInviteCode()
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS)
  await setDoc(inviteRef(db, code), { householdId: hid, createdBy: uid, expiresAt: Timestamp.fromDate(expiresAt) })
  return { code, expiresAt }
}

/** Error con mensaje para mostrar tal cual al usuario. */
export class HouseholdError extends Error {
  name = "HouseholdError"
}

/**
 * @function joinHousehold
 * @description Une al usuario a un hogar con un código de invitación (pasa a ser la Persona 2).
 *              Las reglas solo permiten añadir el propio uid, a un hogar de un miembro y con
 *              una invitación válida de ese hogar.
 * @returns {Promise<string>} El id del hogar.
 */
export async function joinHousehold(db: Firestore, rawCode: string, uid: string, email: string): Promise<string> {
  const code = rawCode.trim().toUpperCase()
  const invite = await getDoc(inviteRef(db, code))
  if (!invite.exists()) throw new HouseholdError("El código no existe. Revisa que esté bien escrito.")

  const { householdId, expiresAt } = invite.data() as { householdId: string; expiresAt: Timestamp }
  if (expiresAt.toMillis() < Date.now()) throw new HouseholdError("El código ha caducado. Pide uno nuevo.")

  try {
    await updateDoc(householdRef(db, householdId), {
      members: arrayUnion(uid),
      [`roles.${uid}`]: "person2",
      [`memberEmails.${uid}`]: email,
      joinCode: code,
    })
  } catch (error) {
    if ((error as { code?: string }).code === "permission-denied") {
      throw new HouseholdError("No puedes unirte a este hogar: ya tiene dos miembros o el código no es válido.")
    }
    throw error
  }

  // Ya es miembro: apunta su perfil al hogar y gasta la invitación.
  const batch = writeBatch(db)
  batch.set(userRef(db, uid), { householdId }, { merge: true })
  batch.delete(inviteRef(db, code))
  await batch.commit()
  return householdId
}

/**
 * @function leaveHousehold
 * @description Saca al usuario del hogar. Si era el último miembro, borra el hogar y todos sus datos.
 */
export async function leaveHousehold(db: Firestore, hid: string, uid: string): Promise<void> {
  const snap = await getDoc(householdRef(db, hid))
  const members: string[] = snap.exists() ? (snap.data().members ?? []) : []

  if (members.length > 1) {
    // Queda el otro miembro: solo se sale este. Hogar y perfil en el mismo lote.
    const batch = writeBatch(db)
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
    // Último miembro: primero los datos (las reglas comprueban que aún es miembro) y luego el hogar.
    const [transactions, reports] = await Promise.all([getDocs(transactionsCol(db, hid)), getDocs(reportsCol(db, hid))])
    await commitInChunks(
      db,
      [...transactions.docs, ...reports.docs].map((d) => (batch: WriteBatch) => batch.delete(d.ref)),
    )
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
