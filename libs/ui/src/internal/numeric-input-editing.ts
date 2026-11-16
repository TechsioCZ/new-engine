import { syncReactFormControl } from "./form-control-lifecycle"

// Compare acknowledgements/refusals numerically, preserving acknowledged draft
// text (including "1."). Unchanged accepted numbers refuse later different edits;
// only echoes of OTHER older numbers may wait behind newer typing. Refusals are
// projected in revision-guarded frames, and commit always restores parent authority.
export function createNumericInputEditing(parse = Number.parseFloat) {
  let revision = 0
  let nativeValue: string | undefined
  let nativeOwnsValue = false
  let parentValue: string | undefined
  let parentNumber: number | undefined
  let acceptedNumber: number | undefined
  const proposedNumbers = new Set<number | undefined>()
  const numberOf = (value: string | number | undefined) => {
    if (value === "") {
      return
    }
    const parsed = typeof value === "string" ? parse(value) : value
    return parsed === undefined || Number.isNaN(parsed) ? undefined : parsed
  }

  const editing = {
    edit(value: string) {
      revision += 1
      nativeOwnsValue = true
      nativeValue = value
      proposedNumbers.add(numberOf(value))
    },
    commit() {
      revision += 1
      nativeOwnsValue = false
      acceptedNumber = parentNumber
    },
    propose(value: string) {
      // A queued blur/change notification can belong to an older edit. Record
      // its numeric echo without ever replacing the current native draft text.
      if (nativeValue !== undefined) {
        proposedNumbers.add(numberOf(value))
      }
    },
    reset() {
      revision += 1
      nativeOwnsValue = false
      nativeValue = undefined
      acceptedNumber = parentNumber
      proposedNumbers.clear()
    },
    resolve(
      value: string | undefined,
      numericValue: string | number | undefined = value
    ) {
      const number = numberOf(numericValue)
      return value !== undefined &&
        nativeOwnsValue &&
        nativeValue !== undefined &&
        (number === numberOf(nativeValue) ||
          (number !== acceptedNumber && proposedNumbers.has(number)))
        ? nativeValue
        : value
    },
    reconcile(
      value: string | undefined,
      numericValue: string | number | undefined = value
    ) {
      const number = numberOf(numericValue)
      const previousValue = parentValue
      const previousNumber = parentNumber
      parentValue = value
      parentNumber = number
      if (value !== undefined && nativeOwnsValue) {
        if (number === numberOf(nativeValue)) {
          acceptedNumber = number
          return false
        }
        if (number === acceptedNumber || proposedNumbers.has(number)) {
          // Refusal is deferred, not written synchronously during a native edit.
          return false
        }
      } else if (value !== undefined && proposedNumbers.has(number)) {
        acceptedNumber = number
        if (value !== previousValue || number !== previousNumber) {
          revision += 1
          return true
        }
        return false
      } else if (value === previousValue && number === previousNumber) {
        return false
      }
      editing.reset()
      return true
    },
    get nativeOwnsValue() {
      return nativeOwnsValue
    },
    schedule(input: HTMLInputElement, write: () => void) {
      const version = revision
      const view = input.ownerDocument.defaultView
      const frame = view?.requestAnimationFrame(() => {
        if (input.isConnected && version === revision) {
          write()
        }
      })
      return () => {
        if (frame !== undefined) {
          view?.cancelAnimationFrame(frame)
        }
      }
    },
  }
  return editing
}

export type NumericInputEditing = ReturnType<typeof createNumericInputEditing>

export function syncNumericInputValue(input: HTMLInputElement, value: string) {
  const start = input.selectionStart
  const end = input.selectionEnd
  const direction = input.selectionDirection
  syncReactFormControl(input, value)
  if (
    input.ownerDocument.activeElement === input &&
    start !== null &&
    end !== null
  ) {
    input.setSelectionRange(
      Math.min(start, value.length),
      Math.min(end, value.length),
      direction ?? undefined
    )
  }
}
