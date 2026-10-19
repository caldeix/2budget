/**
 * @file components/transaction-rows.tsx
 * @description Filas de la lista de transacciones (3.1.1: separadas de `transactions-table.tsx`,
 *              que pasaba de 950 líneas): la de PC (rejilla con todas las columnas) y la del móvil
 *              (tarjeta con acciones al deslizar o con el botón «Más acciones»). La tabla calcula lo
 *              que depende de sus filtros y de la búsqueda y se lo pasa en `RowContext`.
 */

"use client"

import type React from "react"
import type { Transaction } from "@/types"
import { formatCurrency, formatDate, cn } from "@/lib/utils"
import { isClosingAdjustment, isContribution, isPayable } from "@/lib/aggregations"
import { HIDDEN_AMOUNT } from "@/lib/privacy"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, CheckCircle2, Circle, MoreHorizontal, Tag as TagIcon } from "lucide-react"

/** Los ajustes de cierre los gestiona el informe: no se editan ni se borran a mano. */
const ADJUSTMENT_LOCKED_HINT = "Ajuste de cierre: se cambia con \"Actualizar mes\" o borrando el informe"

/** Texto de los botones de editar de una transacción con el importe oculto. */
const HIDDEN_EDIT_HINT = "Tu pareja ha ocultado el importe de sus transacciones individuales"

/** Color del punto y del importe: ingreso verde, aportación violeta, no computable gris, gasto rojo. */
const amountTone = (t: Transaction, tones: { income: string; contribution: string; nonComputable: string; expense: string }) =>
  t.type === "income"
    ? tones.income
    : isContribution(t)
      ? tones.contribution
      : t.nonComputable
        ? tones.nonComputable
        : tones.expense
const dotColor = (t: Transaction) =>
  amountTone(t, { income: "bg-green-600", contribution: "bg-primary", nonComputable: "bg-gray-500", expense: "bg-red-600" })
const amountColor = (t: Transaction) =>
  amountTone(t, { income: "text-green-600", contribution: "text-primary", nonComputable: "text-gray-500", expense: "text-red-600" })
/** Signo del importe: una aportación no suma ni resta (es un traspaso), lleva una flecha. */
const amountSign = (t: Transaction) => (t.type === "income" ? "+" : isContribution(t) ? "→ " : "-")

/** Textos del botón de pagado: una aportación se marca como "enviada". */
const paidTitle = (t: Transaction) =>
  isContribution(t)
    ? t.paid
      ? "Enviada — clic para marcar pendiente"
      : "Marcar como enviada"
    : t.paid
      ? "Pagado — clic para marcar pendiente"
      : "Marcar como pagado"
const paidLabel = (t: Transaction) =>
  isContribution(t) ? (t.paid ? "Enviada" : "Pendiente de enviar") : t.paid ? "Pagado" : "Pendiente"

/** Lo que la tabla sabe de cada fila (filtros, búsqueda en otros meses, privacidad) y sus acciones. */
export interface RowContext {
  singleMode?: boolean
  /** Columnas de la rejilla de PC (cambian en modo individual). */
  desktopGridCols: string
  /** La fila es de otro mes (al buscar en todos). */
  isOtherMonth: (t: Transaction) => boolean
  /** Mes cerrado: solo lectura. */
  isRowLocked: (t: Transaction) => boolean
  isAmountHidden: (t: Transaction) => boolean
  getOwnerDisplay: (t: Transaction) => string | null
  getCategoryBadge: (t: Transaction, showNonComputable?: boolean) => React.ReactNode
  onEdit: (transaction: Transaction) => void
  onDelete: (id: string) => void
  onTogglePaid: (id: string, paid: boolean) => void
  /** Al pulsar la etiqueta de una fila: ver todo ese evento (3.10.0). */
  onTagClick: (tag: string) => void
}

/** Etiqueta de evento de una fila: al pulsarla, filtra la lista por ese evento. */
function TagChip({ tag, onClick }: { tag: string; onClick: (tag: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onClick(tag)}
      className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2 py-0.5 text-xs font-medium text-secondary hover:bg-secondary/25 whitespace-nowrap"
      aria-label={`Ver todo lo de ${tag}`}
      title="Ver todo lo de este evento"
    >
      <TagIcon className="h-3 w-3" />
      {tag}
    </button>
  )
}

/**
 * @function TransactionRowDesktop
 * @description Fila de PC (diseño de tarjeta, visible solo en pantallas grandes).
 */
export function TransactionRowDesktop({
  transaction,
  index,
  ctx,
}: {
  transaction: Transaction
  index: number
  ctx: RowContext
}) {
  const { singleMode, desktopGridCols, isOtherMonth, isRowLocked, isAmountHidden, getOwnerDisplay, getCategoryBadge, onEdit, onDelete, onTogglePaid, onTagClick } = ctx
  return (
    <div data-tour={index === 0 ? "tx-row" : undefined} className={cn(
      "hidden sm:grid items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors",
      desktopGridCols,
      transaction.nonComputable && "opacity-70"
    )}>
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${dotColor(transaction)}`} />
        <div>
          <div
            className={cn(
              "text-sm font-medium",
              transaction.nonComputable ? "text-muted-foreground" : "text-foreground",
              isOtherMonth(transaction) && "text-primary",
            )}
            title={isOtherMonth(transaction) ? "De otro mes" : undefined}
          >
            {formatDate(transaction.date)}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("text-sm font-medium", transaction.nonComputable && "text-muted-foreground")}>
          {transaction.name}
        </span>
        {transaction.tag && <TagChip tag={transaction.tag} onClick={onTagClick} />}
        {/* Sin columna de propietario (modo individual), la etiqueta va junto al nombre si la hay. */}
        {singleMode && getOwnerDisplay(transaction) && (
          <span className="text-xs text-muted-foreground whitespace-pre-line">
            ({getOwnerDisplay(transaction)})
          </span>
        )}
      </div>
      <div>{getCategoryBadge(transaction, true)}</div>
      {!singleMode && (
        <div className={cn("text-sm", transaction.nonComputable ? "text-muted-foreground" : "text-foreground")}>
          {getOwnerDisplay(transaction)}
        </div>
      )}
      <div
        className={cn(
          "text-lg font-semibold text-right",
          amountColor(transaction),
          transaction.nonComputable && "italic"
        )}
      >
        {amountSign(transaction)}
        {isAmountHidden(transaction) ? HIDDEN_AMOUNT : formatCurrency(transaction.amount)}
      </div>
      {/* Mes cerrado: sin acciones. Ajuste de cierre: editar y borrar desactivados. */}
      <div className="flex items-center justify-end gap-1">
        {!isRowLocked(transaction) && isPayable(transaction) && (
          <Button
            size="sm"
            variant="ghost"
            data-tour="paid"
            onClick={() => onTogglePaid(transaction.id, !transaction.paid)}
            className={cn(
              "h-8 w-8 p-0",
              transaction.paid
                ? "text-green-600 hover:text-green-700 hover:bg-green-600/10"
                : "text-muted-foreground hover:text-foreground",
            )}
            title={paidTitle(transaction)}
          >
            {transaction.paid ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
            <span className="sr-only">{paidLabel(transaction)}</span>
          </Button>
        )}
        {!isRowLocked(transaction) && (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(transaction)}
              // Editar enseñaría el importe: no se puede con los ocultos por la pareja.
              disabled={isClosingAdjustment(transaction) || isAmountHidden(transaction)}
              title={
                isClosingAdjustment(transaction)
                  ? ADJUSTMENT_LOCKED_HINT
                  : isAmountHidden(transaction)
                    ? HIDDEN_EDIT_HINT
                    : "Editar"
              }
              aria-label={`Editar ${transaction.name}`}
              className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(transaction.id)}
              disabled={isClosingAdjustment(transaction)}
              title={isClosingAdjustment(transaction) ? ADJUSTMENT_LOCKED_HINT : "Eliminar"}
              aria-label={`Eliminar ${transaction.name}`}
              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * @function TransactionRowMobile
 * @description Fila del móvil (tarjeta; las acciones aparecen al deslizar a la izquierda o con
 *              el botón «Más acciones»).
 */
export function TransactionRowMobile({
  transaction,
  index,
  ctx,
  isActionsOpen,
  onToggleActions,
  onCloseActions,
  onTouchStart,
  onTouchEnd,
}: {
  transaction: Transaction
  index: number
  ctx: RowContext
  isActionsOpen: boolean
  onToggleActions: () => void
  onCloseActions: () => void
  onTouchStart: (e: React.TouchEvent) => void
  onTouchEnd: (e: React.TouchEvent) => void
}) {
  const { isOtherMonth, isRowLocked, isAmountHidden, getOwnerDisplay, getCategoryBadge, onEdit, onDelete, onTogglePaid, onTagClick } = ctx
  return (
    <div data-tour={index === 0 ? "tx-row" : undefined} className="sm:hidden">
      <div className="p-0 relative overflow-hidden">
        <div
          className={cn(
            "flex flex-col gap-2 p-4 transition-transform duration-300 ease-out",
            isActionsOpen ? "-translate-x-[120px]" : "translate-x-0", // Mueve la fila para revelar acciones.
          )}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${dotColor(transaction)}`} />
              <div>
                <span
                  className={cn(
                    "text-sm font-medium",
                    transaction.nonComputable ? "text-muted-foreground" : "text-foreground",
                    isOtherMonth(transaction) && "text-primary",
                  )}
                >
                  {formatDate(transaction.date)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span
                className={cn(
                  "text-lg font-semibold",
                  amountColor(transaction),
                  transaction.nonComputable && "italic"
                )}
              >
                {amountSign(transaction)}
                {isAmountHidden(transaction) ? HIDDEN_AMOUNT : formatCurrency(transaction.amount)}
              </span>
              {transaction.nonComputable && (
                <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                  NC
                </span>
              )}
              {!isRowLocked(transaction) && isPayable(transaction) && (
                <button
                  type="button"
                  data-tour="paid"
                  onClick={() => onTogglePaid(transaction.id, !transaction.paid)}
                  className={cn(
                    // Área táctil de 44 px (la recomendada en iOS) sin mover el icono.
                    "-my-3 -mr-3 -ml-1.5 p-3",
                    transaction.paid ? "text-green-600" : "text-muted-foreground",
                  )}
                  aria-label={paidLabel(transaction)}
                >
                  {transaction.paid ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span className={cn("font-medium", transaction.nonComputable ? "text-muted-foreground" : "text-foreground")}>
                {transaction.name}
              </span>
              {transaction.tag && <TagChip tag={transaction.tag} onClick={onTagClick} />}
            </div>
            {getOwnerDisplay(transaction) && (
              <span className={transaction.nonComputable ? "text-muted-foreground" : ""}>
                {getOwnerDisplay(transaction)}
              </span>
            )}
          </div>
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            {getCategoryBadge(transaction)}
            {/* Alternativa al gesto de deslizar (teclado, VoiceOver o quien no lo conozca). */}
            {!isRowLocked(transaction) && (
              <button
                type="button"
                onClick={() => onToggleActions()}
                aria-expanded={isActionsOpen}
                aria-label={`Más acciones para ${transaction.name}`}
                className="-my-3.5 -mr-3.5 p-3.5 text-muted-foreground hover:text-foreground"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        {/* Contenedor de acciones de swipe (oculto por defecto, visible con swipe) */}
        <div
          className={cn(
            "absolute inset-y-0 right-0 flex items-center gap-2 pr-4 transition-transform duration-300 ease-out",
            isActionsOpen ? "translate-x-0" : "translate-x-full", // Mueve las acciones.
          )}
          style={{ width: "120px" }} // Ancho fijo para las acciones.
          aria-hidden={!isActionsOpen} // Fuera de pantalla: ni se lee ni se tabula.
        >
          <Button
            size="sm"
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={isClosingAdjustment(transaction) || isAmountHidden(transaction)}
            tabIndex={isActionsOpen ? 0 : -1}
            onClick={() => {
              onEdit(transaction)
              onCloseActions() // Cierra el swipe después de la acción.
            }}
          >
            <Edit className="h-4 w-4" />
            <span className="sr-only">Editar {transaction.name}</span>
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="flex-1"
            disabled={isClosingAdjustment(transaction)}
            tabIndex={isActionsOpen ? 0 : -1}
            onClick={() => {
              onDelete(transaction.id)
              onCloseActions() // Cierra el swipe después de la acción.
            }}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Eliminar {transaction.name}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
