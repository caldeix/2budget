/**
 * @file components/app-tour.tsx
 * @description Tour guiado de bienvenida. Resalta cada parte de la app con un borde dorado,
 *              oscurece el resto y muestra un tooltip con lo que hace, el paso ("3/14") y el
 *              botón "Siguiente" ("Finalizar" en el último). No se puede saltar ni cerrar, y
 *              mientras dura no se puede tocar la app (la capa de encima recoge los clics).
 *
 *              Cada paso apunta a un elemento con `data-tour="…"`. Si hay varios (p. ej. la fila
 *              de escritorio y la de móvil), se usa el primero visible; los pasos sin ningún
 *              elemento visible (p. ej. botones que en móvil van dentro del menú) se omiten.
 *
 *              Algunos pasos enseñan el interior de una ventana (el formulario de transacción, el
 *              cierre de mes): llevan `open` y el tour avisa a la página (`onOpenChange`) para que
 *              la abra o la cierre; sus elementos se buscan cuando la ventana ya está abierta.
 */

"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"

/** Ventana que debe estar abierta durante un paso. */
export type TourWindow = "transaction-form" | "close-month"

/** Un paso del tour. */
export interface TourStep {
  /** Valor del atributo `data-tour` del elemento a resaltar. */
  target: string
  title: string
  text: string
  /** Ventana que el tour abre para este paso (y cierra al pasar a uno que no la lleve). */
  open?: TourWindow
}

/** Margen del resaltado alrededor del elemento y separación del tooltip. */
const HIGHLIGHT_PADDING = 6
const TOOLTIP_GAP = 12
const VIEWPORT_MARGIN = 16
/** Cuánto se espera a que aparezca el elemento de un paso (p. ej. dentro de una ventana recién abierta). */
const FIND_TIMEOUT_MS = 2000

/** Primer elemento visible con ese `data-tour`. */
function findTarget(target: string): HTMLElement | null {
  const candidates = document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`)
  for (const el of candidates) {
    const rect = el.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) return el
  }
  return null
}

/** Si el elemento (o un antecesor) está fijo en la pantalla: desplazar la página no lo mueve. */
function isFixed(el: HTMLElement): boolean {
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    if (getComputedStyle(node).position === "fixed") return true
  }
  return false
}

/**
 * Lleva el elemento a la vista dejando sitio debajo para el tooltip: centra el bloque "elemento +
 * tooltip" (o, si no cabe, pone el elemento arriba). Desplaza el contenedor con scroll que lo
 * contenga (el cuerpo de una ventana, el carrusel del móvil) y, si no está en una ventana fija,
 * la página.
 */
function scrollIntoViewForTooltip(el: HTMLElement, tooltipHeight: number) {
  const vh = window.innerHeight
  const r = el.getBoundingClientRect()
  const total = r.height + TOOLTIP_GAP + tooltipHeight
  const desiredTop = total <= vh - 2 * VIEWPORT_MARGIN ? (vh - total) / 2 : VIEWPORT_MARGIN

  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowX, overflowY } = getComputedStyle(node)
    if ((overflowX === "auto" || overflowX === "scroll") && node.scrollWidth > node.clientWidth) {
      const box = node.getBoundingClientRect()
      node.scrollTo({ left: node.scrollLeft + r.left - box.left - (box.width - r.width) / 2, behavior: "smooth" })
    }
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) {
      const box = node.getBoundingClientRect()
      // Dentro de la caja: el elemento a la altura deseada respecto a la pantalla (o arriba del todo).
      node.scrollTo({ top: node.scrollTop + r.top - Math.max(box.top + VIEWPORT_MARGIN, desiredTop), behavior: "smooth" })
      return
    }
  }
  if (isFixed(el)) return
  window.scrollTo({ top: window.scrollY + r.top - desiredTop, behavior: "smooth" })
}

type Rect = { top: number; left: number; width: number; height: number }

const sameRect = (a: Rect | null, b: Rect) =>
  a !== null && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height

interface AppTourProps {
  steps: TourStep[]
  onFinish: () => void
  /** Se llama al cambiar de paso con la ventana que debe estar abierta (o `null`). */
  onOpenChange?: (open: TourWindow | null) => void
}

/**
 * @function AppTour
 * @description Muestra el tour con los pasos dados. Llama a `onFinish` al pulsar "Finalizar".
 */
export function AppTour({ steps, onFinish, onOpenChange }: AppTourProps) {
  // Los pasos se fijan al empezar, según lo que se ve en esta pantalla (móvil o PC). Los que van
  // dentro de una ventana no se pueden comprobar aún: se dan por buenos.
  const [activeSteps, setActiveSteps] = useState<TourStep[] | null>(null)
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const [tooltipSize, setTooltipSize] = useState({ width: 320, height: 160 })
  const tooltipRef = useRef<HTMLDivElement>(null)
  const nextButtonRef = useRef<HTMLButtonElement>(null)
  const tooltipHeightRef = useRef(160)
  tooltipHeightRef.current = tooltipSize.height

  useEffect(() => {
    setActiveSteps(steps.filter((step) => step.open !== undefined || findTarget(step.target) !== null))
  }, [steps])

  const step = activeSteps?.[index] ?? null
  const isLast = activeSteps !== null && index === activeSteps.length - 1

  // Abre o cierra la ventana que pide el paso.
  useEffect(() => {
    if (!step) return
    onOpenChange?.(step.open ?? null)
  }, [step, onOpenChange])

  // Espera al elemento (si está en una ventana que se acaba de abrir), lo lleva a la vista y sigue
  // su posición (desplazamientos, carrusel, cambios de tamaño).
  useEffect(() => {
    if (!step) return
    setRect(null)
    let cancelled = false
    let interval = 0

    const track = () => {
      const current = findTarget(step.target)
      if (!current) return
      const r = current.getBoundingClientRect()
      const next = { top: r.top, left: r.left, width: r.width, height: r.height }
      setRect((prev) => (sameRect(prev, next) ? prev : next))
    }

    const start = () => {
      track()
      window.addEventListener("scroll", track, { capture: true, passive: true })
      window.addEventListener("resize", track)
      // Por si algo se mueve sin evento (transiciones), cada poco tiempo.
      interval = window.setInterval(track, 150)
    }

    const waitFor = (since: number) => {
      if (cancelled) return
      const el = findTarget(step.target)
      if (el) {
        scrollIntoViewForTooltip(el, tooltipHeightRef.current)
        start()
      } else if (Date.now() - since < FIND_TIMEOUT_MS) {
        window.setTimeout(() => waitFor(since), 100)
      } else {
        start() // Sin elemento: el tooltip se muestra abajo, sin resaltado.
      }
    }
    waitFor(Date.now())

    return () => {
      cancelled = true
      window.removeEventListener("scroll", track, { capture: true })
      window.removeEventListener("resize", track)
      window.clearInterval(interval)
    }
  }, [step])

  // Tamaño real del tooltip, para colocarlo encima o debajo sin salirse de la pantalla.
  useLayoutEffect(() => {
    const el = tooltipRef.current
    if (!el) return
    const { offsetWidth: width, offsetHeight: height } = el
    setTooltipSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }))
  })

  // El foco va al botón de avanzar: Enter o espacio pasan al siguiente paso.
  useEffect(() => {
    nextButtonRef.current?.focus({ preventScroll: true })
  }, [index, activeSteps])

  const handleNext = useCallback(() => {
    if (!activeSteps) return
    if (index < activeSteps.length - 1) setIndex(index + 1)
    else {
      onOpenChange?.(null)
      onFinish()
    }
  }, [activeSteps, index, onFinish, onOpenChange])

  // Si no hay nada que enseñar (no debería pasar), el tour termina solo.
  useEffect(() => {
    if (activeSteps !== null && activeSteps.length === 0) onFinish()
  }, [activeSteps, onFinish])

  if (!step || typeof document === "undefined") return null

  const vw = window.innerWidth
  const vh = window.innerHeight
  const highlight = rect && {
    top: rect.top - HIGHLIGHT_PADDING,
    left: rect.left - HIGHLIGHT_PADDING,
    width: rect.width + HIGHLIGHT_PADDING * 2,
    height: rect.height + HIGHLIGHT_PADDING * 2,
  }

  // Debajo del elemento si cabe; si no, encima; si no, a un lado; y si tampoco (elemento muy
  // grande en pantalla pequeña), abajo del todo, encima del resaltado.
  const clampLeft = (left: number) => Math.min(Math.max(left, VIEWPORT_MARGIN), vw - tooltipSize.width - VIEWPORT_MARGIN)
  const clampTop = (top: number) => Math.min(Math.max(top, VIEWPORT_MARGIN), vh - tooltipSize.height - VIEWPORT_MARGIN)
  let tooltipTop = vh - tooltipSize.height - VIEWPORT_MARGIN
  let tooltipLeft = clampLeft(vw / 2 - tooltipSize.width / 2)
  if (highlight) {
    const below = highlight.top + highlight.height + TOOLTIP_GAP
    const above = highlight.top - TOOLTIP_GAP - tooltipSize.height
    const right = highlight.left + highlight.width + TOOLTIP_GAP
    const left = highlight.left - TOOLTIP_GAP - tooltipSize.width
    const centeredLeft = clampLeft(highlight.left + highlight.width / 2 - tooltipSize.width / 2)
    if (below + tooltipSize.height <= vh - VIEWPORT_MARGIN) {
      tooltipTop = below
      tooltipLeft = centeredLeft
    } else if (above >= VIEWPORT_MARGIN) {
      tooltipTop = above
      tooltipLeft = centeredLeft
    } else if (right + tooltipSize.width <= vw - VIEWPORT_MARGIN) {
      tooltipTop = clampTop(highlight.top)
      tooltipLeft = right
    } else if (left >= VIEWPORT_MARGIN) {
      tooltipTop = clampTop(highlight.top)
      tooltipLeft = left
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Tour de bienvenida">
      {/* Capa que recoge los clics: durante el tour no se puede usar la app. */}
      <div className="absolute inset-0" />

      {/* Resaltado dorado; su sombra enorme oscurece todo lo demás. */}
      {highlight && (
        <div
          aria-hidden
          className="absolute rounded-xl border-2 border-primary pointer-events-none transition-all duration-200"
          style={{ ...highlight, boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6), 0 0 16px hsl(var(--primary) / 0.6)" }}
        />
      )}

      <div
        ref={tooltipRef}
        className="absolute w-[min(320px,calc(100vw-32px))] rounded-2xl border border-primary bg-card p-4 shadow-xl transition-[top,left] duration-200"
        style={{ top: tooltipTop, left: tooltipLeft }}
        aria-live="polite"
      >
        <h3 className="font-semibold text-foreground">{step.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {index + 1}/{activeSteps?.length}
          </span>
          <Button ref={nextButtonRef} size="sm" onClick={handleNext}>
            {isLast ? "Finalizar" : "Siguiente"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
