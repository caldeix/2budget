"use client"

/**
 * @file components/ui/amount-input.tsx
 * @description Input de importes monetarios que IMPIDE teclear un tercer decimal.
 *
 *              Usa `type="text"` en vez de `type="number"` a propósito. Con `type="number"`,
 *              cuando el navegador considera la entrada inválida, `e.target.value` llega como
 *              cadena vacía y no se puede ni inspeccionar ni revertir lo que se escribió;
 *              además "1.005" es *válido* para el navegador (`step="0.01"` solo produce un
 *              `stepMismatch` en el submit) y el comportamiento de la coma decimal varía
 *              entre navegadores.
 *
 *              El rechazo va en `onChange` y no en `onKeyDown`/`onBeforeInput` porque
 *              `onChange` es el único embudo por el que pasan TODAS las vías de entrada:
 *              teclado, pegado, arrastrar-soltar, autocompletado, dictado e IME.
 *
 *              Contrapartida: se pierden las flechas del spinner nativo (y con ellas el bug
 *              de que la rueda del ratón cambie el importe sin querer).
 */

import * as React from "react"
import { Input } from "@/components/ui/input"
import { formatAmountForInput, isAmountDraft, parseAmountInput } from "@/lib/money"

interface AmountInputProps extends Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> {
  /** Importe en euros (ya redondeado a 2 decimales). */
  value: number
  /** Se dispara con el importe numérico cada vez que el borrador es válido. */
  onValueChange: (value: number) => void
  /** Si es `true`, un valor de 0 se muestra como campo vacío (mejor UX al crear). */
  emptyWhenZero?: boolean
}

/**
 * @function AmountInput
 * @description Campo de importe con validación de 2 decimales máximo.
 */
export const AmountInput = React.forwardRef<HTMLInputElement, AmountInputProps>(
  ({ value, onValueChange, emptyWhenZero = false, onBlur, onFocus, ...props }, ref) => {
    const [draft, setDraft] = React.useState(() => formatAmountForInput(value, { emptyWhenZero }))

    // Resincroniza si el valor cambia desde fuera (p. ej. al abrir el modal con otra transacción).
    React.useEffect(() => {
      setDraft((current) =>
        parseAmountInput(current) === value ? current : formatAmountForInput(value, { emptyWhenZero }),
      )
    }, [value, emptyWhenZero])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value

      if (!isAmountDraft(next)) {
        // RECHAZO. Si aquí solo hiciéramos `return`, el estado no cambiaría, React haría
        // bail-out y NO re-renderizaría, así que el carácter rechazado se quedaría pintado
        // en el DOM. Hay que revertir el valor a mano y recolocar el cursor.
        const el = e.target
        const delta = next.length - draft.length
        const caret = Math.max(0, (el.selectionStart ?? draft.length) - delta)
        el.value = draft
        el.setSelectionRange(caret, caret)
        return
      }

      setDraft(next)
      onValueChange(parseAmountInput(next))
    }

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Selecciona el contenido al entrar para que escribir lo reemplace en vez de
      // concatenarse. Sin esto, un campo con "0,00" obliga a borrarlo a mano antes
      // de teclear el importe.
      e.target.select()
      onFocus?.(e)
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Normaliza "12," -> "12,00" y "12.3" -> "12,30" al salir del campo.
      setDraft(formatAmountForInput(parseAmountInput(draft), { emptyWhenZero }))
      onBlur?.(e)
    }

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={draft}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    )
  },
)
AmountInput.displayName = "AmountInput"
