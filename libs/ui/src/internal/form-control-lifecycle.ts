/** Native fieldset inheritance, including every disabled ancestor and each
 * ancestor's first-legend exemption. Custom surfaces need the same result as
 * their hidden native input, not Zag's nearest-fieldset approximation. */
export function isEffectivelyDisabled(
  element: HTMLElement | null,
  disabled = false
): boolean {
  if (disabled || element?.matches(":disabled")) {
    return true
  }
  for (
    let ancestor = element?.parentElement;
    ancestor;
    ancestor = ancestor.parentElement
  ) {
    if (ancestor.tagName !== "FIELDSET" || !ancestor.hasAttribute("disabled")) {
      continue
    }
    const firstLegend = Array.from(ancestor.children).find(
      (child) => child.tagName === "LEGEND"
    )
    if (!firstLegend?.contains(element)) {
      return true
    }
  }
  return false
}

// One observer per document, shared by every custom control. This also catches
// reparenting and first-legend changes rather than only a disabled prop change.
const disabledObservers = new WeakMap<
  Document,
  { observer: MutationObserver; listeners: Set<() => void> }
>()
export function subscribeEffectiveDisabled(
  element: HTMLElement | null,
  onChange: () => void
): () => void {
  const doc = element?.ownerDocument
  const Observer = doc?.defaultView?.MutationObserver
  if (!(doc && Observer)) {
    return () => undefined
  }
  let store = disabledObservers.get(doc)
  if (!store) {
    const listeners = new Set<() => void>()
    const observer = new Observer(() => {
      for (const listener of listeners) {
        listener()
      }
    })
    observer.observe(doc.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["disabled"],
    })
    store = { observer, listeners }
    disabledObservers.set(doc, store)
  }
  store.listeners.add(onChange)
  return () => {
    store.listeners.delete(onChange)
    if (!store.listeners.size) {
      store.observer.disconnect()
      disabledObservers.delete(doc)
    }
  }
}

// Share ownership observation and a capture-phase reassociation checkpoint.
// The checkpoint covers form.reset() called immediately after a DOM mutation,
// before MutationObserver delivery. Each control still has just one owner listener.
const ownerObservers = new WeakMap<
  Document,
  {
    listeners: Set<() => void>
    observer: MutationObserver | undefined
    refresh: () => void
  }
>()

function subscribeFormOwnership(control: HTMLElement, update: () => void) {
  const doc = control.ownerDocument
  if (!doc) {
    return () => undefined
  }
  let store = ownerObservers.get(doc)
  if (!store) {
    const listeners = new Set<() => void>()
    const refresh = () => {
      for (const listener of listeners) {
        listener()
      }
    }
    const Observer = doc.defaultView?.MutationObserver
    const observer = Observer ? new Observer(refresh) : undefined
    observer?.observe(doc.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["form", "id"],
    })
    doc.addEventListener("reset", refresh, true)
    store = { listeners, observer, refresh }
    ownerObservers.set(doc, store)
  }
  store.listeners.add(update)
  return () => {
    store.listeners.delete(update)
    if (!store.listeners.size) {
      store.observer?.disconnect()
      doc.removeEventListener("reset", store.refresh, true)
      ownerObservers.delete(doc)
    }
  }
}

/** Restore through React's instance setter, not the native prototype setter.
 * Native reset bypasses React's value/checked tracker. Assign even when the DOM
 * already matches, so the next identical user edit still produces onChange.
 * This intentionally does not dispatch input/change events. */
export function syncReactFormControl(
  control: HTMLInputElement | HTMLTextAreaElement,
  value: string | boolean = control.value
): void {
  if (typeof value === "boolean" && "checked" in control) {
    control.checked = value
  } else if (typeof value === "string") {
    control.value = value
  }
}

type ResetOptions = {
  /** Suppress nested machine proposals until the entire reset has settled. */
  onResetStart?: () => void
  /** Also runs after cancellation, or disposal with pending reset work. */
  onResetEnd?: () => void
}

/** Follow the actual native owner, including external forms, ID changes and moves.
 * Wait a task for all native/React cancellation and the browser default action.
 * The caller owns initial state and must preserve controlled authority. */
export function subscribeOwnerFormReset(
  control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  onReset: () => void,
  options: ResetOptions = {}
): () => void {
  let owner: HTMLFormElement | null = null
  let active = true
  const pending = new Set<ReturnType<typeof setTimeout>>()
  const reset = (event: Event) => {
    // Check again in case another capture listener reassociated the control.
    const dispatchingOwner = owner
    if (!control.isConnected || control.form !== dispatchingOwner) {
      return
    }
    options.onResetStart?.()
    const timer = setTimeout(() => {
      pending.delete(timer)
      try {
        if (
          active &&
          !event.defaultPrevented &&
          control.isConnected &&
          control.form === dispatchingOwner
        ) {
          onReset()
        }
      } finally {
        if (active && !pending.size) {
          options.onResetEnd?.()
        }
      }
    }, 0)
    pending.add(timer)
  }
  const updateOwner = () => {
    if (owner === control.form) {
      return
    }
    owner?.removeEventListener("reset", reset, true)
    owner = control.form
    owner?.addEventListener("reset", reset, true)
  }
  updateOwner()
  const stopOwnership = subscribeFormOwnership(control, updateOwner)
  return () => {
    active = false
    stopOwnership()
    owner?.removeEventListener("reset", reset, true)
    for (const timer of pending) {
      clearTimeout(timer)
    }
    if (pending.size) {
      options.onResetEnd?.()
    }
    pending.clear()
  }
}
