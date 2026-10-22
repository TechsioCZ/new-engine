import { syncReactFormControl } from "./form-control-lifecycle"

// Each deferred projection belongs to the edit that scheduled it, not to the
// next native draft. Keep proposal history across blur so a late controlled
// acknowledgement of that commit cannot take ownership back from newer typing.
export function createNumericInputEditing() {
  let revision = 0
  let nativeValue: string | undefined
  let nativeOwnsValue = false
  let parentValue: string | undefined
  let ignoredParentValue: string | undefined
  const proposals = new Set<string>()

  const editing = {
    edit(value: string) {
      revision += 1
      nativeOwnsValue = true
      nativeValue = value
      proposals.add(value)
    },
    commit() {
      if (parentValue !== editing.resolve(parentValue)) {
        ignoredParentValue = parentValue
      }
      revision += 1
      nativeOwnsValue = false
    },
    propose(value: string) {
      if (nativeValue !== undefined) {
        nativeValue = value
        proposals.add(value)
      }
    },
    reset() {
      revision += 1
      nativeOwnsValue = false
      nativeValue = undefined
      ignoredParentValue = undefined
      proposals.clear()
    },
    resolve(value: string | undefined) {
      return value !== undefined &&
        nativeValue !== undefined &&
        proposals.has(value) &&
        (nativeOwnsValue || value === ignoredParentValue)
        ? nativeValue
        : value
    },
    reconcile(value: string | undefined) {
      if (parentValue === value) {
        return false
      }
      parentValue = value
      if (editing.resolve(value) !== value) {
        ignoredParentValue = value
      } else if (value === nativeValue) {
        ignoredParentValue = undefined
      } else {
        editing.reset()
        return true
      }
      return false
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
