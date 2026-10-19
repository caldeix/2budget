/**
 * @file components/events.tsx
 * @description Eventos (3.10.0): los gastos agrupados por etiqueta («Lisboa 2026»), con su total, sus
 *              fechas y lo que puso cada uno. La tarjeta del lateral enseña los más recientes y la
 *              ventana, todos. Al elegir uno, la lista de transacciones enseña solo lo de ese evento.
 */

"use client"

import { ChevronRight, Tag } from "lucide-react"
import type { TagEvent } from "@/lib/tags"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Modal } from "@/components/ui/modal"

/** Cuántos eventos se enseñan en la tarjeta (los más recientes). */
const CARD_LIMIT = 3

/** «3 – 7 de octubre de 2026», o una sola fecha si el evento es de un día. */
function eventDates(event: TagEvent): string {
  return event.from === event.to ? formatDate(event.from) : `${formatDate(event.from)} – ${formatDate(event.to)}`
}

function EventLine({
  event,
  person1Name,
  person2Name,
  showPeople,
  onSelect,
}: {
  event: TagEvent
  person1Name: string
  person2Name: string
  showPeople: boolean
  onSelect: (tag: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(event.tag)}
      className="w-full text-left rounded-xl bg-muted p-3 hover:bg-muted/70 transition-colors space-y-1"
    >
      <span className="flex items-baseline justify-between gap-3">
        <span className="font-medium text-foreground truncate">{event.tag}</span>
        <span className="font-semibold tabular-nums text-red-600 whitespace-nowrap">{formatCurrency(event.expenses)}</span>
      </span>
      <span className="block text-xs text-muted-foreground">
        {eventDates(event)} · {event.count} {event.count === 1 ? "movimiento" : "movimientos"}
      </span>
      {showPeople && (
        <span className="block text-xs text-muted-foreground tabular-nums">
          {person1Name} {formatCurrency(event.person1Expenses)} · {person2Name} {formatCurrency(event.person2Expenses)}
        </span>
      )}
    </button>
  )
}

interface EventsProps {
  events: TagEvent[]
  person1Name: string
  person2Name: string
  /** En pareja, cuánto puso cada uno (lo individual más su parte de lo compartido). */
  showPeople: boolean
  onSelect: (tag: string) => void
}

/**
 * @function EventsCard
 * @description Tarjeta del lateral con los eventos más recientes.
 */
export function EventsCard({ onOpenAll, ...props }: EventsProps & { onOpenAll: () => void }) {
  const { events } = props
  return (
    <div data-tour="events" className="bg-card rounded-2xl shadow-lg border p-6 space-y-4">
      <button type="button" onClick={onOpenAll} className="w-full flex items-center justify-between text-left">
        <span className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Tag className="h-5 w-5" />
          Eventos
        </span>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </button>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Pon la misma etiqueta a los gastos de un viaje o una ocasión («Lisboa 2026», «Navidad») y aquí verás cuánto
          costó en total.
        </p>
      ) : (
        <div className="space-y-2">
          {events.slice(0, CARD_LIMIT).map((event) => (
            <EventLine key={event.tag} event={event} {...props} />
          ))}
        </div>
      )}
      {events.length > CARD_LIMIT && (
        <button type="button" onClick={onOpenAll} className="text-xs text-muted-foreground hover:text-foreground">
          Ver los {events.length} eventos
        </button>
      )}
    </div>
  )
}

/**
 * @function EventsModal
 * @description Todos los eventos; al elegir uno se cierra y la lista enseña lo de ese evento.
 */
export function EventsModal({ isOpen, onClose, ...props }: EventsProps & { isOpen: boolean; onClose: () => void }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Eventos" size="md">
      <div className="p-6 space-y-3">
        {props.events.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay eventos. Al apuntar un gasto, escribe una etiqueta (por ejemplo, «Lisboa 2026») y ponla igual en
            todos los gastos de ese viaje.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">Elige uno para ver todos sus movimientos en la lista.</p>
            {props.events.map((event) => (
              <EventLine key={event.tag} event={event} {...props} />
            ))}
          </>
        )}
      </div>
    </Modal>
  )
}
